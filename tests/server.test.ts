import { spawn, type ChildProcess } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sampleDeck } from './fixtures/deck.js';

/**
 * The editor API, exercised against the real server process.
 *
 * Spawning it rather than importing the handlers is deliberate: the routing,
 * the JSON framing and the status codes are the contract the browser depends
 * on, and calling the handlers directly would skip all three.
 */

const PORT = 4137;
const base = `http://127.0.0.1:${PORT}`;

let server: ChildProcess;
let root: string;
const deck = { ...sampleDeck(), id: 'dck_test' };

async function waitForServer(timeoutMs = 20_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${base}/api/decks`);
      if (response.ok) return;
    } catch {
      // Not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error('Server did not start');
}

beforeAll(async () => {
  root = mkdtempSync(join(tmpdir(), 'cubpitch-server-'));
  mkdirSync(join(root, deck.id), { recursive: true });
  writeFileSync(join(root, deck.id, 'deck.json'), JSON.stringify(deck, null, 2));

  server = spawn('node', [join(process.cwd(), 'apps/web/dist-server/index.js')], {
    env: {
      ...process.env,
      PORT: String(PORT),
      CUBPITCH_HOME: root,
      CUBPITCH_STATIC: join(process.cwd(), 'apps/web/dist'),
    },
    stdio: 'ignore',
  });
  await waitForServer();
}, 40_000);

afterAll(() => {
  server?.kill();
  rmSync(root, { recursive: true, force: true });
});

describe('editor API', () => {
  it('lists decks', async () => {
    const decks = (await (await fetch(`${base}/api/decks`)).json()) as Array<{ id: string }>;
    expect(decks).toHaveLength(1);
    expect(decks[0]!.id).toBe('dck_test');
  });

  it('reviews a deck against its methodology', async () => {
    const review = (await (await fetch(`${base}/api/decks/dck_test/review`)).json()) as {
      methodology: { id: string };
      errors: number;
    };
    expect(review.methodology.id).toBe('house');
    expect(review.errors).toBe(0);
  });

  it('rejects a save that would clobber a concurrent edit', async () => {
    // The editor turns this into "someone else saved" rather than losing work.
    const current = (await (await fetch(`${base}/api/decks/dck_test`)).json()) as Record<string, unknown>;

    const first = await fetch(`${base}/api/decks/dck_test`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ deck: { ...current, title: 'Theirs' }, expectedUpdatedAt: current['updatedAt'] }),
    });
    expect(first.status).toBe(200);

    const second = await fetch(`${base}/api/decks/dck_test`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ deck: { ...current, title: 'Mine' }, expectedUpdatedAt: current['updatedAt'] }),
    });
    expect(second.status).toBe(409);

    const after = (await (await fetch(`${base}/api/decks/dck_test`)).json()) as { title: string };
    expect(after.title).toBe('Theirs');
  });

  it('rejects a malformed deck with 422 rather than storing it', async () => {
    const response = await fetch(`${base}/api/decks/dck_test`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ deck: { id: 'dck_test', slides: [{ type: 'nonsense' }] } }),
    });
    expect(response.status).toBe(422);
  });

  it('refuses a deck whose id does not match the URL', async () => {
    const current = (await (await fetch(`${base}/api/decks/dck_test`)).json()) as Record<string, unknown>;
    const response = await fetch(`${base}/api/decks/dck_test`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ deck: { ...current, id: 'dck_other' } }),
    });
    expect(response.status).toBe(400);
  });

  it('404s an unknown deck and an unknown route', async () => {
    expect((await fetch(`${base}/api/decks/dck_missing`)).status).toBe(404);
    expect((await fetch(`${base}/api/nope`)).status).toBe(404);
  });

  it('does not serve files outside the static directory', async () => {
    const body = await (await fetch(`${base}/../../../../etc/passwd`)).text();
    expect(body).not.toContain('root:x:');
  });

  it('creates a deck in the requested methodology', async () => {
    const response = await fetch(`${base}/api/decks`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ company: 'Testco', methodologyId: 'kawasaki' }),
    });
    expect(response.status).toBe(201);

    const created = (await response.json()) as { methodologyId: string; slides: unknown[] };
    expect(created.methodologyId).toBe('kawasaki');
    // Kawasaki says ten slides and means ten.
    expect(created.slides).toHaveLength(10);
  });

  it('requires a company to create a deck', async () => {
    const response = await fetch(`${base}/api/decks`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(response.status).toBe(400);
  });
});

describe('the API rejects ids that are paths', () => {
  /**
   * Both of these were verified as live exploits before the fix: the first
   * wrote a deck.json outside the store, and the second recursively deleted
   * any directory that contained one.
   */
  it('refuses a traversal on write', async () => {
    const response = await fetch(`${base}/api/decks/..%2Fescaped-write`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ deck: { ...deck, id: '../escaped-write' } }),
    });
    expect(response.status).toBe(400);
  });

  it('refuses a traversal on delete', async () => {
    expect((await fetch(`${base}/api/decks/..%2Fvictim`, { method: 'DELETE' })).status).toBe(400);
  });

  it('refuses a traversal on every id-bearing route', async () => {
    for (const path of ['', '/review', '/layout', '/versions', '/export.pdf', '/export.pptx']) {
      const response = await fetch(`${base}/api/decks/..%2Fescaped${path}`);
      expect(response.status, `GET /api/decks/../escaped${path}`).toBe(400);
    }
  });

  it('does not leak a filesystem path when the renderer is unavailable', async () => {
    // This route used to return the browser's path on disk to an
    // unauthenticated caller.
    const response = await fetch(`${base}/api/decks/dck_test/layout`);
    if (response.status === 503) {
      const body = (await response.json()) as { error: string };
      expect(body.error).not.toMatch(/\/(opt|usr|home|root)\//);
    }
  });
});
