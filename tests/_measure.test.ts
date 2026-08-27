import { mkdirSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { findOverflow } from '@cubpitch/export';
import { THEMES } from '@cubpitch/theme';
import { sampleDeck } from './fixtures/deck.js';

/**
 * Layout regression check.
 *
 * It reports per-theme overflow for tuning, and it also asserts, because a CI
 * step called "check the sample deck still fits its canvas" that can only pass
 * is not a check. The sample deck is deliberately dense: if a type-scale change
 * makes realistic prose overflow, this is where it surfaces.
 */
const run = process.env.CUBPITCH_MEASURE === '1' ? describe : describe.skip;

run('layout measurement', () => {
  it('reports overflow per theme', { timeout: 300_000 }, async () => {
    const lines: string[] = [];
    const offenders: string[] = [];
    for (const theme of THEMES) {
      const findings = await findOverflow({ ...sampleDeck(), themeId: theme.id }, { webFonts: false });
      const worst = findings.reduce((max, f) => Math.max(max, f.overflowPx), 0);
      lines.push(`${theme.name}: ${findings.length}/12 overflow, worst +${worst}px`);
      for (const f of findings) {
        lines.push(`    ${f.number}. +${f.overflowPx}px  ${f.title.slice(0, 50)}`);
        offenders.push(`${theme.id}:${f.number}`);
      }
    }
    const dir = new URL('../.artifacts/', import.meta.url).pathname;
    mkdirSync(dir, { recursive: true });
    writeFileSync(`${dir}/overflow.txt`, lines.join('\n'));

    expect(offenders, `content is clipped:\n${lines.join('\n')}`).toEqual([]);
  });
});
