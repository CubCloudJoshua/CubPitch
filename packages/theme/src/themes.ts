import { Theme } from './tokens.js';

/**
 * The theme registry.
 *
 * Four themes, each a complete position rather than a colour swap. CubCloud's
 * is the house brand and the default. "Slate" is the dark theme for founders
 * who are not CubCloud. "Paper" exists because a meaningful number of partners
 * still print the deck, and a pure-black slide costs a quarter of a toner
 * cartridge per page. "Ledger" is for the appendix-heavy financial deck where
 * the numbers are the design.
 */

/**
 * CubCloud house brand.
 *
 * Values come from the CubCloud widget design system: #080808 ground (not
 * #000000, which is harsh, and not #0a0a0a, which drifts grey), a single orange
 * accent, Bebas Neue display over IBM Plex. PowerPoint falls back to Arial
 * because Bebas Neue is not on a partner's laptop and a silent substitution
 * moves the layout.
 */
const cubcloud = Theme.parse({
  id: 'cubcloud',
  name: 'CubCloud',
  mode: 'dark',
  colors: {
    bg: '#080808',
    surface: '#111111',
    surfaceAlt: '#161616',
    border: '#262626',
    ink: '#F5F5F5',
    inkMuted: '#8A8A8A',
    accent: '#F07D00',
    accentBright: '#FF9120',
    accentInk: '#080808',
    chart: ['#F07D00', '#FF9120', '#8A8A8A', '#D4A017', '#27AE60', '#5B7C99'],
    positive: '#27AE60',
    caution: '#D4A017',
    negative: '#C0392B',
  },
  fonts: {
    display: "'Bebas Neue', 'Arial Narrow', sans-serif",
    body: "'IBM Plex Sans', system-ui, sans-serif",
    mono: "'IBM Plex Mono', ui-monospace, monospace",
    pptxDisplay: 'Arial',
    pptxBody: 'Arial',
    webFontFamilies: ['Bebas Neue', 'IBM Plex Sans:wght@400;600', 'IBM Plex Mono:wght@400;500'],
  },
  type: {
    hero: 156,
    title: 68,
    display: 196,
    lead: 34,
    body: 27,
    small: 20,
    label: 19,
    stat: 88,
    lineHeight: 1.3,
    labelTracking: 0.08,
    labelUppercase: true,
  },
  pad: 92,
  space: 24,
  radius: { sm: 4, md: 8, lg: 14 },
  hairline: true,
  textShadow: true,
});

/** A neutral dark theme for decks that are not CubCloud's. */
const slate = Theme.parse({
  id: 'slate',
  name: 'Slate',
  mode: 'dark',
  colors: {
    bg: '#0B1116',
    surface: '#141C23',
    surfaceAlt: '#1A242C',
    border: '#26333D',
    ink: '#F2F5F7',
    inkMuted: '#8FA3B0',
    accent: '#3D9BE9',
    accentBright: '#63B3F2',
    accentInk: '#08121A',
    chart: ['#3D9BE9', '#63B3F2', '#8FA3B0', '#E9A23D', '#3DBE8B', '#A87BE9'],
    positive: '#3DBE8B',
    caution: '#E9A23D',
    negative: '#E4635A',
  },
  fonts: {
    display: "'Inter', system-ui, sans-serif",
    body: "'Inter', system-ui, sans-serif",
    mono: "'JetBrains Mono', ui-monospace, monospace",
    pptxDisplay: 'Calibri',
    pptxBody: 'Calibri',
    webFontFamilies: ['Inter:wght@400;600;800', 'JetBrains Mono:wght@400;500'],
  },
  type: {
    hero: 120,
    title: 62,
    display: 170,
    lead: 33,
    body: 27,
    small: 20,
    label: 19,
    stat: 84,
    lineHeight: 1.35,
    labelTracking: 0.06,
    labelUppercase: true,
  },
  pad: 90,
  space: 24,
  radius: { sm: 6, md: 12, lg: 20 },
  hairline: false,
  textShadow: false,
});

/**
 * Light theme.
 *
 * Partners still print decks and forward them to people who print decks. A
 * dark deck prints as a solid block of toner and reads badly on a projector in
 * a lit conference room, so this is not a niche.
 */
const paper = Theme.parse({
  id: 'paper',
  name: 'Paper',
  mode: 'light',
  colors: {
    bg: '#FBFAF8',
    surface: '#F2F0EC',
    surfaceAlt: '#E9E6E0',
    border: '#D8D4CC',
    ink: '#16150F',
    inkMuted: '#6B675C',
    accent: '#C2410C',
    accentBright: '#EA580C',
    accentInk: '#FFFFFF',
    chart: ['#C2410C', '#EA580C', '#6B675C', '#15803D', '#1D4ED8', '#A16207'],
    positive: '#15803D',
    caution: '#A16207',
    negative: '#B91C1C',
  },
  fonts: {
    display: "'Fraunces', Georgia, serif",
    body: "'Source Sans 3', system-ui, sans-serif",
    mono: "'IBM Plex Mono', ui-monospace, monospace",
    pptxDisplay: 'Georgia',
    pptxBody: 'Calibri',
    webFontFamilies: ['Fraunces:opsz,wght@9..144,600', 'Source Sans 3:wght@400;600', 'IBM Plex Mono:wght@400'],
  },
  type: {
    hero: 116,
    title: 60,
    display: 162,
    lead: 33,
    body: 27,
    small: 20,
    label: 19,
    stat: 82,
    lineHeight: 1.4,
    labelTracking: 0.1,
    labelUppercase: true,
  },
  pad: 90,
  space: 24,
  radius: { sm: 2, md: 4, lg: 8 },
  hairline: true,
  textShadow: false,
});

/** Dense and typographic, for the financial deck where numbers are the design. */
const ledger = Theme.parse({
  id: 'ledger',
  name: 'Ledger',
  mode: 'light',
  colors: {
    bg: '#FFFFFF',
    surface: '#F6F7F9',
    surfaceAlt: '#EDEFF3',
    border: '#D5D9E0',
    ink: '#101418',
    inkMuted: '#5A626D',
    accent: '#0F4C81',
    accentBright: '#1668B0',
    accentInk: '#FFFFFF',
    chart: ['#0F4C81', '#1668B0', '#5A626D', '#0E7C66', '#8C6D1F', '#8A3A52'],
    positive: '#0E7C66',
    caution: '#8C6D1F',
    negative: '#A62A2A',
  },
  fonts: {
    display: "'IBM Plex Sans', system-ui, sans-serif",
    body: "'IBM Plex Sans', system-ui, sans-serif",
    mono: "'IBM Plex Mono', ui-monospace, monospace",
    pptxDisplay: 'Calibri',
    pptxBody: 'Calibri',
    webFontFamilies: ['IBM Plex Sans:wght@400;600;700', 'IBM Plex Mono:wght@400;500'],
  },
  type: {
    hero: 112,
    title: 56,
    display: 150,
    lead: 32,
    body: 28,
    small: 20,
    label: 19,
    stat: 84,
    lineHeight: 1.4,
    labelTracking: 0.05,
    labelUppercase: true,
  },
  pad: 86,
  space: 20,
  radius: { sm: 2, md: 4, lg: 6 },
  hairline: false,
  textShadow: false,
});

export const THEMES: Theme[] = [cubcloud, slate, paper, ledger];

export const DEFAULT_THEME_ID = cubcloud.id;

export function getTheme(id: string): Theme {
  return THEMES.find((theme) => theme.id === id) ?? cubcloud;
}

export function themeIds(): string[] {
  return THEMES.map((theme) => theme.id);
}
