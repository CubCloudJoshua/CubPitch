import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { deckId, isSafeId, parseDeck, reviewDeck, starterDeck, type Deck } from '@cubpitch/core';
import { deckToPdf, deckToPptx, findOverflow } from '@cubpitch/export';
import { ConcurrentWriteError, DeckNotFoundError, FileDeckStore } from '@cubpitch/storage';
import { AnthropicProvider, critiqueDeck, draftDeck, ModelError, prepareQa, rewriteSlide } from '@cubpitch/ai';

/**
 * The editor's API.
 *
 * Deliberately a plain node:http server. It has seven routes over a deck store
 * and two that shell out to the exporters, and a framework would be more code
 * than the thing it wraps. Nothing here holds deck state: the store is the
 * truth and every route reads it.
 */

const PORT = Number(process.env['PORT'] ?? 4100);
/**
 * Loopback by default.
 *
 * There is no authentication on this API, which is a reasonable choice for a
 * tool one person runs on their own machine and a bad one the moment the port
 * is reachable from a network. Binding somewhere else has to be deliberate.
 */
const HOST = process.env['CUBPITCH_HOST'] ?? '127.0.0.1';
const ROOT = resolve(process.env['CUBPITCH_HOME'] ?? join(process.cwd(), 'decks'));
const STATIC_DIR = resolve(process.env['CUBPITCH_STATIC'] ?? join(import.meta.dirname, '..', 'dist'));

const store = new FileDeckStore({ root: ROOT });

/**
 * The model provider is built on first use, not at boot.
 *
 * Everything except three routes works without an API key, and a server that
 * refuses to start because one is missing would stop someone reviewing a deck
 * over something they were not trying to do.
 */
let cachedProvider: AnthropicProvider | null = null;
function modelProvider(): AnthropicProvider {
  cachedProvider ??= new AnthropicProvider();
  return cachedProvider;
}

/** Model failures are ordinary here: no key, rate limit, an unparseable answer. */
async function withModel(response: ServerResponse, run: () => Promise<unknown>): Promise<void> {
  try {
    send(response, 200, await run());
  } catch (error) {
    if (error instanceof ModelError) {
      // 503 when a retry could help, 502 when it could not. Either way the
      // editor shows the sentence rather than a stack trace.
      return send(response, error.retryable ? 503 : 502, { error: error.message, retryable: error.retryable });
    }
    throw error;
  }
}

type Handler = (
  request: IncomingMessage,
  response: ServerResponse,
  params: Record<string, string>,
) => Promise<void>;

interface Route {
  method: string;
  pattern: RegExp;
  keys: string[];
  handler: Handler;
}

const routes: Route[] = [];

function route(method: string, path: string, handler: Handler): void {
  const keys: string[] = [];
  const pattern = new RegExp(
    `^${path.replace(/:([a-zA-Z]+)/g, (_, key: string) => {
      keys.push(key);
      return '([^/]+)';
    })}$`,
  );
  routes.push({ method, pattern, keys, handler });
}

// --- Routes -----------------------------------------------------------------

route('GET', '/api/decks', async (_request, response) => {
  send(response, 200, await store.list());
});

route('POST', '/api/decks', async (request, response) => {
  const body = await readJson<{ company?: string; title?: string; methodologyId?: string; themeId?: string }>(request);
  if (!body.company) return send(response, 400, { error: 'company is required' });

  const deck = starterDeck({
    title: body.title ?? `${body.company} deck`,
    company: { name: body.company },
    ...(body.methodologyId ? { methodologyId: body.methodologyId } : {}),
    ...(body.themeId ? { themeId: body.themeId } : {}),
  });
  send(response, 201, await store.put(deck, { note: 'created' }));
});

route('GET', '/api/decks/:id', async (_request, response, params) => {
  const deck = await store.get(params['id']!);
  if (!deck) return send(response, 404, { error: 'No such deck' });
  send(response, 200, deck);
});

