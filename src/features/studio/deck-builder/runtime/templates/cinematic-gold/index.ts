/**
 * Cinematic Gold template — slide registry.
 *
 * Maps each `SlideType` to its layout component. Stage.tsx looks up
 * the active template here and renders the slide.
 *
 * All 10 slides are lifted from
 * `/Users/babak/Projects/propsight/docs/studio-deck-builder/secondary-market-deck/src/slides/`
 * and adapted from hardcoded `lib/data.ts` imports to the typed
 * `SlideProps` prop bag.
 */

import type { ComponentType } from 'react';
import type { SlideProps, SlideType } from '../../types';

import { CoverSlide }         from './slides/cover';
import { WhyNowSlide }        from './slides/why_now';
import { MarketTrendSlide }   from './slides/market_trend';
import { SignalSlide }        from './slides/signal';
import { OffplanSplitSlide }  from './slides/offplan_split';
import { BuyerSlide }         from './slides/buyer';
import { TopVolumeSlide }     from './slides/top_volume';
import { TopYieldSlide }      from './slides/top_yield';
import { StrategySlide }      from './slides/strategy';
import { ClosingSlide }       from './slides/closing';

export const CINEMATIC_GOLD: Record<SlideType, ComponentType<SlideProps>> = {
  cover:          CoverSlide,
  why_now:        WhyNowSlide,
  market_trend:   MarketTrendSlide,
  signal:         SignalSlide,
  offplan_split:  OffplanSplitSlide,
  buyer:          BuyerSlide,
  top_volume:     TopVolumeSlide,
  top_yield:      TopYieldSlide,
  strategy:       StrategySlide,
  closing:        ClosingSlide,
};

export const CINEMATIC_GOLD_META = {
  slug: 'cinematic-gold',
  name: 'Cinematic Gold',
  tagline: 'Warm golden-hour photography · Cormorant + Inter · slow Ken Burns',
  best_for: 'Team and client briefs',
} as const;
