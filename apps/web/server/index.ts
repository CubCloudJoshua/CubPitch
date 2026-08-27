import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { parseDeck, reviewDeck, starterDeck, type Deck } from '@cubpitch/core';
import { deckToPdf, deckToPptx, findOverflow } from '@cubpitch/export';
import { ConcurrentWriteError, DeckNotFoundError, FileDeckStore } from '@cubpitch/storage';

/**
 * The editor's API.
 *
 * Deliberately a plain node:http server. It has seven routes over a deck store
 * and two that shell out to the exporters, and a framework would be more code
 * than the thing it wraps. Nothing here holds deck state: the store is the
 * truth and every route reads it.
 */

const PORT = Number(process.env['PORT'] ?? 4100);
const ROOT = resolve(process.env['CUBPITCH_HOME'] ?? join(process.cwd(), 'decks'));
const STATIC_DIR = resolve(process.env['CUBPITCH_STATIC'] ?? join(import.meta.dirname, '..', 'dist'));

const store = new FileDeckStore({ root: ROOT });

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
    send(response, 503, { error: (error as Error).message });
  }
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
  createReadStream(file).pipe(response);
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

server.listen(PORT, () => {
  process.stdout.write(`CubPitch editor API on http://localhost:${PORT}\n  decks: ${ROOT}\n  static: ${STATIC_DIR}\n`);
});

export { server };
