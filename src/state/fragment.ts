/**
 * The state of the experiment as a URL fragment, so that any view can be shared
 * and a figure of the dossier can be reproduced by following a link.
 *
 *   b   velocity β = v/c            (absent: at rest)
 *   v   view, "measured"            (absent: what is seen)
 *   t   thermal emission, "0" = off (absent: on)
 *   g   guide layer, "0" = off      (absent: on)
 *   z   lens, 3 or 10               (absent: ×1)
 *   l   language, "tr" or "en"
 *
 * The fragment lists only what differs from the defaults, so a key that is absent
 * means the default — except for the language, which is a preference of the reader
 * rather than part of the experiment and is therefore only ever set explicitly.
 */

import { clampBeta } from '@/physics/kinematics';
import { type Lens, type Settings, DEFAULT_SETTINGS, LENSES } from './simulation';

/** The part of the settings a fragment describes. */
export type SharedState = Pick<Settings, 'beta' | 'view' | 'thermal' | 'guides' | 'lens'> & Partial<Pick<Settings, 'language'>>;

/** Significant figures of β kept in a link: enough to tell 0.99999 from the limit. */
const BETA_FIGURES = 7;

/** Reads a fragment (with or without the leading "#"). Anything malformed falls back to the default. */
export function decodeFragment(fragment: string): SharedState {
  const params = new URLSearchParams(fragment.replace(/^#/, ''));
  const beta = Number(params.get('b'));
  const lens = Number(params.get('z'));
  const language = params.get('l');
  return {
    beta: params.has('b') && Number.isFinite(beta) ? clampBeta(beta) : DEFAULT_SETTINGS.beta,
    view: params.get('v') === 'measured' ? 'measured' : DEFAULT_SETTINGS.view,
    thermal: params.get('t') !== '0',
    guides: params.get('g') !== '0',
    lens: (LENSES as readonly number[]).includes(lens) ? (lens as Lens) : DEFAULT_SETTINGS.lens,
    ...(language === 'tr' || language === 'en' ? { language } : {}),
  };
}

/** Writes the settings as a fragment, without the leading "#". */
export function encodeFragment(settings: Settings): string {
  const params = new URLSearchParams();
  if (settings.beta > 0) params.set('b', String(Number(settings.beta.toPrecision(BETA_FIGURES))));
  if (settings.view !== DEFAULT_SETTINGS.view) params.set('v', settings.view);
  if (!settings.thermal) params.set('t', '0');
  if (!settings.guides) params.set('g', '0');
  if (settings.lens !== DEFAULT_SETTINGS.lens) params.set('z', String(settings.lens));
  params.set('l', settings.language);
  return params.toString();
}
