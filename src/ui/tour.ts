/**
 * The guided tour of the panel "Why does it look like this?" (src/ui/hud/Explainer.tsx): a few stops
 * from rest to the top of the range, each a state of the simulation (as a "show in the scene" button of
 * the dossier sets it, src/dossier/scenario.ts) and the thing on the screen its text is about (marked as
 * the items of the panel mark theirs, src/ui/pointing.ts). A pure module: the stops and the way between
 * them. The words are in src/i18n/messages.ts (explain.tour); src/ui/__tests__/tour.test.ts checks that
 * each text is true in the state its stop sets.
 */

import type { Scenario } from '@/dossier/types';
import type { Pointing } from './inventory';

export type TourStopId = 'rest' | 'colours' | 'gather' | 'clocks' | 'ring' | 'behind' | 'measured' | 'limit' | 'end';

export interface TourStop {
  readonly id: TourStopId;
  /** The state the stop sets on arrival; null leaves the scene as the stop before put it. */
  readonly scenario: Scenario | null;
  /** What it marks on the screen while it is shown. */
  readonly mark: Pointing;
}

/** β at which γ = 2. */
const GAMMA_TWO = Math.sqrt(3) / 2;

export const TOUR: readonly TourStop[] = [
  // the night avenue as it is, and the way the tour will go
  { id: 'rest', scenario: { beta: 0 }, mark: { scene: 'motion' } },
  // the waves arrive more often: the red signal ahead is seen green
  { id: 'colours', scenario: { beta: 0.2 }, mark: { scene: 'signal' } },
  // things abeam are seen ahead of you; the lamp light dead ahead is ultraviolet; the cars look smaller
  { id: 'gather', scenario: { beta: 0.5 }, mark: { scene: 'transverse' } },
  // γ = 2 on the two clocks of the dock; the surroundings begin to glow ahead
  { id: 'clocks', scenario: { beta: GAMMA_TWO }, mark: { elements: ['properTime', 'streetTime', 'gamma'] } },
  // the forward half of the world inside a small circle, the lamp light only in a ring
  { id: 'ring', scenario: { beta: 0.99 }, mark: { scene: 'ring' } },
  // looking back: the lamp light from behind has gone infrared
  { id: 'behind', scenario: { beta: 0.99, look: 'behind' }, mark: { scene: 'behind', elements: ['behind555'] } },
  // the measured view at γ = 2: everything along the way half as long
  { id: 'measured', scenario: { beta: GAMMA_TWO, view: 'measured' }, mark: { scene: 'grid', elements: ['road100'] } },
  // near the limit, through the ×10 lens: light still arrives at the same speed
  { id: 'limit', scenario: { beta: 0.99999, lens: 10 }, mark: { elements: ['beta', 'lens'] } },
  // over to the reader, at the speed control
  { id: 'end', scenario: null, mark: { elements: ['slider'] } },
];

/** Where the reader is in the tour: the index of a stop, or null outside the tour. */
export type TourPosition = number | null;

export const firstStop = (): number => 0;
export const lastStop = (): number => TOUR.length - 1;
/** The stop after `position`; the last one stays where it is. */
export const nextStop = (position: number): number => Math.min(position + 1, lastStop());
/** The stop before `position`; the first one stays where it is. */
export const previousStop = (position: number): number => Math.max(position - 1, firstStop());
/** Leaving the tour. */
export const endTour = (): TourPosition => null;

export const isFirstStop = (position: number): boolean => position <= firstStop();
export const isLastStop = (position: number): boolean => position >= lastStop();

/** The source by which the tour's mark is told from the marks of the panel's items (src/ui/pointing.ts). */
export const tourSource = (position: number): string => `tour:${TOUR[position].id}`;
