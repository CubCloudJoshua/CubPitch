import {
  addSlide,
  duplicateSlide,
  getMethodology,
  METHODOLOGIES,
  moveSlide,
  removeSlide,
  SLIDE_LABELS,
  SLIDE_TYPES,
  slideTitle,
  updateSlide,
  visibleSlides,
  type Deck,
  type ReviewFinding,
  type SlideType,
} from '@cubpitch/core';
import { THEMES } from '@cubpitch/theme';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, ModelCallError, type DeckSummary, type OverflowFinding } from './api.js';
import { Coach } from './Coach.js';
import { Inspector } from './Inspector.js';
import { FittedSlide, Presenter, SlideCanvas } from './SlideCanvas.js';
import { useDeck, type SaveState } from './useDeck.js';

export function App(): ReactNode {
  const [deckId, setDeckId] = useState<string | null>(() => new URLSearchParams(location.search).get('deck'));

  // The deck id lives in the URL so a slide can be linked to in Slack.
  useEffect(() => {
    const url = new URL(location.href);
    if (deckId) url.searchParams.set('deck', deckId);
    else url.searchParams.delete('deck');
    history.replaceState(null, '', url);
  }, [deckId]);

  return deckId ? <Editor deckId={deckId} onClose={() => setDeckId(null)} /> : <Picker onOpen={setDeckId} />;
}

// --- Deck picker ------------------------------------------------------------

