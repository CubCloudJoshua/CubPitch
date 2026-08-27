import { writeFileSync } from 'node:fs';
import { describe, it } from 'vitest';
import { sampleDeck } from './fixtures/deck.js';

/** Regenerates the checked-in example deck. */
const run = process.env.CUBPITCH_EXAMPLE === '1' ? describe : describe.skip;

run('example deck', () => {
  it('writes examples/cubcloud-seed.json', () => {
    const deck = {
      ...sampleDeck(),
      id: 'dck_cubcloud_seed',
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
    };
    writeFileSync(new URL('../examples/cubcloud-seed.json', import.meta.url).pathname, `${JSON.stringify(deck, null, 2)}\n`);
  });
});
