import type { ComponentType } from 'react';
import type { FigureId } from '../types';
import AberrationFigure from './AberrationFigure';
import ColourTracksFigure from './ColourTracksFigure';
import GainFigure from './GainFigure';
import type { FigureProps } from './kit';
import LorentzFigure from './LorentzFigure';
import PipelineFigure from './PipelineFigure';
import SpectraFigure from './SpectraFigure';
import SpeedScaleFigure from './SpeedScaleFigure';

/** Figure components by the identifier the content uses. */
export const FIGURES: Record<FigureId, ComponentType<FigureProps>> = {
  lorentz: LorentzFigure,
  aberration: AberrationFigure,
  spectra: SpectraFigure,
  gain: GainFigure,
  colourTracks: ColourTracksFigure,
  pipeline: PipelineFigure,
  speedScale: SpeedScaleFigure,
};
