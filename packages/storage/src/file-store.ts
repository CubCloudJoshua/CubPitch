import { parseDeck, slugify, type Deck } from '@cubpitch/core';
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import {
  ConcurrentWriteError,
  DeckNotFoundError,
  summarise,
  type DeckStore,
  type DeckSummary,
  type DeckVersion,
} from './store.js';

/**
 * Decks on disk.
 *
 * One JSON file per deck plus a versions directory, which means a deck can be
 * committed to git and reviewed in a pull request like any other artefact. That
 * is not a side effect: a pitch deck is a document a team argues about, and
 * "what changed since we sent it to Sequoia" is a question a diff answers
 * better than a version dropdown.
 *
 * Writes go through a temporary file and a rename so a crash mid-save leaves
 * the previous deck intact rather than a truncated one.
 */

const DECK_FILE = 'deck.json';
const VERSIONS_DIR = 'versions';

export interface FileStoreOptions {
  /** Directory decks live under. Created on first write. */
  root: string;
  /** Versions kept per deck. Older ones are pruned. */
  keepVersions?: number;
}

export class FileDeckStore implements DeckStore {
  private readonly root: string;
  private readonly keepVersions: number;

  constructor(options: FileStoreOptions) {
    this.root = options.root;
    this.keepVersions = options.keepVersions ?? 50;
  }

  private deckDir(id: string): string {
    return join(this.root, id);
  }

  async list(): Promise<DeckSummary[]> {
    let entries: string[];
    try {
      entries = await readdir(this.root);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    }

    const summaries: DeckSummary[] = [];
    for (const entry of entries) {
      const deck = await this.readDeckFile(join(this.root, entry, DECK_FILE));
      if (deck) summaries.push(summarise(deck));
    }
    return summaries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async get(id: string): Promise<Deck | null> {
    return this.readDeckFile(join(this.deckDir(id), DECK_FILE));
  }

  async put(deck: Deck, options: { expectedUpdatedAt?: string; note?: string } = {}): Promise<Deck> {
    const dir = this.deckDir(deck.id);
    const path = join(dir, DECK_FILE);

    if (options.expectedUpdatedAt !== undefined) {
      const current = await this.readDeckFile(path);
      if (current && current.updatedAt !== options.expectedUpdatedAt) {
        throw new ConcurrentWriteError(deck.id, options.expectedUpdatedAt, current.updatedAt);
      }
    }

    const previous = await this.readDeckFile(path);
    await mkdir(dir, { recursive: true });

    const saved: Deck = { ...deck, updatedAt: new Date().toISOString() };
    await writeAtomic(path, JSON.stringify(saved, null, 2));

    // The version written is the state being replaced, so a version is always
    // something you can go back to rather than the thing you just saved.
    if (previous) await this.writeVersion(dir, previous, options.note ?? '');
    return saved;
  }

  async delete(id: string): Promise<void> {
    const dir = this.deckDir(id);
    if (!(await exists(join(dir, DECK_FILE)))) throw new DeckNotFoundError(id);
    await rm(dir, { recursive: true, force: true });
  }

  async versions(id: string): Promise<DeckVersion[]> {
    const dir = join(this.deckDir(id), VERSIONS_DIR);
    let files: string[];
    try {
      files = await readdir(dir);
    } catch {
      return [];
    }

    const versions: DeckVersion[] = [];
    for (const file of files) {
      const match = file.match(/^(\d+)-(.*)\.json$/);
      if (!match) continue;
      const info = await stat(join(dir, file));
      versions.push({
        version: Number(match[1]),
        savedAt: info.mtime.toISOString(),
        note: (match[2] ?? '').replace(/-/g, ' ').trim(),
      });
    }
    return versions.sort((a, b) => b.version - a.version);
  }

  async getVersion(id: string, version: number): Promise<Deck | null> {
    const dir = join(this.deckDir(id), VERSIONS_DIR);
    let files: string[];
    try {
      files = await readdir(dir);
    } catch {
      return null;
    }
    const file = files.find((name) => name.startsWith(`${String(version).padStart(6, '0')}-`));
    return file ? this.readDeckFile(join(dir, file)) : null;
  }

  private async readDeckFile(path: string): Promise<Deck | null> {
    try {
      return parseDeck(JSON.parse(await readFile(path, 'utf8')));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
  }

  private async writeVersion(dir: string, deck: Deck, note: string): Promise<void> {
    const versionsDir = join(dir, VERSIONS_DIR);
    await mkdir(versionsDir, { recursive: true });

    const existing = await readdir(versionsDir).catch(() => [] as string[]);
    const numbers = existing.map((file) => Number(file.match(/^(\d+)-/)?.[1] ?? 0));
    const next = Math.max(0, ...numbers) + 1;

    const name = `${String(next).padStart(6, '0')}-${slugify(note || 'save')}.json`;
    await writeAtomic(join(versionsDir, name), JSON.stringify(deck, null, 2));

    const all = [...existing, name].sort();
    for (const stale of all.slice(0, Math.max(0, all.length - this.keepVersions))) {
      await rm(join(versionsDir, stale), { force: true });
    }
  }
}

/** Write via a temp file and rename, so a crash never truncates a saved deck. */
async function writeAtomic(path: string, contents: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temp = `${path}.${process.pid}.tmp`;
  await writeFile(temp, contents, 'utf8');
  await rename(temp, path);
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}
