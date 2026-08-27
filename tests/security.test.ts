import { mkdirSync, mkdtempSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isSafeId, parseDeck } from '@cubpitch/core';
import { isAllowedUrl } from '@cubpitch/export';
import { FileDeckStore } from '@cubpitch/storage';
import { sampleDeck } from './fixtures/deck.js';

/**
 * Regression tests for a security review.
 *
 * Two of these were verified as live exploits against a running server before
 * they were fixed: a deck id containing `..` wrote a file outside the deck
 * store, and a DELETE with the same shape recursively removed any directory
 * that happened to contain a deck.json. They are here so nobody reintroduces
 * the traversal by relaxing one of the three layers that now stop it.
 */

const TRAVERSAL_IDS = [
  '../escaped',
  '../../etc',
  '..',
  '/etc/passwd',
  'a/b',
  'a\\b',
  '.',
  'dck_../x',
  '',
  'x'.repeat(200),
];

describe('deck ids cannot be paths', () => {
  it('rejects every traversal shape and accepts real ids', () => {
    for (const id of TRAVERSAL_IDS) {
      expect(isSafeId(id), `${JSON.stringify(id)} should not be a legal id`).toBe(false);
    }
    for (const id of ['dck_a1b2c3', 'dck_cubcloud_seed', 'deck-1', 'A_b-9']) {
      expect(isSafeId(id), `${id} should be a legal id`).toBe(true);
    }
  });

  it('refuses to parse a deck whose id is a path', () => {
    const deck = sampleDeck();
    expect(() => parseDeck({ ...deck, id: '../escaped' })).toThrow();
    expect(() => parseDeck({ ...deck, id: 'dck_fine' })).not.toThrow();
  });

  it('will not write outside the deck store', async () => {
    // The original exploit: PUT /api/decks/..%2Fescaped-write created a
    // deck.json one directory above the store.
    const base = mkdtempSync(join(tmpdir(), 'cubpitch-sec-'));
    try {
      const root = join(base, 'decks');
      mkdirSync(root, { recursive: true });
      const store = new FileDeckStore({ root });

      for (const id of ['../escaped', '/tmp/escaped', 'a/b']) {
        await expect(store.put({ ...sampleDeck(), id })).rejects.toThrow();
      }
      expect(existsSync(join(base, 'escaped'))).toBe(false);
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });

  it('will not delete a directory outside the deck store', async () => {
    // The original exploit chained a plant with a delete and removed the whole
    // target tree, including files that had nothing to do with CubPitch.
    const base = mkdtempSync(join(tmpdir(), 'cubpitch-sec-'));
    try {
      const root = join(base, 'decks');
      const victim = join(base, 'victim');
      mkdirSync(root, { recursive: true });
      mkdirSync(victim, { recursive: true });
      writeFileSync(join(victim, 'deck.json'), JSON.stringify(sampleDeck()));
      writeFileSync(join(victim, 'important.txt'), 'do not delete me');

      const store = new FileDeckStore({ root });
      await expect(store.delete('../victim')).rejects.toThrow();

      expect(existsSync(join(victim, 'important.txt')), 'the victim directory was destroyed').toBe(true);
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });

  it('treats a hostile id as "no such deck" on the read paths', async () => {
    // Reads must not throw: a malformed id in a URL is a 404, not a 500.
    const root = mkdtempSync(join(tmpdir(), 'cubpitch-sec-'));
    try {
      const store = new FileDeckStore({ root });
      await expect(store.get('../escaped')).resolves.toBeNull();
      await expect(store.versions('../escaped')).resolves.toEqual([]);
      await expect(store.getVersion('../escaped', 1)).resolves.toBeNull();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('skips a directory in the deck store that is not a deck', async () => {
    const root = mkdtempSync(join(tmpdir(), 'cubpitch-sec-'));
    try {
      const store = new FileDeckStore({ root });
      await store.put(sampleDeck());
      mkdirSync(join(root, 'not a deck id'), { recursive: true });
      writeFileSync(join(root, 'not a deck id', 'deck.json'), JSON.stringify(sampleDeck()));

      await expect(store.list()).resolves.toHaveLength(1);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('the renderer fetches nothing by default', () => {
  /**
   * Every image URL in a deck becomes a request made by the *server* when
   * someone exports a PDF. A pasted deck carrying an internal address is a
   * server-side request forgery primitive, and a unique URL is a beacon saying
   * when the deck was opened.
   */
  it('blocks remote hosts unless remote media is opted into', () => {
    const closed = { allowFonts: true };
    expect(isAllowedUrl('http://10.0.0.5:8080/admin/reboot', closed)).toBe(false);
    expect(isAllowedUrl('https://attacker.example/beacon?deck=1', closed)).toBe(false);
    expect(isAllowedUrl('http://169.254.169.254/latest/meta-data/', closed)).toBe(false);

    const open = { allowFonts: true, allowRemoteMedia: true };
    expect(isAllowedUrl('https://cdn.example/logo.png', open)).toBe(true);
  });

  it('always allows embedded images, which is what a deck should use', () => {
    expect(isAllowedUrl('data:image/png;base64,iVBORw0KGgo=', {})).toBe(true);
    expect(isAllowedUrl('about:blank', {})).toBe(true);
  });

  it('never allows a scheme that reads the host disk', () => {
    for (const url of ['file:///etc/passwd', 'file://C:/Windows/win.ini']) {
      expect(isAllowedUrl(url, { allowRemoteMedia: true, allowFonts: true })).toBe(false);
    }
  });

  it('allows the theme fonts only when fonts are on', () => {
    expect(isAllowedUrl('https://fonts.googleapis.com/css2?family=X', { allowFonts: true })).toBe(true);
    expect(isAllowedUrl('https://fonts.gstatic.com/s/x.woff2', { allowFonts: true })).toBe(true);
    expect(isAllowedUrl('https://fonts.googleapis.com/css2?family=X', { allowFonts: false })).toBe(false);
  });
});

describe('deck media cannot carry an executable scheme', () => {
  it('refuses javascript:, file: and vbscript: image sources', () => {
    const deck = sampleDeck();
    for (const src of ['javascript:alert(1)', '  JavaScript:alert(1)', 'file:///etc/passwd', 'vbscript:msgbox']) {
      const withMedia = {
        ...deck,
        slides: [{ ...deck.slides[0]!, background: { src, alt: '', fit: 'cover' } }],
      };
      expect(() => parseDeck(withMedia), `${src} should be refused`).toThrow();
    }
  });

  it('accepts the sources a deck legitimately uses', () => {
    const deck = sampleDeck();
    for (const src of ['https://cdn.example/logo.png', 'data:image/png;base64,iVBORw0KGgo=', '']) {
      const withMedia = {
        ...deck,
        slides: [{ ...deck.slides[0]!, background: { src, alt: '', fit: 'cover' } }],
      };
      expect(() => parseDeck(withMedia), `${src} should be accepted`).not.toThrow();
    }
  });
});
