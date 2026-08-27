import { parseInline } from '@cubpitch/core';
import type { Theme } from '@cubpitch/theme';
import type { CSSProperties, ReactNode } from 'react';

/**
 * Slide primitives.
 *
 * Everything a slide draws comes from here, so that a change to how a label or
 * a row divider looks lands on all twenty-six slide types at once. Components
 * read the theme through CSS custom properties rather than props: the same
 * markup then serialises to a standalone HTML file for the PDF exporter with
 * no React runtime and no bundler involved.
 */

/** `**bold**` and `*italic*` rendered as real elements. */
export function Inline({ text }: { text: string }): ReactNode {
  const runs = parseInline(text);
  return (
    <>
      {runs.map((run, index) => {
        if (run.bold) return <strong key={index}>{run.text}</strong>;
        if (run.italic) return <em key={index}>{run.text}</em>;
        return <span key={index}>{run.text}</span>;
      })}
    </>
  );
}

export function Label({ children, style }: { children: ReactNode; style?: CSSProperties }): ReactNode {
  return (
    <p className="cp-label" style={style}>
      {children}
    </p>
  );
}

export function SlideTitle({ children }: { children: ReactNode }): ReactNode {
  return <h1 className="cp-title">{children}</h1>;
}

export function Lead({ text, style }: { text: string; style?: CSSProperties }): ReactNode {
  if (!text) return null;
  return (
    <p className="cp-lead" style={style}>
      <Inline text={text} />
    </p>
  );
}

export function Header({ eyebrow, title, lead }: { eyebrow?: string; title: string; lead?: string }): ReactNode {
  return (
    <div className="cp-header">
      {eyebrow ? <Label style={{ marginBottom: 12 }}>{eyebrow}</Label> : null}
      <SlideTitle>
        <Inline text={title} />
      </SlideTitle>
      {lead ? <Lead text={lead} style={{ marginTop: 20 }} /> : null}
    </div>
  );
}

/** A list row with the leading accent hairline. */
export function Row({ children, style }: { children: ReactNode; style?: CSSProperties }): ReactNode {
  return (
    <div className="cp-row" style={style}>
      {children}
    </div>
  );
}

export function Stat({
  value,
  label,
  note,
  align = 'left',
  scale = 1,
}: {
  value: string;
  label: string;
  note?: string;
  align?: 'left' | 'center';
  /** A stat nested inside a panel should not carry the weight of one that
   *  owns the slide. */
  scale?: number;
}): ReactNode {
  return (
    <div style={{ textAlign: align }}>
      <div className="cp-stat-value" style={scale === 1 ? undefined : { fontSize: `calc(var(--cp-stat) * ${scale})` }}>
        {value}
      </div>
      <p className="cp-label" style={{ marginTop: 8 }}>
        {label}
      </p>
      {note ? (
        <p className="cp-small" style={{ marginTop: 6 }}>
          <Inline text={note} />
        </p>
      ) : null}
    </div>
  );
}

/** Evenly distributed columns, the workhorse layout for pillars and stats. */
export function Columns({
  count,
  gap = 40,
  children,
  style,
}: {
  count: number;
  gap?: number;
  children: ReactNode;
  style?: CSSProperties;
}): ReactNode {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))`,
        gap,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Panel({ children, style }: { children: ReactNode; style?: CSSProperties }): ReactNode {
  return (
    <div className="cp-surface" style={{ padding: 32, ...style }}>
      {children}
    </div>
  );
}

/** A source or assumption note, pinned under the content it qualifies. */
export function Source({ text }: { text?: string }): ReactNode {
  if (!text) return null;
  return (
    <p className="cp-small" style={{ marginTop: 12, opacity: 0.85 }}>
      Source: <Inline text={text} />
    </p>
  );
}

export function Media({
  src,
  alt,
  fit = 'cover',
  style,
}: {
  src: string;
  alt?: string;
  fit?: 'cover' | 'contain';
  style?: CSSProperties;
}): ReactNode {
  if (!src) {
    return (
      <div
        className="cp-surface"
        style={{ display: 'grid', placeItems: 'center', color: 'var(--cp-ink-muted)', ...style }}
      >
        <span className="cp-label">Image</span>
      </div>
    );
  }
  return <img src={src} alt={alt ?? ''} style={{ objectFit: fit, width: '100%', height: '100%', display: 'block', ...style }} />;
}

/** The strip along the bottom of every slide. */
export function Footer({
  theme,
  left,
  right,
}: {
  theme: Theme;
  left?: string;
  right?: string;
}): ReactNode {
  if (!left && !right) return null;
  return (
    <div className="cp-footer" style={{ borderTop: `1px solid ${theme.colors.border}` }}>
      <span>{left ?? ''}</span>
      <span>{right ?? ''}</span>
    </div>
  );
}
