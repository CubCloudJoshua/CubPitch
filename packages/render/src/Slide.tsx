import type { Slide } from '@cubpitch/core';
import type { ReactNode } from 'react';
import { Footer } from './primitives.js';
import {
  AgendaSlideView,
  AskSlideView,
  BulletsSlideView,
  ClosingSlideView,
  FinancialsSlideView,
  HowItWorksSlideView,
  ImageSlideView,
  LogosSlideView,
  MetricsSlideView,
  MoatSlideView,
  QuoteSlideView,
  RoadmapSlideView,
  SectionSlideView,
  StatementSlideView,
  TeamSlideView,
  UseOfFundsSlideView,
} from './slides/closing.js';
import {
  BusinessModelSlideView,
  CompetitionSlideView,
  GoToMarketSlideView,
  TractionSlideView,
} from './slides/business.js';
import {
  CoverSlideView,
  MarketSlideView,
  ProblemSlideView,
  ProductSlideView,
  SolutionSlideView,
  WhyNowSlideView,
} from './slides/narrative.js';
import type { SlideContext } from './types.js';

/**
 * The slide dispatcher.
 *
 * The switch is exhaustive over the discriminated union, so adding a slide type
 * without a renderer is a build error rather than a blank slide discovered in
 * front of an investor.
 */
function SlideBody({ slide, ctx }: { slide: Slide; ctx: SlideContext }): ReactNode {
  switch (slide.type) {
    case 'cover':
      return <CoverSlideView slide={slide} ctx={ctx} />;
    case 'problem':
      return <ProblemSlideView slide={slide} ctx={ctx} />;
    case 'solution':
      return <SolutionSlideView slide={slide} ctx={ctx} />;
    case 'whyNow':
      return <WhyNowSlideView slide={slide} ctx={ctx} />;
    case 'market':
      return <MarketSlideView slide={slide} ctx={ctx} />;
    case 'product':
      return <ProductSlideView slide={slide} ctx={ctx} />;
    case 'traction':
      return <TractionSlideView slide={slide} ctx={ctx} />;
    case 'businessModel':
      return <BusinessModelSlideView slide={slide} ctx={ctx} />;
    case 'goToMarket':
      return <GoToMarketSlideView slide={slide} ctx={ctx} />;
    case 'competition':
      return <CompetitionSlideView slide={slide} ctx={ctx} />;
    case 'team':
      return <TeamSlideView slide={slide} ctx={ctx} />;
    case 'ask':
      return <AskSlideView slide={slide} ctx={ctx} />;
    case 'agenda':
      return <AgendaSlideView slide={slide} ctx={ctx} />;
    case 'section':
      return <SectionSlideView slide={slide} ctx={ctx} />;
    case 'statement':
      return <StatementSlideView slide={slide} ctx={ctx} />;
    case 'howItWorks':
      return <HowItWorksSlideView slide={slide} ctx={ctx} />;
    case 'metrics':
      return <MetricsSlideView slide={slide} ctx={ctx} />;
    case 'moat':
      return <MoatSlideView slide={slide} ctx={ctx} />;
    case 'roadmap':
      return <RoadmapSlideView slide={slide} ctx={ctx} />;
    case 'financials':
      return <FinancialsSlideView slide={slide} ctx={ctx} />;
    case 'useOfFunds':
      return <UseOfFundsSlideView slide={slide} ctx={ctx} />;
    case 'logos':
      return <LogosSlideView slide={slide} ctx={ctx} />;
    case 'quote':
      return <QuoteSlideView slide={slide} ctx={ctx} />;
    case 'closing':
      return <ClosingSlideView slide={slide} ctx={ctx} />;
    case 'bullets':
      return <BulletsSlideView slide={slide} ctx={ctx} />;
    case 'image':
      return <ImageSlideView slide={slide} ctx={ctx} />;
  }
}

/** Slide types that own the whole canvas and get no footer. */
const FULL_BLEED = new Set(['cover', 'closing', 'section', 'statement', 'image']);

export function SlideView({ slide, ctx }: { slide: Slide; ctx: SlideContext }): ReactNode {
  const { deck } = ctx;
  const chromeless = FULL_BLEED.has(slide.type);
  const footerLeft = deck.meta.footer || (deck.meta.confidentiality && !chromeless ? deck.meta.confidentiality : '');
  const footerRight = deck.meta.showSlideNumbers && !chromeless ? `${ctx.number} / ${ctx.total}` : '';

  return (
    <section className="cp-slide" data-slide-id={slide.id} data-slide-type={slide.type}>
      <SlideBody slide={slide} ctx={ctx} />
      {chromeless ? null : <Footer theme={ctx.theme} left={footerLeft} right={footerRight} />}
    </section>
  );
}
