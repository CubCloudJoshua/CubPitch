import { mkdirSync, writeFileSync } from 'node:fs';
import { describe, it } from 'vitest';
import { slideToPng } from '@cubpitch/export';
import { sampleDeck } from './fixtures/deck.js';

const run = process.env.CUBPITCH_SHOTS === '1' ? describe : describe.skip;

run('screenshots', () => {
  it('renders key slides', { timeout: 300_000 }, async () => {
    const dir = new URL('../.artifacts/shots/', import.meta.url).pathname;
    mkdirSync(dir, { recursive: true });
    const deck = sampleDeck();
    for (const id of ['s1', 's2', 's5', 's9', 's10', 's12']) {
      writeFileSync(`${dir}/${id}.png`, await slideToPng(deck, id, { width: 960, webFonts: false }));
    }
  });
});
