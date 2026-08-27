import type { Theme } from './tokens.js';
import { SLIDE_HEIGHT, SLIDE_WIDTH } from './tokens.js';

/**
 * Theme to CSS.
 *
 * The browser and the PDF renderer are the same engine, so there is one
 * stylesheet and the PDF is simply the browser printing it. Everything is
 * expressed against a fixed 1920x1080 artboard and scaled with a transform,
 * which is what keeps a slide identical at any preview size and at print size.
 */

/** CSS custom properties for a theme, without the wrapping selector. */
export function themeVariables(theme: Theme): string {
  const { colors, type, radius } = theme;
  return [
    `--cp-bg: ${colors.bg}`,
    `--cp-surface: ${colors.surface}`,
    `--cp-surface-alt: ${colors.surfaceAlt}`,
    `--cp-border: ${colors.border}`,
    `--cp-ink: ${colors.ink}`,
    `--cp-ink-muted: ${colors.inkMuted}`,
    `--cp-accent: ${colors.accent}`,
    `--cp-accent-bright: ${colors.accentBright}`,
    `--cp-accent-ink: ${colors.accentInk}`,
    `--cp-positive: ${colors.positive}`,
    `--cp-caution: ${colors.caution}`,
    `--cp-negative: ${colors.negative}`,
    ...colors.chart.map((color, index) => `--cp-chart-${index}: ${color}`),
    `--cp-font-display: ${theme.fonts.display}`,
    `--cp-font-body: ${theme.fonts.body}`,
    `--cp-font-mono: ${theme.fonts.mono}`,
    `--cp-hero: ${type.hero}px`,
    `--cp-title: ${type.title}px`,
    `--cp-display: ${type.display}px`,
    `--cp-lead: ${type.lead}px`,
    `--cp-body: ${type.body}px`,
    `--cp-small: ${type.small}px`,
    `--cp-label: ${type.label}px`,
    `--cp-stat: ${type.stat}px`,
    `--cp-line-height: ${type.lineHeight}`,
    `--cp-label-tracking: ${type.labelTracking}em`,
    `--cp-label-transform: ${type.labelUppercase ? 'uppercase' : 'none'}`,
    `--cp-pad: ${theme.pad}px`,
    `--cp-space: ${theme.space}px`,
    `--cp-radius-sm: ${radius.sm}px`,
    `--cp-radius-md: ${radius.md}px`,
    `--cp-radius-lg: ${radius.lg}px`,
    `--cp-text-shadow: ${theme.textShadow ? '0 1px 2px rgba(0,0,0,0.4)' : 'none'}`,
  ].join(';\n  ');
}

/** The Google Fonts stylesheet URL for a theme, or null if it needs none. */
export function fontHref(theme: Theme): string | null {
  if (theme.fonts.webFontFamilies.length === 0) return null;
  const families = theme.fonts.webFontFamilies.map((family) => `family=${family.replace(/ /g, '+')}`).join('&');
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}

/**
 * The slide stylesheet.
 *
 * Deliberately one string rather than a CSS module: it is injected into a
 * standalone HTML document for the PDF exporter, where there is no bundler.
 */
export function slideCss(theme: Theme): string {
  return `:root {
  ${themeVariables(theme)};
}

*, *::before, *::after { box-sizing: border-box; }

.cp-slide {
  position: relative;
  width: ${SLIDE_WIDTH}px;
  height: ${SLIDE_HEIGHT}px;
  overflow: hidden;
  background: var(--cp-bg);
  color: var(--cp-ink);
  font-family: var(--cp-font-body);
  font-size: var(--cp-body);
  line-height: var(--cp-line-height);
  text-shadow: var(--cp-text-shadow);
  padding: var(--cp-pad);
  display: flex;
  flex-direction: column;
}

.cp-label {
  font-family: var(--cp-font-mono);
  font-size: var(--cp-label);
  letter-spacing: var(--cp-label-tracking);
  text-transform: var(--cp-label-transform);
  color: var(--cp-ink-muted);
  margin: 0;
}

.cp-title {
  font-family: var(--cp-font-display);
  font-size: var(--cp-title);
  line-height: 1.05;
  margin: 0;
  color: var(--cp-ink);
}

.cp-hero {
  font-family: var(--cp-font-display);
  font-size: var(--cp-hero);
  line-height: 0.95;
  margin: 0;
}

.cp-display {
  font-family: var(--cp-font-display);
  font-size: var(--cp-display);
  line-height: 0.9;
  margin: 0;
}

.cp-lead {
  font-size: var(--cp-lead);
  color: var(--cp-ink-muted);
  margin: 0;
  max-width: 30ch;
}

.cp-body { font-size: var(--cp-body); margin: 0; }
.cp-small { font-size: var(--cp-small); color: var(--cp-ink-muted); margin: 0; }
.cp-accent { color: var(--cp-accent-bright); }
.cp-stat-value {
  font-family: var(--cp-font-display);
  font-size: var(--cp-stat);
  line-height: 1;
  color: var(--cp-accent-bright);
}

.cp-surface {
  background: var(--cp-surface);
  border: 1px solid var(--cp-border);
  border-radius: var(--cp-radius-md);
}

/* Row divider with the leading accent hairline. */
.cp-row {
  position: relative;
  border-top: 1px solid var(--cp-border);
  padding-top: calc(var(--cp-space) * 0.75);
  padding-bottom: calc(var(--cp-space) * 0.75);
}
.cp-row::before {
  content: '';
  position: absolute;
  top: -1px;
  left: 0;
  width: ${theme.hairline ? '48px' : '0'};
  height: 3px;
  background: var(--cp-accent);
}

.cp-header { margin-bottom: calc(var(--cp-space) * 1.5); }
.cp-content { flex: 1; min-height: 0; }
.cp-footer {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  font-family: var(--cp-font-mono);
  font-size: var(--cp-small);
  color: var(--cp-ink-muted);
  padding-top: var(--cp-space);
}

/* Print: one slide per page, at exactly slide size, no scaling. */
@page { size: ${SLIDE_WIDTH / 144}in ${SLIDE_HEIGHT / 144}in; margin: 0; }

@media print {
  html, body { margin: 0; padding: 0; background: var(--cp-bg); }
  .cp-slide { break-after: page; page-break-after: always; }
  .cp-slide:last-child { break-after: auto; page-break-after: auto; }
}
`;
}
