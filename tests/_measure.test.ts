import { writeFileSync } from 'node:fs';
import { describe, it } from 'vitest';
import { findOverflow } from '@cubpitch/export';
import { THEMES } from '@cubpitch/theme';
import { sampleDeck } from './fixtures/deck.js';

/** Layout tuning harness. Not a check; run it when changing the type scale. */
const run = process.env.CUBPITCH_MEASURE === '1' ? describe : describe.skip;

run('layout measurement', () => {
  it('reports overflow per theme', { timeout: 300_000 }, async () => {
    const lines: string[] = [];
    for (const theme of THEMES) {
      const findings = await findOverflow({ ...sampleDeck(), themeId: theme.id }, { webFonts: false });
      const worst = findings.reduce((max, f) => Math.max(max, f.overflowPx), 0);
      lines.push(`${theme.name}: ${findings.length}/12 overflow, worst +${worst}px`);
      for (const f of findings) lines.push(`    ${f.number}. +${f.overflowPx}px  ${f.title.slice(0, 50)}`);
    }
    writeFileSync(new URL('../.artifacts/overflow.txt', import.meta.url).pathname, lines.join('\n'));
  });
});
