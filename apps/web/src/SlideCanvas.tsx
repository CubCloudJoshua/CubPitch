import { visibleSlides, type Deck, type Slide } from '@cubpitch/core';
import { SlideView } from '@cubpitch/render';
import { getTheme, SLIDE_HEIGHT, SLIDE_WIDTH, slideCss } from '@cubpitch/theme';
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

/**
 * A slide, drawn by the same components that print the PDF.
 *
 * The artboard is always 1920x1080 and is scaled with a transform rather than
 * re-laid out, so a thumbnail, the editor canvas and the exported page are the
 * same picture at different sizes. Anything else and "it looked right in the
 * editor" would stop being evidence about the file the investor opens.
 */

/**
 * The deck's theme stylesheet, injected once per theme.
 *
 * The slide CSS is written for a whole document (it sets `@page` and styles
 * `.cp-slide` globally), so it is mounted as a real stylesheet rather than
 * scoped. Keying by theme id means switching themes swaps one tag.
 */
function useThemeStylesheet(themeId: string): void {
  useLayoutEffect(() => {
    const id = `cp-theme-${themeId}`;
    if (document.getElementById(id)) return;

    const style = document.createElement('style');
    style.id = id;
    style.textContent = slideCss(getTheme(themeId));
    document.head.append(style);
  }, [themeId]);
}

export function SlideCanvas({
  deck,
  slide,
  width,
  number,
  total,
}: {
  deck: Deck;
  slide: Slide;
  width: number;
  number: number;
  total: number;
}): ReactNode {
  const theme = getTheme(deck.themeId);
  useThemeStylesheet(deck.themeId);

  const scale = width / SLIDE_WIDTH;

  return (
    <div
      style={{
        width,
        height: SLIDE_HEIGHT * scale,
        overflow: 'hidden',
        background: theme.colors.bg,
      }}
    >
      <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: SLIDE_WIDTH, height: SLIDE_HEIGHT }}>
        <SlideView slide={slide} ctx={{ deck, theme, number, total }} />
      </div>
    </div>
  );
}

/** The canvas fills whatever space the layout gives it, without overflowing. */
export function FittedSlide({ deck, slide, number, total }: { deck: Deck; slide: Slide; number: number; total: number }): ReactNode {
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = container.current;
    if (!element) return;

    const measure = (): void => {
      const { width: available, height } = element.getBoundingClientRect();
      // Fit by whichever axis runs out first, so a short window shows a whole
      // slide rather than a cropped one.
      setWidth(Math.max(0, Math.min(available, (height * SLIDE_WIDTH) / SLIDE_HEIGHT)));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={container} style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center' }}>
      {width > 0 ? (
        <div className="canvas__frame">
          <SlideCanvas deck={deck} slide={slide} width={width} number={number} total={total} />
        </div>
      ) : null}
    </div>
  );
}

/** Full-screen presentation with keyboard navigation. */
export function Presenter({ deck, startAt, onExit }: { deck: Deck; startAt: number; onExit: () => void }): ReactNode {
  const slides = visibleSlides(deck);
  const [index, setIndex] = useState(Math.min(Math.max(startAt, 0), Math.max(slides.length - 1, 0)));

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') return onExit();
      if (event.key === 'ArrowRight' || event.key === ' ' || event.key === 'PageDown') {
        event.preventDefault();
        setIndex((current) => Math.min(current + 1, slides.length - 1));
      }
      if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
        event.preventDefault();
        setIndex((current) => Math.max(current - 1, 0));
      }
      if (event.key === 'Home') setIndex(0);
      if (event.key === 'End') setIndex(slides.length - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onExit, slides.length]);

  const slide = slides[index];
  if (!slide) return null;

  return (
    <div className="presenter">
      <FittedSlide deck={deck} slide={slide} number={index + 1} total={slides.length} />
      <p className="presenter__hint">
        {index + 1} / {slides.length} · arrows to move · esc to exit
      </p>
    </div>
  );
}
