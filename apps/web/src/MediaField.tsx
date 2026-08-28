import type { MediaRef } from '@cubpitch/core';
import { useRef, useState, type DragEvent, type ReactNode } from 'react';
import { fileToEmbeddedImage, MediaError, MAX_DIMENSIONS, normalizeUrl } from './media.js';

/**
 * Choosing an image for a slide.
 *
 * Three ways in, because authors have images in three shapes: a file on disk,
 * something dragged from another window, and a URL from a brand kit. The file
 * and drag paths downscale and embed so the deck stays self-contained; the URL
 * path keeps the link and warns that a linked image is only included in an
 * export when remote media is allowed.
 *
 * A `kind` picks the downscale ceiling: a team headshot does not need to be
 * 1920px wide, and a logo needs it even less.
 */
export function MediaField({
  label,
  value,
  onChange,
  kind = 'full',
  hint,
}: {
  label: string;
  value: MediaRef | undefined;
  onChange: (media: MediaRef | undefined) => void;
  kind?: keyof typeof MAX_DIMENSIONS;
  hint?: string;
}): ReactNode {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [urlOpen, setUrlOpen] = useState(false);
  const [url, setUrl] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const src = value?.src ?? '';
  const hasImage = src.length > 0;
  const isLinked = /^https?:/i.test(src);

  const set = (patch: Partial<MediaRef>): void => {
    onChange({ src: value?.src ?? '', alt: value?.alt ?? '', fit: value?.fit ?? 'cover', ...value, ...patch });
  };

  const accept = async (file: File | undefined): Promise<void> => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const embedded = await fileToEmbeddedImage(file, { maxDimension: MAX_DIMENSIONS[kind] });
      set({ src: embedded });
    } catch (cause) {
      setError(cause instanceof MediaError ? cause.message : 'Could not use that image.');
    } finally {
      setBusy(false);
    }
  };

  const onDrop = (event: DragEvent): void => {
    event.preventDefault();
    setDragging(false);
    void accept(event.dataTransfer.files[0]);
  };

  const applyUrl = (): void => {
    try {
      set({ src: normalizeUrl(url) });
      setUrl('');
      setUrlOpen(false);
      setError(null);
    } catch (cause) {
      setError(cause instanceof MediaError ? cause.message : 'That link did not work.');
    }
  };

  return (
    <div className="field">
      <p className="label">{label}</p>

      {hasImage ? (
        <div className="media">
          <div
            className="media__preview"
            style={{ backgroundImage: `url("${cssUrl(src)}")`, backgroundSize: value?.fit === 'contain' ? 'contain' : 'cover' }}
          />
          <div className="media__meta">
            {isLinked ? <span className="label" style={{ color: 'var(--ui-caution)' }}>Linked, not embedded</span> : null}
            <div style={{ display: 'flex', gap: 6, marginTop: isLinked ? 6 : 0 }}>
              <button className="btn btn--icon" onClick={() => inputRef.current?.click()} title="Replace">
                ⟳
              </button>
              <button
                className="btn btn--icon"
                onClick={() => set({ fit: value?.fit === 'contain' ? 'cover' : 'contain' })}
                title={value?.fit === 'contain' ? 'Fit: contain (click for cover)' : 'Fit: cover (click for contain)'}
              >
                {value?.fit === 'contain' ? '▣' : '⛶'}
              </button>
              <button className="btn btn--icon btn--danger" onClick={() => onChange(undefined)} title="Remove">
                ×
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          className={`media__drop ${dragging ? 'media__drop--over' : ''}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          {busy ? 'Processing…' : dragging ? 'Drop the image' : 'Drop an image, or click to choose'}
        </div>
      )}

      {hasImage ? (
        <input
          className="input"
          style={{ marginTop: 8 }}
          placeholder="Alt text, for accessibility"
          value={value?.alt ?? ''}
          onChange={(event) => set({ alt: event.target.value })}
        />
      ) : null}

      <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
        {!urlOpen ? (
          <button className="btn" style={{ fontSize: 11 }} onClick={() => setUrlOpen(true)}>
            Use a URL
          </button>
        ) : (
          <>
            <input
              className="input"
              style={{ flex: 1 }}
              placeholder="https://…/logo.png"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') applyUrl();
              }}
            />
            <button className="btn" onClick={applyUrl}>
              Set
            </button>
          </>
        )}
      </div>

      {error ? <p className="field__hint" style={{ color: 'var(--ui-danger)' }}>{error}</p> : null}
      {hint && !error ? <p className="field__hint">{hint}</p> : null}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(event) => {
          void accept(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
    </div>
  );
}

/** Keep a data: URI from breaking out of the CSS url() it sits in. */
function cssUrl(src: string): string {
  return src.replace(/["\\]/g, '\\$&');
}