function Picker({ onOpen }: { onOpen: (id: string) => void }): ReactNode {
  const [decks, setDecks] = useState<DeckSummary[] | null>(null);
  const [company, setCompany] = useState('');
  const [methodologyId, setMethodologyId] = useState('house');
  const [themeId, setThemeId] = useState('cubcloud');
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    api
      .listDecks()
      .then(setDecks)
      .catch((cause: unknown) => setError((cause as Error).message));
  }, []);

  useEffect(refresh, [refresh]);

  const create = async (): Promise<void> => {
    if (!company.trim()) return;
    try {
      const deck = await api.createDeck({ company: company.trim(), methodologyId, themeId });
      onOpen(deck.id);
    } catch (cause) {
      setError((cause as Error).message);
    }
  };

  return (
    <div className="picker">
      <p className="topbar__brand" style={{ fontSize: 40, marginBottom: 4 }}>
        Cub<span>Pitch</span>
      </p>
      <p className="empty" style={{ marginBottom: 40 }}>
        Pitch decks as structured documents.
      </p>

      <div className="card" style={{ padding: 18 }}>
        <p className="label" style={{ marginBottom: 12 }}>
          Start a deck
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            className="input"
            style={{ flex: '2 1 220px' }}
            placeholder="Company name"
            value={company}
            onChange={(event) => setCompany(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void create();
            }}
          />
          <select className="select" value={methodologyId} onChange={(event) => setMethodologyId(event.target.value)}>
            {METHODOLOGIES.map((methodology) => (
              <option key={methodology.id} value={methodology.id}>
                {methodology.name}
              </option>
            ))}
          </select>
          <select className="select" value={themeId} onChange={(event) => setThemeId(event.target.value)}>
            {THEMES.map((theme) => (
              <option key={theme.id} value={theme.id}>
                {theme.name}
              </option>
            ))}
          </select>
          <button className="btn btn--accent" onClick={() => void create()} disabled={!company.trim()}>
            Create
          </button>
        </div>
        <p className="field__hint" style={{ marginTop: 10 }}>
          {getMethodology(methodologyId).summary}
        </p>
      </div>

      {error ? <p style={{ color: 'var(--ui-danger)' }}>{error}</p> : null}

      <DraftFromBrief methodologyId={methodologyId} themeId={themeId} onOpen={onOpen} />

      <div style={{ marginTop: 36 }}>
        <p className="label" style={{ marginBottom: 8 }}>
          Decks
        </p>
        {decks === null ? (
          <p className="empty">Loading.</p>
        ) : decks.length === 0 ? (
          <p className="empty">No decks yet.</p>
        ) : (
          decks.map((deck) => (
            <div className="picker__row" key={deck.id} onClick={() => onOpen(deck.id)}>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 600 }}>{deck.title}</p>
                <p className="label" style={{ marginTop: 4 }}>
                  {deck.company} · {getMethodology(deck.methodologyId).name} · {deck.slideCount} slides
                </p>
              </div>
              <span className="label">{deck.updatedAt.slice(0, 10)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/**
 * Draft a deck from a brief.
 *
 * Collapsed by default. It costs a model call and takes a minute, so it should
 * not be the first thing a returning author's eye lands on, and it should never
 * be reachable by accident.
 */
function DraftFromBrief({
  methodologyId,
  themeId,
  onOpen,
}: {
  methodologyId: string;
  themeId: string;
  onOpen: (id: string) => void;
}): ReactNode {
  const [open, setOpen] = useState(false);
  const [company, setCompany] = useState('');
  const [brief, setBrief] = useState('');
  const [guidance, setGuidance] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; retryable: boolean } | null>(null);
  const [result, setResult] = useState<{ deckId: string; assumptions: string[]; missing: string[] } | null>(null);

  const run = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      const drafted = await api.draft({ brief, company: company.trim(), methodologyId, themeId, guidance: guidance || undefined });
      setResult({ deckId: drafted.deck.id, assumptions: drafted.assumptions, missing: drafted.missing });
    } catch (cause) {
      setError({ message: (cause as Error).message, retryable: cause instanceof ModelCallError ? cause.retryable : false });
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button className="btn" style={{ marginTop: 12 }} onClick={() => setOpen(true)}>
        Or draft one from a brief
      </button>
    );
  }

  return (
    <div className="card" style={{ padding: 18, marginTop: 12 }}>
      <div className="card__head">
        <span className="label">Draft from a brief</span>
        <button className="btn btn--icon" onClick={() => setOpen(false)}>
          ×
        </button>
      </div>

      {result ? (
        <div>
          <p style={{ margin: '0 0 14px', fontSize: 13 }}>
            Drafted into the {getMethodology(methodologyId).name}. Nothing was invented: here is what it had to assume and
            what it still needs from you.
          </p>

          {result.assumptions.length > 0 ? (
            <>
              <p className="label" style={{ marginBottom: 6, color: 'var(--ui-caution)' }}>Assumed</p>
              {result.assumptions.map((item) => (
                <p key={item} className="field__hint" style={{ marginBottom: 4 }}>{item}</p>
              ))}
            </>
          ) : null}

          {result.missing.length > 0 ? (
            <>
              <p className="label" style={{ margin: '14px 0 6px', color: 'var(--ui-danger)' }}>You still have to supply</p>
              {result.missing.map((item) => (
                <p key={item} className="field__hint" style={{ marginBottom: 4 }}>{item}</p>
              ))}
            </>
          ) : null}

          <button className="btn btn--accent" style={{ marginTop: 16 }} onClick={() => onOpen(result.deckId)}>
            Open the deck
          </button>
        </div>
      ) : (
        <>
          <input
            className="input"
            style={{ marginBottom: 10 }}
            placeholder="Company name"
            value={company}
            onChange={(event) => setCompany(event.target.value)}
          />
          <textarea
            className="textarea"
            rows={8}
            placeholder="Everything you know: who the customer is, what it costs them today, what you have built, what you have sold, who you are, what you are raising. Paste an old deck if you have one."
            value={brief}
            onChange={(event) => setBrief(event.target.value)}
          />
          <input
            className="input"
            style={{ marginTop: 10 }}
            placeholder="Anything else? e.g. we are pre-revenue, say so plainly"
            value={guidance}
            onChange={(event) => setGuidance(event.target.value)}
          />
          <p className="field__hint" style={{ marginTop: 8 }}>
            It will not invent a number, a customer, or a date. Whatever the brief does not say, it will tell you it needs.
          </p>

          {error ? (
            <p style={{ color: 'var(--ui-danger)', fontSize: 12.5, lineHeight: 1.5, marginTop: 10 }}>
              {error.message}
              {error.retryable ? ' Worth retrying.' : ''}
            </p>
          ) : null}

          <button
            className="btn btn--accent"
            style={{ marginTop: 12 }}
            disabled={busy || !company.trim() || brief.trim().length < 40}
            onClick={() => void run()}
          >
            {busy ? 'Drafting, about a minute…' : 'Draft the deck'}
          </button>
        </>
      )}
    </div>
  );
}

// --- Editor -----------------------------------------------------------------

function Editor({ deckId, onClose }: { deckId: string; onClose: () => void }): ReactNode {
  const editor = useDeck(deckId);
  const { deck, review, apply } = editor;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [showCoach, setShowCoach] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const [overflow, setOverflow] = useState<OverflowFinding[] | null>(null);

  // Select the first slide once the deck arrives, and never hold a selection
  // pointing at a slide that has been deleted.
  useEffect(() => {
    if (!deck) return;
    setSelectedId((current) => (current && deck.slides.some((slide) => slide.id === current) ? current : deck.slides[0]?.id ?? null));
  }, [deck]);

  const selected = useMemo(() => deck?.slides.find((slide) => slide.id === selectedId) ?? null, [deck, selectedId]);
  const selectedIndex = deck && selectedId ? deck.slides.findIndex((slide) => slide.id === selectedId) : -1;

  const findingsBySlide = useMemo(() => {
    const map = new Map<string, ReviewFinding[]>();
    for (const finding of review?.findings ?? []) {
      if (!finding.slideId) continue;
      const list = map.get(finding.slideId) ?? [];
      list.push(finding);
      map.set(finding.slideId, list);
    }
    return map;
  }, [review]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      const typing = event.target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName);
      const meta = event.metaKey || event.ctrlKey;

      if (meta && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void editor.saveNow();
        return;
      }
      if (meta && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) editor.redo();
        else editor.undo();
        return;
      }
      if (typing) return;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        if (!deck) return;
        event.preventDefault();
        const next = selectedIndex + (event.key === 'ArrowDown' ? 1 : -1);
        const target = deck.slides[Math.min(Math.max(next, 0), deck.slides.length - 1)];
        if (target) setSelectedId(target.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [deck, editor, selectedIndex]);

  if (!deck) {
    return (
      <div className="picker">
        <p className="empty">{editor.saveError ?? 'Loading deck.'}</p>
        <button className="btn" onClick={onClose} style={{ marginTop: 16 }}>
          Back
        </button>
      </div>
    );
  }

  const visible = visibleSlides(deck);
  const methodology = getMethodology(deck.methodologyId);

  const checkLayout = async (): Promise<void> => {
    await editor.saveNow();
    try {
      setOverflow(await api.layout(deck.id));
    } catch (error) {
      setOverflow([]);
      window.alert(`Could not measure layout: ${(error as Error).message}`);
    }
  };

  const download = async (format: 'pdf' | 'pptx'): Promise<void> => {
    await editor.saveNow();
    // The server exports what it has stored. Downloading after a failed save
    // would hand the author a file that is missing their last edits, or is
    // somebody else's deck entirely.
    if (editor.saveState === 'conflict' || editor.saveState === 'error') {
      window.alert(`Not exporting: your last change did not save.\n\n${editor.saveError ?? ''}`);
      return;
    }
    window.location.href = api.exportUrl(deck.id, format);
  };

  return (
    <div className="app">
      <header className="topbar">
        <button className="topbar__brand" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} onClick={onClose}>
          Cub<span>Pitch</span>
        </button>

        <input
          className="topbar__title"
          value={deck.title}
          onChange={(event) => apply((current) => ({ ...current, title: event.target.value }))}
        />

        <select
          className="select"
          value={deck.methodologyId}
          onChange={(event) => apply((current) => ({ ...current, methodologyId: event.target.value }))}
          title="Methodology: changes the guidance and the review, never the content"
        >
          {METHODOLOGIES.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.name}
            </option>
          ))}
        </select>

        <select
          className="select"
          value={deck.themeId}
          onChange={(event) => apply((current) => ({ ...current, themeId: event.target.value }))}
          title="Theme"
        >
          {THEMES.map((theme) => (
            <option key={theme.id} value={theme.id}>
              {theme.name}
            </option>
          ))}
        </select>

        <span className="topbar__spacer" />

        <SaveIndicator state={editor.saveState} error={editor.saveError} onReload={() => void editor.reload()} />

        <button className="btn btn--icon" onClick={editor.undo} disabled={!editor.canUndo} title="Undo">
          ↶
        </button>
        <button className="btn btn--icon" onClick={editor.redo} disabled={!editor.canRedo} title="Redo">
          ↷
        </button>
        <button
          className={`btn ${review && review.errors > 0 ? 'btn--accent' : ''}`}
          onClick={() => {
            setShowCoach(false);
            setShowReview((open) => !open);
          }}
        >
          Review {review ? `· ${review.findings.length}` : ''}
        </button>
        <button
          className="btn"
          onClick={() => {
            setShowReview(false);
            setShowCoach((open) => !open);
          }}
          title="Critique and question prep. Calls a model."
        >
          Coach
        </button>
        <button className="btn" onClick={() => setPresenting(true)}>
          Present
        </button>
        <button className="btn" onClick={() => void download('pdf')}>
          PDF
        </button>
        <button className="btn" onClick={() => void download('pptx')}>
          PPTX
        </button>
      </header>

      <div className="workspace">
        <nav className="rail">
          {deck.slides.map((slide, index) => {
            const findings = findingsBySlide.get(slide.id) ?? [];
            const worst = findings.some((finding) => finding.severity === 'error')
              ? 'error'
              : findings.some((finding) => finding.severity === 'warning')
                ? 'warning'
                : null;
            return (
              <div
                key={slide.id}
                className={[
                  'rail__slide',
                  slide.id === selectedId ? 'rail__slide--active' : '',
                  slide.hidden ? 'rail__slide--hidden' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => setSelectedId(slide.id)}
              >
                <span className="rail__number">{index + 1}</span>
                {worst ? <span className={`rail__flag rail__flag--${worst}`} /> : null}
                <SlideCanvas
                  deck={deck}
                  slide={slide}
                  width={210}
                  number={Math.max(visible.findIndex((entry) => entry.id === slide.id) + 1, 1)}
                  total={visible.length}
                />
                <p className="rail__caption">{slideTitle(slide) || SLIDE_LABELS[slide.type]}</p>
              </div>
            );
          })}
          <AddSlide methodologyId={deck.methodologyId} onAdd={(type) => apply((current) => addSlide(current, type))} />
        </nav>

        <main className="canvas">
          <div className="canvas__stage">
            {selected ? (
              <FittedSlide
                deck={deck}
                slide={selected}
                number={Math.max(visible.findIndex((slide) => slide.id === selected.id) + 1, 1)}
                total={visible.length}
              />
            ) : (
              <p className="empty">This deck has no slides.</p>
            )}
          </div>

          <div className="canvas__bar">
            <span className="label">
              {methodology.name} · {visible.length} slides · {review ? `${review.minutes} min` : ''}
            </span>
            <span className="topbar__spacer" />
            {selected ? (
              <>
                <button
                  className="btn btn--icon"
                  onClick={() => apply((current) => moveSlide(current, selected.id, selectedIndex - 1))}
                  disabled={selectedIndex <= 0}
                  title="Move slide up"
                >
                  ↑
                </button>
                <button
                  className="btn btn--icon"
                  onClick={() => apply((current) => moveSlide(current, selected.id, selectedIndex + 1))}
                  disabled={selectedIndex >= deck.slides.length - 1}
                  title="Move slide down"
                >
                  ↓
                </button>
                <button className="btn" onClick={() => apply((current) => duplicateSlide(current, selected.id))}>
                  Duplicate
                </button>
                <button
                  className="btn btn--danger"
                  onClick={() => {
                    if (window.confirm(`Delete "${slideTitle(selected)}"?`)) apply((current) => removeSlide(current, selected.id));
                  }}
                >
                  Delete
                </button>
              </>
            ) : null}
            <button className="btn" onClick={() => void checkLayout()} title="Measure whether content fits">
              Check layout
            </button>
          </div>

          {overflow && overflow.length > 0 ? (
            <div style={{ padding: '10px 18px', borderTop: '1px solid var(--ui-border)', background: 'var(--ui-bg)' }}>
              <p className="label" style={{ color: 'var(--ui-caution)' }}>
                Content is clipped on {overflow.length} slide{overflow.length === 1 ? '' : 's'}
              </p>
              {overflow.map((finding) => (
                <p key={finding.slideId} className="field__hint" style={{ cursor: 'pointer' }} onClick={() => setSelectedId(finding.slideId)}>
                  {finding.number}. {finding.title} (+{finding.overflowPx}px)
                </p>
              ))}
            </div>
          ) : null}
        </main>

        {selected ? (
          <Inspector deck={deck} slide={selected} onChange={(patch) => apply((current) => updateSlide(current, selected.id, patch))} />
        ) : (
          <div className="inspector" />
        )}
      </div>

      {showReview && review ? (
        <ReviewPanel
          deck={deck}
          review={review}
          onClose={() => setShowReview(false)}
          onSelect={(slideId) => {
            setSelectedId(slideId);
            setShowReview(false);
          }}
        />
      ) : null}

      {showCoach ? (
        <Coach
          deck={deck}
          onClose={() => setShowCoach(false)}
          onSelectSlide={(slideId) => {
            setSelectedId(slideId);
            setShowCoach(false);
          }}
        />
      ) : null}

      {presenting ? (
        <Presenter deck={deck} startAt={Math.max(visible.findIndex((slide) => slide.id === selectedId), 0)} onExit={() => setPresenting(false)} />
      ) : null}
    </div>
  );
}

