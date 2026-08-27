/**
 * Inline markup.
 *
 * `**bold**` and `*italic*` are the only two markers the deck model supports.
 * Both the HTML renderer and the PowerPoint exporter parse to this same run
 * list, which is why a bolded phrase survives the trip into PowerPoint as a
 * bolded run rather than as literal asterisks.
 */

export interface TextRun {
  text: string;
  bold: boolean;
  italic: boolean;
}

const TOKEN = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;

export function parseInline(input: string): TextRun[] {
  if (!input) return [];
  const runs: TextRun[] = [];
  let cursor = 0;

  for (const match of input.matchAll(TOKEN)) {
    const index = match.index ?? 0;
    if (index > cursor) {
      runs.push({ text: input.slice(cursor, index), bold: false, italic: false });
    }
    const token = match[0];
    if (token.startsWith('**')) {
      runs.push({ text: token.slice(2, -2), bold: true, italic: false });
    } else {
      runs.push({ text: token.slice(1, -1), bold: false, italic: true });
    }
    cursor = index + token.length;
  }

  if (cursor < input.length) {
    runs.push({ text: input.slice(cursor), bold: false, italic: false });
  }
  return runs;
}

/** Markup stripped, for slide rails, filenames, and accessibility labels. */
export function plainText(input: string): string {
  return parseInline(input)
    .map((run) => run.text)
    .join('');
}
