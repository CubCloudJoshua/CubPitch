import { MAX_SLIDE_SECONDS, getMethodology, slideSeconds, visibleSlides, type Deck } from '@cubpitch/core';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { SlideCanvas } from './SlideCanvas.js';

/**
 * The rehearsal console.
 *
 * The audience presenter is a clean full-screen slide. This is the other
 * screen: the one the presenter looks at. It shows the current slide, the next
 * one, the speaker notes, and two clocks, and it judges the run against the
 * methodology the deck was written in. That is the whole doctrine made live.
 * The methodology says twenty minutes and ninety seconds a slide; here you find
 * out, while you practice, whether you are keeping to it.
 *
 * Time per slide is the review's own spoken-word estimate, so the budget a
 * slide is measured against is the same number that flags it as too long in the
 * review panel.
 */
export function Rehearse({ deck, startAt, onExit }: { deck: Deck; startAt: number; onExit: () => void }): ReactNode {
  const slides = visibleSlides(deck);
  const methodology = getMethodology(deck.methodologyId);

  const [index, setIndex] = useState(Math.min(Math.max(startAt, 0), Math.max(slides.length - 1, 0)));
  const [running, setRunning] = useState(true);
  const [now, setNow] = useState(Date.now());

  // Two anchors: when the whole run started, and when this slide came up.
  const runStart = useRef(Date.now());
  const slideStart = useRef(Date.now());

  const estimates = useMemo(() => slides.map((slide) => slideSeconds(slide)), [slides]);
  const totalEstimate = estimates.reduce((sum, value) => sum + value, 0);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [running]);

  const go = (next: number): void => {
    const clamped = Math.min(Math.max(next, 0), slides.length - 1);
    if (clamped !== index) {
      setIndex(clamped);
      slideStart.current = Date.now();
    }
  };

  const reset = (): void => {
    runStart.current = Date.now();
    slideStart.current = Date.now();
    setNow(Date.now());
    setRunning(true);
    setIndex(0);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      switch (event.key) {
        case 'Escape':
          return onExit();
        case 'ArrowRight':
        case ' ':
        case 'PageDown':
          event.preventDefault();
          return go(index + 1);
        case 'ArrowLeft':
        case 'PageUp':
          event.preventDefault();
          return go(index - 1);
        case 'Home':
          return go(0);
        case 'End':
          return go(slides.length - 1);
        case 'r':
          return reset();
        case 'p':
          return setRunning((value) => !value);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, slides.length, onExit]);

  const slide = slides[index];
  if (!slide) return null;
  const next = slides[index + 1];

  const totalElapsed = Math.floor((now - runStart.current) / 1000);
  const slideElapsed = Math.floor((now - slideStart.current) / 1000);
  const slideBudget = estimates[index] ?? 0;
  const totalBudget = methodology.targetMinutes * 60;

  return (
    <div className="rehearse">
      <div className="rehearse__stage">
        <div className="rehearse__current">
          <SlideCanvasFitted deck={deck} index={index} total={slides.length} />
        </div>

        <aside className="rehearse__side">
          <div className="rehearse__clocks">
            <Clock label="This slide" seconds={slideElapsed} budget={slideBudget || MAX_SLIDE_SECONDS} hardCap={MAX_SLIDE_SECONDS} />
            <Clock label={`Total · ${methodology.name}`} seconds={totalElapsed} budget={totalBudget} />
          </div>

          <div className="rehearse__next">
            <p className="label">{next ? `Next · ${index + 2} of ${slides.length}` : 'Last slide'}</p>
            {next ? (
              <div className="rehearse__next-frame">
                <SlideCanvas deck={deck} slide={next} width={320} number={index + 2} total={slides.length} />
              </div>
            ) : (
              <p className="rehearse__end">End of the deck. Leave the ask up.</p>
            )}
          </div>

          <div className="rehearse__notes">
            <p className="label">Notes</p>
            {slide.notes ? (
              <p className="rehearse__notes-body">{slide.notes}</p>
            ) : (
              <p className="rehearse__notes-empty">No notes on this slide.</p>
            )}
          </div>

          <div className="rehearse__budget">
            <p className="label">Pace</p>
            <p className="rehearse__budget-body">
              This deck reads in about {Math.round((totalEstimate / 60) * 10) / 10} min. {methodology.name} budgets{' '}
              {methodology.targetMinutes}.
            </p>
          </div>
        </aside>
      </div>

      <div className="rehearse__bar">
        <span className="label">
          {index + 1} / {slides.length}
        </span>
        <span className="rehearse__hint">← → move · P pause · R restart · Esc exit</span>
        <span style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn--icon" onClick={() => setRunning((value) => !value)}>
            {running ? '⏸' : '▶'}
          </button>
          <button className="btn btn--icon" onClick={reset} title="Restart the clock">
            ↺
          </button>
        </span>
      </div>
    </div>
  );
}

function Clock({
  label,
  seconds,
  budget,
  hardCap,
}: {
  label: string;
  seconds: number;
  budget: number;
  hardCap?: number;
}): ReactNode {
  // Amber past the budget, red past a hard cap where one applies (a slide over
  // ninety seconds is two slides, or it is mush).
  const over = seconds > budget;
  const wayOver = hardCap ? seconds > hardCap : seconds > budget * 1.2;
  const tone = wayOver ? 'var(--ui-danger)' : over ? 'var(--ui-caution)' : 'var(--ui-ink)';

  return (
    <div className="rehearse__clock">
      <p className="label">{label}</p>
      <p className="rehearse__time" style={{ color: tone }}>
        {formatClock(seconds)}
      </p>
      <p className="rehearse__budget-note">of {formatClock(budget)}</p>
    </div>
  );
}

/** The current slide, scaled to fill the stage's left pane. */
function SlideCanvasFitted({ deck, index, total }: { deck: Deck; index: number; total: number }): ReactNode {
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const slides = visibleSlides(deck);
  const slide = slides[index];

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const measure = (): void => {
      const rect = element.getBoundingClientRect();
      setWidth(Math.max(0, Math.min(rect.width, (rect.height * 1920) / 1080)));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={container} style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center' }}>
      {width > 0 && slide ? (
        <div style={{ boxShadow: '0 18px 48px rgba(0,0,0,0.6)' }}>
          <SlideCanvas deck={deck} slide={slide} width={width} number={index + 1} total={total} />
        </div>
      ) : null}
    </div>
  );
}

function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.abs(totalSeconds % 60);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
