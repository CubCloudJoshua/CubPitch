import { visibleSlides, type Deck } from '@cubpitch/core';
import { getTheme } from '@cubpitch/theme';
import type { ReactNode } from 'react';
import { SlideView } from './Slide.js';

/** Every visible slide, in order, on its own artboard. */
export function DeckView({ deck }: { deck: Deck }): ReactNode {
  const theme = getTheme(deck.themeId);
  const slides = visibleSlides(deck);
  return (
    <>
      {slides.map((slide, index) => (
        <SlideView key={slide.id} slide={slide} ctx={{ deck, theme, number: index + 1, total: slides.length }} />
      ))}
    </>
  );
}