route('PUT', '/api/decks/:id', async (request, response, params) => {
  const body = await readJson<{ deck: unknown; expectedUpdatedAt?: string; note?: string }>(request);
  let deck: Deck;
  try {
    deck = parseDeck(body.deck);
  } catch (error) {
    return send(response, 422, { error: (error as Error).message });
  }
  if (deck.id !== params['id']) return send(response, 400, { error: 'Deck id does not match the URL' });

  try {
    send(response, 200, await store.put(deck, {
      ...(body.expectedUpdatedAt ? { expectedUpdatedAt: body.expectedUpdatedAt } : {}),
      ...(body.note ? { note: body.note } : {}),
    }));
  } catch (error) {
    // 409 rather than 500: the client can resolve this by reloading, and the
    // editor shows the author what happened instead of a stack trace.
    if (error instanceof ConcurrentWriteError) return send(response, 409, { error: error.message });
    throw error;
  }
});

route('POST', '/api/decks/:id/duplicate', async (_request, response, params) => {
  const source = await store.get(params['id']!);
  if (!source) return send(response, 404, { error: 'No such deck' });

  // A copy is a new document: fresh id, its own history, a title that says so.
  const now = new Date().toISOString();
  const copy: Deck = {
    ...source,
    id: deckId(),
    title: `${source.title} copy`,
    createdAt: now,
    updatedAt: now,
  };
  send(response, 201, await store.put(copy, { note: `copied from ${source.id}` }));
});

route('DELETE', '/api/decks/:id', async (_request, response, params) => {
  try {
    await store.delete(params['id']!);
    send(response, 204, null);
  } catch (error) {
    if (error instanceof DeckNotFoundError) return send(response, 404, { error: error.message });
    throw error;
  }
});

route('GET', '/api/decks/:id/versions', async (_request, response, params) => {
  send(response, 200, await store.versions(params['id']!));
});

route('GET', '/api/decks/:id/review', async (_request, response, params) => {
  const deck = await store.get(params['id']!);
  if (!deck) return send(response, 404, { error: 'No such deck' });
  send(response, 200, reviewDeck(deck));
});

/**
 * Layout measurement is a separate route from review because it costs a browser
 * launch. The editor asks for it on demand, not on every keystroke.
 */
route('GET', '/api/decks/:id/layout', async (_request, response, params) => {
  const deck = await store.get(params['id']!);
  if (!deck) return send(response, 404, { error: 'No such deck' });
  try {
    send(response, 200, await findOverflow(deck, { webFonts: false }));
  } catch (error) {
    // The underlying message names the browser's path on disk. Log it, do not
    // hand it to an unauthenticated caller.
    process.stderr.write(`layout measurement failed: ${(error as Error).message}\n`);
    send(response, 503, { error: 'Could not measure the layout. The PDF renderer is not available.' });
  }
});

route('POST', '/api/ai/draft', async (request, response) => {
  const body = await readJson<{ brief?: string; company?: string; methodologyId?: string; themeId?: string; guidance?: string }>(
    request,
  );
  if (!body.brief || !body.company) return send(response, 400, { error: 'brief and company are required' });

  await withModel(response, async () => {
    const result = await draftDeck(modelProvider(), {
      brief: body.brief!,
      company: body.company!,
      ...(body.methodologyId ? { methodologyId: body.methodologyId } : {}),
      ...(body.themeId ? { themeId: body.themeId } : {}),
      ...(body.guidance ? { guidance: body.guidance } : {}),
    });
    const saved = await store.put(result.deck, { note: 'drafted' });
    return { deck: saved, assumptions: result.assumptions, missing: result.missing };
  });
});

route('POST', '/api/decks/:id/critique', async (request, response, params) => {
  const deck = await store.get(params['id']!);
  if (!deck) return send(response, 404, { error: 'No such deck' });
  const body = await readJson<{ audience?: string }>(request).catch(() => ({}) as { audience?: string });
  await withModel(response, () => critiqueDeck(modelProvider(), { deck, ...(body.audience ? { audience: body.audience } : {}) }));
});

route('POST', '/api/decks/:id/qa', async (request, response, params) => {
  const deck = await store.get(params['id']!);
  if (!deck) return send(response, 404, { error: 'No such deck' });
  const body = await readJson<{ audience?: string }>(request).catch(() => ({}) as { audience?: string });
  await withModel(response, () => prepareQa(modelProvider(), { deck, ...(body.audience ? { audience: body.audience } : {}) }));
});