function SaveIndicator({ state, error, onReload }: { state: SaveState; error: string | null; onReload: () => void }): ReactNode {
  if (state === 'conflict') {
    return (
      <span className="status status--conflict" title={error ?? ''}>
        Someone else saved{' '}
        <button className="btn btn--icon" onClick={onReload}>
          Reload
        </button>
      </span>
    );
  }

  const text: Record<SaveState, string> = {
    idle: '',
    dirty: 'Unsaved',
    saving: 'Saving',
    saved: 'Saved',
    conflict: '',
    error: error ?? 'Save failed',
  };
  return <span className={`status status--${state}`}>{text[state]}</span>;
}

function AddSlide({ methodologyId, onAdd }: { methodologyId: string; onAdd: (type: SlideType) => void }): ReactNode {
  const [open, setOpen] = useState(false);
  const methodology = getMethodology(methodologyId);

  // The methodology's own slides come first and use its language for them;
  // everything else is below the line.
  const primary = methodology.steps.map((step) => ({ type: step.type, label: step.label }));
  const primaryTypes = new Set(primary.map((entry) => entry.type));
  const rest = SLIDE_TYPES.filter((type) => !primaryTypes.has(type)).map((type) => ({ type, label: SLIDE_LABELS[type] }));

  if (!open) {
    return (
      <button className="rail__add" onClick={() => setOpen(true)}>
        + Add slide
      </button>
    );
  }

  return (
    <div className="card" style={{ padding: 8 }}>
      <div className="card__head">
        <span className="label">Add slide</span>
        <button className="btn btn--icon" onClick={() => setOpen(false)}>
          ×
        </button>
      </div>
      {[...primary, ...rest].map((entry, index) => (
        <button
          key={`${entry.type}-${index}`}
          className="btn"
          style={{
            width: '100%',
            justifyContent: 'flex-start',
            marginBottom: 4,
            borderTop: index === primary.length ? '1px solid var(--ui-border)' : undefined,
          }}
          onClick={() => {
            onAdd(entry.type);
            setOpen(false);
          }}
        >
          {entry.label}
        </button>
      ))}
    </div>
  );
}

