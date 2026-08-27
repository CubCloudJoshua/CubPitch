import type { Slide } from '@cubpitch/core';
import { useState, type ReactNode } from 'react';
import { api, ModelCallError } from './api.js';

/**
 * Rewrite one slide.
 *
 * The result is proposed, never applied. An author who asked for "tighter" and
 * got something worse should be one click from where they were, and a rewrite
 * that silently replaced their words would make the button too frightening to
 * press.
 */
export function Rewrite({
  deckId,
  slide,
  onAccept,
}: {
  deckId: string;
  slide: Slide;
  onAccept: (patch: Record<string, unknown>) => void;
}): ReactNode {
  const [open, setOpen] = useState(false);
  const [instruction, setInstruction] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; retryable: boolean } | null>(null);
  const [proposal, setProposal] = useState<{ slide: Slide; rationale: string; needed: string[] } | null>(null);

  const run = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      setProposal(await api.rewrite(deckId, slide.id, instruction || undefined));
    } catch (cause) {
      setError({ message: (cause as Error).message, retryable: cause instanceof ModelCallError ? cause.retryable : false });
    } finally {
      setBusy(false);
    }
  };

  const accept = (): void => {
    if (!proposal) return;
    const skip = new Set(['id', 'type', 'notes', 'hidden']);
    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(proposal.slide)) {
      if (!skip.has(key) && typeof value === 'string') patch[key] = value;
    }
    onAccept(patch);
    setProposal(null);
    setOpen(false);
    setInstruction('');
  };

  if (!open) {
    return (
      <button className="btn" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setOpen(true)}>
        Rewrite this slide
      </button>
    );
  }

  /** Only the fields that actually changed, so the diff is readable. */
  const changed = proposal
    ? Object.entries(proposal.slide).filter(
        ([key, value]) =>
          typeof value === 'string' &&
          !['id', 'type', 'notes', 'hidden'].includes(key) &&
          value !== (slide as unknown as Record<string, unknown>)[key],
      )
    : [];

  return (
    <div className="card">
      <div className="card__head">
        <span className="label">Rewrite</span>
        <button className="btn btn--icon" onClick={() => { setOpen(false); setProposal(null); }}>
          ×
        </button>
      </div>

      <input
        className="input"
        placeholder="Tighter. Lead with the number. This is two ideas."
        value={instruction}
        onChange={(event) => setInstruction(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !busy) void run();
        }}
      />
      <p className="field__hint" style={{ marginBottom: 10 }}>Optional. Leave it empty to just tighten the slide.</p>

      <button className="btn btn--accent" disabled={busy} onClick={() => void run()} style={{ width: '100%', justifyContent: 'center' }}>
        {busy ? 'Rewriting…' : proposal ? 'Try again' : 'Rewrite'}
      </button>

      {error ? (
        <p style={{ color: 'var(--ui-danger)', fontSize: 12, lineHeight: 1.5, marginTop: 10 }}>
          {error.message}
          {error.retryable ? ' Worth retrying.' : ''}
        </p>
      ) : null}

      {proposal ? (
        <div style={{ marginTop: 14 }}>
          <p className="field__hint" style={{ marginBottom: 10 }}>{proposal.rationale}</p>

          {changed.length === 0 ? (
            <p className="empty" style={{ fontSize: 12 }}>Nothing changed. The slide already reads the way it should.</p>
          ) : (
            changed.map(([key, value]) => (
              <div key={key} style={{ marginBottom: 12 }}>
                <p className="label" style={{ marginBottom: 4 }}>{key}</p>
                <p style={{ fontSize: 12, lineHeight: 1.5, margin: 0, color: 'var(--ui-ink-muted)', textDecoration: 'line-through' }}>
                  {String((slide as unknown as Record<string, unknown>)[key] ?? '') || '(empty)'}
                </p>
                <p style={{ fontSize: 12.5, lineHeight: 1.5, margin: '4px 0 0' }}>{String(value)}</p>
              </div>
            ))
          )}

          {proposal.needed.length > 0 ? (
            <>
              <p className="label" style={{ marginTop: 12, marginBottom: 4, color: 'var(--ui-danger)' }}>It needed</p>
              {proposal.needed.map((item) => (
                <p key={item} className="field__hint">{item}</p>
              ))}
            </>
          ) : null}

          <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
            <button className="btn btn--accent" onClick={accept} disabled={changed.length === 0}>
              Use it
            </button>
            <button className="btn" onClick={() => setProposal(null)}>
              Discard
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
