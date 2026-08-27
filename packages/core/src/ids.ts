/**
 * Identifiers.
 *
 * Slide and deck ids are short and readable on purpose: they show up in URLs,
 * export filenames, and in the diff when a deck is committed to git. A UUID
 * would be opaque in all three places.
 */

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';

function randomSuffix(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = '';
  for (const byte of bytes) {
    // Modulo bias over a 36-char alphabet is ~1.5% on the last few symbols.
    // These ids are collision-avoidance handles, not security tokens.
    out += ALPHABET[byte % ALPHABET.length];
  }
  return out;
}

export function deckId(): string {
  return `dck_${randomSuffix(12)}`;
}

export function slideId(): string {
  return `sld_${randomSuffix(10)}`;
}

/**
 * A filesystem- and URL-safe handle derived from a human title.
 * Used for export filenames and file-store keys.
 */
export function slugify(input: string): string {
  const slug = input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return slug.length > 0 ? slug : 'untitled';
}