function ReviewPanel({
  deck,
  review,
  onClose,
  onSelect,
}: {
  deck: Deck;
  review: NonNullable<ReturnType<typeof useDeck>['review']>;
  onClose: () => void;
  onSelect: (slideId: string) => void;
}): ReactNode {
  const numbers = new Map(deck.slides.map((slide, index) => [slide.id, index + 1]));
  const deckLevel = review.findings.filter((finding) => !finding.slideId);
  const slideLevel = review.findings.filter((finding) => finding.slideId);

  return (
    <aside className="review">
      <div className="card__head" style={{ marginBottom: 16 }}>
        <span className="label">Review · {review.methodology.name}</span>
        <button className="btn btn--icon" onClick={onClose}>
          ×
        </button>
      </div>

      <div className="summary">
        <div className="summary__stat">
          <p className="summary__value" style={{ color: review.errors > 0 ? 'var(--ui-danger)' : 'var(--ui-positive)' }}>
            {review.errors}
          </p>
          <p className="label">Errors</p>
        </div>
        <div className="summary__stat">
          <p className="summary__value" style={{ color: review.warnings > 0 ? 'var(--ui-caution)' : 'var(--ui-ink)' }}>
            {review.warnings}
          </p>
          <p className="label">Warnings</p>
        </div>
        <div className="summary__stat">
          <p className="summary__value">{review.minutes}</p>
          <p className="label">Minutes · budget {review.methodology.targetMinutes}</p>
        </div>
      </div>

      {review.findings.length === 0 ? <p className="empty">Nothing to flag.</p> : null}

      {deckLevel.length > 0 ? (
        <>
          <p className="label" style={{ marginTop: 20, marginBottom: 4 }}>
            The deck
          </p>
          {deckLevel.map((finding, index) => (
            <div key={index} className={`finding finding--${finding.severity}`}>
              <p className="finding__message">{finding.message}</p>
              <p className="finding__rule">{finding.rule}</p>
            </div>
          ))}
        </>
      ) : null}

      {slideLevel.length > 0 ? (
        <>
          <p className="label" style={{ marginTop: 24, marginBottom: 4 }}>
            Slides
          </p>
          {slideLevel.map((finding, index) => (
            <div
              key={index}
              className={`finding finding--${finding.severity}`}
              onClick={() => finding.slideId && onSelect(finding.slideId)}
            >
              <p className="finding__message">
                <strong>{numbers.get(finding.slideId ?? '')}.</strong> {finding.message}
              </p>
              <p className="finding__rule">{finding.rule}</p>
            </div>
          ))}
        </>
      ) : null}

      <p className="label" style={{ marginTop: 28, marginBottom: 8 }}>
        {review.methodology.name} working rules
      </p>
      {review.methodology.rules.map((rule) => (
        <p key={rule.id} className="field__hint" style={{ marginBottom: 8 }}>
          {rule.rule}
        </p>
      ))}
    </aside>
  );
}
