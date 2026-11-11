import type { DossierSource } from '../types';
import { EVIDENCE } from './evidence';
import { FOUNDATIONS } from './foundations';
import { FRONT } from './front';
import { METHOD } from './method';

/** The dossier as authored, in both languages. Resolve one language with `localize`. */
export const DOSSIER: DossierSource = {
  ...FRONT,
  sections: [...FOUNDATIONS, ...METHOD, ...EVIDENCE],
};
