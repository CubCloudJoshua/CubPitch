import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ConcurrentWriteError, DeckNotFoundError, FileDeckStore } from '@cubpitch/storage';
import { addSlide } from '@cubpitch/core';
import { sampleDeck } from './fixtures/deck.js';

describe('file deck store', () => {
  let root: string;
  let store: FileDeckStore;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'cubpitch-'));
    store = new FileDeckStore({ root });
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it('round-trips a deck through disk without losing anything', async () => {
    const deck = sampleDeck();
    await store.put(deck);
    const loaded = await store.get(deck.id);
    expect(loaded).not.toBeNull();
    // updatedAt is stamped on write, so compare everything else.
    expect({ ...loaded!, updatedAt: '' }).toEqual({ ...deck, updatedAt: '' });
  });

  it('returns null for a deck that does not exist rather than throwing', async () => {
    expect(await store.get('dck_nope')).toBeNull();
    expect(await store.list()).toEqual([]);
  });

  it('refuses a write that would clobber someone else edit', async () => {
    // Two people editing the deck the night before a raise is the normal case.
    const deck = sampleDeck();
    const first = await store.put(deck);

    // Someone else saves.
    await store.put({ ...first, title: 'Their edit' });

    await expect(store.put({ ...first, title: 'My edit' }, { expectedUpdatedAt: first.updatedAt })).rejects.toBeInstanceOf(
      ConcurrentWriteError,
    );
    expect((await store.get(deck.id))!.title).toBe('Their edit');
  });

  it('allows a write when nobody else has touched it', async () => {
    const deck = sampleDeck();
    const saved = await store.put(deck);
    const next = await store.put({ ...saved, title: 'Mine' }, { expectedUpdatedAt: saved.updatedAt });
    expect(next.title).toBe('Mine');
  });

  it('keeps the state being replaced as a version you can go back to', async () => {
    const deck = sampleDeck();
    const v1 = await store.put(deck, { note: 'first' });
    await store.put({ ...v1, title: 'Sent to Sequoia' }, { note: 'before rename' });

    const versions = await store.versions(deck.id);
    expect(versions).toHaveLength(1);
    expect(versions[0]!.note).toBe('before rename');

    const restored = await store.getVersion(deck.id, 1);
    expect(restored!.title).toBe(deck.title);
    expect((await store.get(deck.id))!.title).toBe('Sent to Sequoia');
  });

  it('summarises decks for the list without deserialising every slide', async () => {
    const deck = sampleDeck();
    await store.put(deck);
    await store.put({ ...sampleDeck(), id: 'dck_second', title: 'Second' });

    const list = await store.list();
    expect(list).toHaveLength(2);
    expect(list[0]!.slideCount).toBe(deck.slides.length);
    expect(list.map((entry) => entry.title)).toContain('Second');
  });

  it('deletes a deck and its versions', async () => {
    const deck = sampleDeck();
    await store.put(deck);
    await store.put({ ...deck, title: 'v2' });
    await store.delete(deck.id);

    expect(await store.get(deck.id)).toBeNull();
    expect(await store.versions(deck.id)).toEqual([]);
    await expect(store.delete(deck.id)).rejects.toBeInstanceOf(DeckNotFoundError);
  });

  it('prunes old versions rather than growing without bound', async () => {
    const small = new FileDeckStore({ root, keepVersions: 3 });
    let deck = sampleDeck();
    await small.put(deck);
    for (let i = 0; i < 6; i += 1) {
      deck = addSlide(deck, 'quote');
      deck = await small.put(deck, { note: `edit ${i}` });
    }
    expect((await small.versions(deck.id)).length).toBeLessThanOrEqual(3);
  });

  it('stores each deck as reviewable JSON on disk', async () => {
    // A deck committed to git and diffed in a pull request is the point of the
    // file store, so the on-disk form has to stay readable.
    const deck = sampleDeck();
    await store.put(deck);
    const { readFileSync } = await import('node:fs');
    const raw = readFileSync(join(root, deck.id, 'deck.json'), 'utf8');
    expect(raw).toContain('\n  "title": "CubCloud Seed 2026"');
    expect(JSON.parse(raw).slides).toHaveLength(deck.slides.length);
  });
});
