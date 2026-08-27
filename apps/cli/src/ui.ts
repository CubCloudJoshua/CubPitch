/**
 * Terminal output.
 *
 * Colour is off automatically when stdout is not a TTY and opt-out via
 * NO_COLOR, so piping `cubpitch review` into a file or a CI log produces text
 * rather than escape codes.
 */

const ESC = '\u001b[';
const RESET = `${ESC}0m`;

const enabled = process.stdout.isTTY === true && !process.env['NO_COLOR'];

const wrap =
  (code: string) =>
  (text: string): string =>
    enabled ? `${ESC}${code}m${text}${RESET}` : text;

export const dim = wrap('2');
export const bold = wrap('1');
export const red = wrap('31');
export const yellow = wrap('33');
export const green = wrap('32');
export const cyan = wrap('36');
/** CubCloud's accent, as close as 256-colour gets to #F07D00. */
export const accent = wrap('38;5;208');

export function heading(text: string): string {
  return bold(text);
}

/** Left-aligned columns sized to their content. */
export function table(rows: string[][]): string {
  if (rows.length === 0) return '';
  const columns = Math.max(...rows.map((row) => row.length));
  const widths = Array.from({ length: columns }, (_, column) =>
    Math.max(...rows.map((row) => visibleLength(row[column] ?? ''))),
  );
  return rows
    .map((row) =>
      row
        .map((cell, column) => pad(cell ?? '', widths[column] ?? 0))
        .join('  ')
        .trimEnd(),
    )
    .join('\n');
}

/** Length ignoring colour codes, so padding lines up once colour is on. */
function visibleLength(text: string): number {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\u001b\[[0-9;]*m/g, '').length;
}

function pad(text: string, width: number): string {
  return text + ' '.repeat(Math.max(0, width - visibleLength(text)));
}
