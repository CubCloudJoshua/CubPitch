import type { Deck, SlideOf, SlideType } from '@cubpitch/core';
import type { Theme } from '@cubpitch/theme';

/** What every slide component needs beyond its own content. */
export interface SlideContext {
  deck: Deck;
  theme: Theme;
  /** 1-based position among visible slides. */
  number: number;
  total: number;
}

export type SlideView<T extends SlideType> = (props: { slide: SlideOf<T>; ctx: SlideContext }) => React.ReactNode;
