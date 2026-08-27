import { describe, expect, it } from 'vitest';
import { parseArgs, flagBool, flagString } from '../apps/cli/src/args.js';
import { exportBasename } from '../apps/cli/src/index.js';
import { sampleDeck } from './fixtures/deck.js';

describe('argument parsing', () => {
  it('handles both --flag value and --flag=value', () => {
    const args = parseArgs(['export', 'dck_1', '--out', './build', '--theme=paper']);
    expect(args.command).toBe('export');
    expect(args.positional).toEqual(['dck_1']);
    expect(flagString(args, 'out', '')).toBe('./build');
    expect(flagString(args, 'theme', '')).toBe('paper');
  });

  it('treats a trailing flag as a boolean rather than eating the next command', () => {
    const args = parseArgs(['review', 'dck_1', '--strict', '--layout']);
    expect(flagBool(args, 'strict')).toBe(true);
    expect(flagBool(args, 'layout')).toBe(true);
    expect(args.positional).toEqual(['dck_1']);
  });

  it('defaults to help with no arguments', () => {
    expect(parseArgs([]).command).toBe('help');
  });
});

describe('export filenames', () => {
  it('does not repeat the company name', () => {
    // This lands in an investor's downloads folder next to forty other decks.
    expect(exportBasename(sampleDeck())).toBe('cubcloud-seed-2026');
  });

  it('prefixes the company when the title does not carry it', () => {
    const deck = { ...sampleDeck(), title: 'Series A' };
    expect(exportBasename(deck)).toBe('cubcloud-series-a');
  });
});
