import type { CritiqueResult, QaResult } from '@cubpitch/ai';
import { slideTitle, type Deck } from '@cubpitch/core';
import { useState, type ReactNode } from 'react';
import { api, ModelCallError } from './api.js';

/**
 * The coach panel.
 *
 * Critique and question prep sit behind an explicit button rather than running
 * on a timer, for two reasons. Each call costs real money, and each one takes
 * long enough that an author who did not ask for it would think the editor had
 * hung.
 *
 * The audience field is the whole difference between generic advice and useful
 * advice. A healthcare seed fund and a growth-stage infrastructure fund stop on
 * different slides.
 */

type Tab = 'critique' | 'qa';

export function Coach({ deck, onClose, onSelectSlide }: { deck: Deck; onClose: () => void; onSelectSlide: (slideId: string) => void }): ReactNode {
  const [tab, setTab] = useState<Tab>('critique');
  const [audience, setAudience] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; retryable: boolean } | null>(null);
  const [critique, setCritique] = useState<CritiqueResult | null>(null);
  const [qa, setQa] = useState<QaResult | null>(null);

  /** Slide numbers are 1-based over all slides, matching the rail. */
  const slideIdByNumber = new Map(deck.slides.map((slide, index) => [index + 1, slide.id]));
  const titleByNumber = new Map(deck.slides.map((slide, index) => [index + 1, slideTitle(slide)]));

  const run = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      if (tab === 'critique') setCritique(await api.critique(deck.id, audience || undefined));
      else setQa(await api.qa(deck.id, audience || undefined));
    } catch (cause) {
      setError({
        message: (cause as Error).message,
        retryable: cause instanceof ModelCallError ? cause.retryable : false,
      });
    } finally {
      setBusy(false);
    }
  };

  const result = tab === 'critique' ? critique : qa;

  return (
    <aside className="review" style={{ width: 520 }}>
      <div className="card__head" style={{ marginBottom: 14 }}>
        <span className="label">Coach</span>
        <button className="btn btn--icon" onClick={onClose}>
          ×
        </button>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        <button className={`btn ${tab === 'critique' ? 'btn--accent' : ''}`} onClick={() => setTab('critique')}>
          Critique
        </button>
        <button className={`btn ${tab === 'qa' ? 'btn--accent' : ''}`} onClick={() => setTab('qa')}>
          Question prep
        </button>
      </div>

      <div className="field">
        <p className="label">Who is reading</p>
        <input
          className="input"
          placeholder="Healthcare-focused seed fund, partner is ex-operator"
          value={audience}
          onChange={(event) => setAudience(event.target.value)}
        />
        <p className="field__hint">Optional, and the difference between generic advice and useful advice.</p>
      </div>

      <button className="btn btn--accent" onClick={() => void run()} disabled={busy} style={{ width: '100%', justifyContent: 'center' }}>
        {busy ? 'Reading the deck…' : tab === 'critique' ? 'Read it as a partner' : 'Work out the questions'}
      </button>

      {error ? (
        <div className="card" style={{ marginTop: 14, borderColor: 'var(--ui-danger)' }}>
          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5 }}>{error.message}</p>
          {error.retryable ? (
            <button className="btn" style={{ marginTop: 10 }} onClick={() => void run()}>
              Try again
            </button>
          ) : null}
        </div>
      ) : null}

      {busy ? <p className="field__hint" style={{ marginTop: 12 }}>This takes up to a minute. It is reading the whole deck.</p> : null}

      {!busy && !result && !error ? (
        <p className="empty" style={{ marginTop: 20 }}>
          {tab === 'critique'
            ? 'Reads the deck cold and tells you what would stop a partner. Costs a model call, so it runs when you ask.'
            : 'Works out what they will ask after the deck, and drafts the answers the deck already supports.'}
        </p>
      ) : null}

      {tab === 'critique' && critique ? (
        <CritiqueView
          critique={critique}
          titleByNumber={titleByNumber}
          onSelect={(number) => {
            const id = slideIdByNumber.get(number);
            if (id) onSelectSlide(id);
          }}
        />
      ) : null}

      {tab === 'qa' && qa ? <QaView qa={qa} titleByNumber={titleByNumber} /> : null}
    </aside>
  );
}

