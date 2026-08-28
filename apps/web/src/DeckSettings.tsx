import type { Deck, DeckMeta, RaiseStage } from '@cubpitch/core';
import type { ReactNode } from 'react';

/**
 * Deck-wide settings.
 *
 * These are the things stamped on every slide rather than typed into one: the
 * footer, the confidentiality label, whether slide numbers show, and the round
 * the deck is for. They rendered from the start but had no way to change, so a
 * deck was stuck with "Confidential" and whatever footer it was created with.
 * One modal, because none of these is per-slide.
 */

const STAGES: Array<{ value: RaiseStage; label: string }> = [
  { value: 'pre-seed', label: 'Pre-seed' },
  { value: 'seed', label: 'Seed' },
  { value: 'series-a', label: 'Series A' },
  { value: 'series-b', label: 'Series B' },
  { value: 'series-c', label: 'Series C' },
  { value: 'growth', label: 'Growth' },
  { value: 'internal', label: 'Internal' },
];

export function DeckSettings({
  deck,
  onChange,
  onClose,
}: {
  deck: Deck;
  onChange: (meta: Partial<DeckMeta>) => void;
  onClose: () => void;
}): ReactNode {
  const meta = deck.meta;

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal__panel" onClick={(event) => event.stopPropagation()}>
        <div className="card__head" style={{ marginBottom: 18 }}>
          <span className="label">Deck settings</span>
          <button className="btn btn--icon" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="field">
          <p className="label">Footer</p>
          <input
            className="input"
            placeholder="CubCloud AI · 2026"
            value={meta.footer}
            onChange={(event) => onChange({ footer: event.target.value })}
          />
          <p className="field__hint">Shown along the bottom of every content slide. Empty hides it.</p>
        </div>

        <div className="field">
          <p className="label">Confidentiality</p>
          <input
            className="input"
            placeholder="Confidential"
            value={meta.confidentiality}
            onChange={(event) => onChange({ confidentiality: event.target.value })}
          />
          <p className="field__hint">Stamped on the cover and, if there is no footer, along the bottom.</p>
        </div>

        <div className="field" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            checked={meta.showSlideNumbers}
            onChange={(event) => onChange({ showSlideNumbers: event.target.checked })}
          />
          <span className="label" style={{ marginBottom: 0 }}>
            Show slide numbers
          </span>
        </div>

        <div className="section" style={{ marginTop: 18 }}>
          <div className="field">
            <p className="label">Round</p>
            <select
              className="select"
              style={{ width: '100%' }}
              value={meta.stage}
              onChange={(event) => onChange({ stage: event.target.value as RaiseStage })}
            >
              {STAGES.map((stage) => (
                <option key={stage.value} value={stage.value}>
                  {stage.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <p className="label">Raise</p>
            <input
              className="input"
              placeholder="$3M on a SAFE"
              value={meta.raise}
              onChange={(event) => onChange({ raise: event.target.value })}
            />
          </div>

          <div className="field">
            <p className="label">Audience</p>
            <input
              className="input"
              placeholder="Healthcare-focused seed funds"
              value={meta.audience}
              onChange={(event) => onChange({ audience: event.target.value })}
            />
            <p className="field__hint">Used as the default when the coach reads the deck.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