route('POST', '/api/decks/:id/slides/:slideId/rewrite', async (request, response, params) => {
  const deck = await store.get(params['id']!);
  if (!deck) return send(response, 404, { error: 'No such deck' });

  const body = await readJson<{ instruction?: string; expectedUpdatedAt?: string }>(request).catch(
    () => ({}) as { instruction?: string; expectedUpdatedAt?: string },
  );

  await withModel(response, async () => {
    const result = await rewriteSlide(modelProvider(), {
      deck,
      slideId: params['slideId']!,
      ...(body.instruction ? { instruction: body.instruction } : {}),
    });
    // The rewrite is returned rather than saved. The author decides whether to
    // keep it, and saving here would overwrite edits made while it ran.
    return { slide: result.slide, rationale: result.rationale, needed: result.needed, ignored: result.ignored };
  });
});

route('GET', '/api/decks/:id/export.pdf', async (_request, response, params) => {
  const deck = await store.get(params['id']!);
  if (!deck) return send(response, 404, { error: 'No such deck' });
  const pdf = await deckToPdf(deck);
  response.writeHead(200, {
    'content-type': 'application/pdf',
    'content-disposition': `attachment; filename="${deck.id}.pdf"`,
  });
  response.end(pdf);
});

route('GET', '/api/decks/:id/export.pptx', async (_request, response, params) => {
  const deck = await store.get(params['id']!);
  if (!deck) return send(response, 404, { error: 'No such deck' });
  const pptx = await deckToPptx(deck);
  response.writeHead(200, {
    'content-type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'content-disposition': `attachment; filename="${deck.id}.pptx"`,
  });
  response.end(pptx);
});

// --- Plumbing ---------------------------------------------------------------

const server = createServer((request, response) => {
  void handle(request, response).catch((error: unknown) => {
    process.stderr.write(`${request.method} ${request.url} failed: ${(error as Error).stack}\n`);
    if (!response.headersSent) send(response, 500, { error: 'Internal error' });
  });
});

async function handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);

  for (const entry of routes) {
    if (entry.method !== request.method) continue;
    const match = entry.pattern.exec(url.pathname);
    if (!match) continue;

    const params = Object.fromEntries(entry.keys.map((key, index) => [key, decodeURIComponent(match[index + 1] ?? '')]));

    // Ids from the URL reach a filesystem path. They are checked here, in the
    // store, and by the schema, because a `..` in a deck id was an arbitrary
    // file write and a recursive delete of any directory the process could
    // reach. One layer would probably hold; three is what this is worth.
    for (const key of ['id', 'slideId']) {
      const value = params[key];
      if (value !== undefined && !isSafeId(value)) {
        return send(response, 400, { error: `Malformed ${key}` });
      }
    }

    return entry.handler(request, response, params);
  }

  if (url.pathname.startsWith('/api/')) return send(response, 404, { error: 'No such route' });
  return serveStatic(url.pathname, response);
}

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};

function serveStatic(pathname: string, response: ServerResponse): void {
  // normalize before joining: without it, a request for /../../etc/passwd
  // escapes the static directory.
  const relative = normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  const candidate = join(STATIC_DIR, relative);

  if (!candidate.startsWith(STATIC_DIR)) return void send(response, 403, { error: 'Forbidden' });

  const file = existsSync(candidate) && statSync(candidate).isFile() ? candidate : join(STATIC_DIR, 'index.html');
  if (!existsSync(file)) {
    return void send(response, 404, { error: 'The editor has not been built. Run: pnpm --filter @cubpitch/web build' });
  }

  response.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });

  // A file removed between the stat above and this read would otherwise emit an
  // unhandled 'error' and take the process down.
  const stream = createReadStream(file);
  stream.on('error', () => response.destroy());
  stream.pipe(response);
}

async function readJson<T>(request: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    size += (chunk as Buffer).length;
    // A deck with embedded images is large; a request that is not a deck at
    // all should not be allowed to grow without bound.
    if (size > 32 * 1024 * 1024) throw new Error('Request body too large');
    chunks.push(chunk as Buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as T;
}

function send(response: ServerResponse, status: number, body: unknown): void {
  if (body === null) {
    response.writeHead(status);
    response.end();
    return;
  }
  const payload = JSON.stringify(body);
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  response.end(payload);
}

server.listen(PORT, HOST, () => {
  process.stdout.write(
    `CubPitch editor API on http://${HOST}:${PORT}\n  decks: ${ROOT}\n  static: ${STATIC_DIR}\n` +
      (HOST === '127.0.0.1'
        ? ''
        : '  WARNING: bound beyond loopback and this API has no authentication.\n'),
  );
});

export { server };