const SEVERITY_ORDER = { blocking: 0, serious: 1, minor: 2 } as const;

function CritiqueView({
  critique,
  titleByNumber,
  onSelect,
}: {
  critique: CritiqueResult;
  titleByNumber: Map<number, string>;
  onSelect: (slide: number) => void;
}): ReactNode {
  const findings = [...critique.findings].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

  return (
    <div style={{ marginTop: 20 }}>
      <p className="label" style={{ marginBottom: 6 }}>
        What they took away
      </p>
      <p style={{ fontSize: 13, lineHeight: 1.55, margin: '0 0 18px' }}>{critique.readback}</p>

      <div className="card" style={{ borderColor: 'var(--ui-caution)' }}>
        <p className="label" style={{ marginBottom: 6, color: 'var(--ui-caution)' }}>
          Biggest risk
        </p>
        <p style={{ fontSize: 13, lineHeight: 1.55, margin: 0 }}>{critique.biggestRisk}</p>
      </div>

      {findings.map((finding, index) => (
        <div
          key={index}
          className={`finding finding--${finding.severity === 'blocking' ? 'error' : finding.severity === 'serious' ? 'warning' : 'note'}`}
          onClick={() => finding.slide > 0 && onSelect(finding.slide)}
        >
          <p className="finding__message">
            {finding.slide > 0 ? <strong>{finding.slide}. {titleByNumber.get(finding.slide)} </strong> : null}
            {finding.problem}
          </p>
          <p className="finding__rule" style={{ textTransform: 'none', fontFamily: 'var(--ui-font-body)', fontSize: 11.5, marginTop: 6 }}>
            {finding.why}
          </p>
          <p style={{ fontSize: 12, lineHeight: 1.5, margin: '8px 0 0', color: 'var(--ui-accent-bright)' }}>{finding.fix}</p>
        </div>
      ))}

      {critique.strengths.length > 0 ? (
        <>
          <p className="label" style={{ marginTop: 24, marginBottom: 8 }}>
            Working
          </p>
          {critique.strengths.map((item) => (
            <p key={item} className="field__hint" style={{ marginBottom: 6 }}>
              {item}
            </p>
          ))}
        </>
      ) : null}
    </div>
  );
}

const LIKELIHOOD_ORDER = { certain: 0, likely: 1, possible: 2 } as const;

function QaView({ qa, titleByNumber }: { qa: QaResult; titleByNumber: Map<number, string> }): ReactNode {
  const objections = [...qa.objections].sort((a, b) => LIKELIHOOD_ORDER[a.likelihood] - LIKELIHOOD_ORDER[b.likelihood]);

  return (
    <div style={{ marginTop: 20 }}>
      {objections.map((objection, index) => (
        <div key={index} className="card">
          <div className="card__head">
            <span className="label" style={{ color: objection.likelihood === 'certain' ? 'var(--ui-danger)' : 'var(--ui-caution)' }}>
              {objection.likelihood}
            </span>
            {objection.slide > 0 ? <span className="label">{titleByNumber.get(objection.slide)}</span> : null}
          </div>
          <p style={{ fontSize: 13.5, fontWeight: 600, margin: '0 0 6px', lineHeight: 1.45 }}>{objection.question}</p>
          <p className="field__hint" style={{ marginBottom: 10 }}>{objection.behind}</p>

          {objection.answer ? (
            <p style={{ fontSize: 12.5, lineHeight: 1.55, margin: 0 }}>{objection.answer}</p>
          ) : null}

          {objection.needed ? (
            <p style={{ fontSize: 12.5, lineHeight: 1.5, margin: '8px 0 0', color: 'var(--ui-danger)' }}>
              Find out: {objection.needed}
            </p>
          ) : null}
        </div>
      ))}

      {qa.appendix.length > 0 ? (
        <>
          <p className="label" style={{ marginTop: 20, marginBottom: 8 }}>
            Worth having in an appendix
          </p>
          {qa.appendix.map((item) => (
            <p key={item} className="field__hint" style={{ marginBottom: 6 }}>
              {item}
            </p>
          ))}
        </>
      ) : null}
    </div>
  );
}
