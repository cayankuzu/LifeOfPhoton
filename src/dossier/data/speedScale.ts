/**
 * Real objects on the speed scale.
 *
 * Each marker gives the kinetic energy per rest energy, γ − 1, which is the
 * quantity that keeps growing when β saturates. Values and sources were verified
 * for the dossier (see references.ts); where the source gives an energy, γ is
 * computed here from the rest energy so that the arithmetic is visible.
 */

import { ELECTRON_REST_ENERGY_MEV, MUON_REST_ENERGY_MEV, PROTON_REST_ENERGY_MEV, SPEED_OF_LIGHT } from '@/physics/constants';
import { BETA_MAX, lorentzFactor } from '@/physics/kinematics';
import { L, type Bilingual } from '../types';

export interface SpeedMarker {
  readonly id: string;
  /** Full description, for the table. */
  readonly label: Bilingual;
  /** Short name, for the figure. */
  readonly short: Bilingual | string;
  /** γ − 1. */
  readonly excess: number;
  /** Citation key in references.ts, or null for the simulation's own limit. */
  readonly source: string | null;
  /** A lower bound rather than a value. */
  readonly bound?: boolean;
  /** Significant figures of γ that the source warrants (default 4). */
  readonly gammaFigures?: number;
  /** Decimals of β that the source warrants, for β < 0.999 (default 4). */
  readonly betaDecimals?: number;
}

/** γ − 1 from a speed in km/s, accurate for β ≪ 1 (series) and for any β. */
function excessFromSpeed(kilometresPerSecond: number): number {
  const beta = (kilometresPerSecond * 1000) / SPEED_OF_LIGHT;
  const beta2 = beta * beta;
  return beta < 0.01 ? 0.5 * beta2 + 0.375 * beta2 * beta2 : lorentzFactor(beta) - 1;
}

/** γ − 1 of a particle from its kinetic energy. */
const excessFromKineticEnergy = (kineticMeV: number, restMeV: number): number => kineticMeV / restMeV;

/** γ − 1 of a particle from its total energy. */
const excessFromTotalEnergy = (totalMeV: number, restMeV: number): number => totalMeV / restMeV - 1;

/** γ − 1 of a particle from its momentum (in MeV/c). */
const excessFromMomentum = (momentumMeV: number, restMeV: number): number => Math.hypot(momentumMeV, restMeV) / restMeV - 1;

export const SPEED_MARKERS: readonly SpeedMarker[] = [
  {
    id: 'earth',
    short: L('Dünya', 'Earth'),
    label: L('Dünya, yörüngesinde (29,78 km s⁻¹)', 'Earth in its orbit (29.78 km s⁻¹)'),
    excess: excessFromSpeed(29.78),
    source: 'williams2024',
  },
  {
    id: 'parker',
    short: 'Parker',
    label: L('Parker Solar Probe, 24 Aralık 2024 (192 km s⁻¹)', 'Parker Solar Probe, 24 Dec 2024 (192 km s⁻¹)'),
    excess: excessFromSpeed(192.2),
    source: 'nasa2024',
  },
  {
    id: 'cmb',
    short: L('Güneş–KMA', 'Sun–CMB'),
    label: L('Güneş Sistemi, KMA’ya göre (369,8 km s⁻¹)', 'Solar System relative to the CMB (369.8 km s⁻¹)'),
    excess: excessFromSpeed(369.82),
    source: 'planck2018i',
  },
  {
    id: 'lithium',
    short: 'Li⁺',
    label: L('ESR halkasındaki Li⁺ iyonları (β = 0,338)', 'Li⁺ ions in the ESR storage ring (β = 0.338)'),
    excess: lorentzFactor(0.338) - 1,
    source: 'botermann2014',
    gammaFigures: 5,
    betaDecimals: 3,
  },
  {
    id: 'linac4',
    short: 'Linac4',
    label: L('Linac4 çıkışında H⁻ iyonları (160 MeV)', 'H⁻ ions leaving Linac4 (160 MeV)'),
    // an H⁻ ion is a proton with two electrons (binding energies are negligible here)
    excess: excessFromKineticEnergy(160, PROTON_REST_ENERGY_MEV + 2 * ELECTRON_REST_ENERGY_MEV),
    source: 'cern2024',
  },
  {
    id: 'grs1915',
    short: 'GRS 1915',
    label: L('GRS 1915+105 jetleri (12,5 kpc uzaklık için)', 'Jets of GRS 1915+105 (for a distance of 12.5 kpc)'),
    excess: lorentzFactor(0.92) - 1,
    source: 'mirabel1994',
    gammaFigures: 3,
    betaDecimals: 2,
  },
  {
    id: 'booster',
    short: 'PSB',
    label: L('PS Booster çıkışında protonlar (2 GeV)', 'Protons leaving the PS Booster (2 GeV)'),
    excess: excessFromKineticEnergy(2000, PROTON_REST_ENERGY_MEV),
    source: 'cern2024',
  },
  {
    id: 'm87',
    short: 'M87',
    label: L('M87 jeti', 'Jet of M87'),
    excess: 6 - 1,
    source: 'biretta1999',
    bound: true,
    gammaFigures: 1,
    betaDecimals: 3,
  },
  {
    id: 'frischsmith',
    short: L('μ, dağ', 'μ, mountain'),
    label: L('Mt Washington deneyinin müonları (β = 0,995)', 'Muons of the Mt Washington experiment (β = 0.995)'),
    excess: lorentzFactor(0.9952) - 1,
    source: 'frischsmith1963',
    gammaFigures: 2,
    betaDecimals: 3,
  },
  {
    id: 'ps',
    short: 'PS',
    label: L('PS çıkışında protonlar (26 GeV/c)', 'Protons leaving the PS (26 GeV/c)'),
    excess: excessFromMomentum(26_000, PROTON_REST_ENERGY_MEV),
    source: 'cern2024',
    gammaFigures: 3,
  },
  {
    id: 'storagering',
    short: L('μ halkası', 'μ ring'),
    label: L('CERN müon depolama halkası', 'CERN muon storage ring'),
    excess: 29.33 - 1,
    source: 'bailey1977',
  },
  {
    id: 'cosmicmuon',
    short: L('kozmik μ', 'cosmic μ'),
    label: L('Deniz düzeyinde kozmik ışın müonları (≈ 4 GeV)', 'Cosmic-ray muons at sea level (≈ 4 GeV)'),
    excess: excessFromTotalEnergy(4000, MUON_REST_ENERGY_MEV),
    source: 'pdg2024',
    gammaFigures: 2,
  },
  {
    id: 'pion',
    short: 'π⁰',
    label: L('Alväger deneyinin π⁰ kaynağı (β ≥ 0,99975)', 'π⁰ source of the Alväger experiment (β ≥ 0.99975)'),
    excess: lorentzFactor(0.99975) - 1,
    source: 'alvager1964',
    bound: true,
    gammaFigures: 2,
  },
  {
    id: 'limit',
    short: L('sınır', 'limit'),
    label: L('Simülasyon aralığının üst ucu', 'Top of the simulated range'),
    excess: lorentzFactor(BETA_MAX) - 1,
    source: null,
  },
  {
    id: 'sps',
    short: 'SPS',
    label: L('SPS’de protonlar (450 GeV)', 'Protons in the SPS (450 GeV)'),
    excess: excessFromTotalEnergy(450_000, PROTON_REST_ENERGY_MEV),
    source: 'cern2024',
    gammaFigures: 3,
  },
  {
    id: 'lhc',
    short: 'LHC',
    label: L('LHC’de protonlar (6,8 TeV)', 'Protons in the LHC (6.8 TeV)'),
    excess: excessFromTotalEnergy(6_800_000, PROTON_REST_ENERGY_MEV),
    source: 'cern2024',
  },
  {
    id: 'omg',
    short: L('1991 ışını', '1991 ray'),
    label: L('15 Ekim 1991 kozmik ışını (3,2 × 10²⁰ eV, proton ise)', 'Cosmic ray of 15 Oct 1991 (3.2 × 10²⁰ eV, if a proton)'),
    excess: excessFromTotalEnergy(3.2e14, PROTON_REST_ENERGY_MEV),
    source: 'bird1995',
    gammaFigures: 2,
  },
];

/** 1 − β for a given γ − 1, without cancellation: 1 − β = 1 / (γ² (1 + β)). */
export function oneMinusBeta(excess: number): number {
  const gamma = 1 + excess;
  const beta = Math.sqrt(excess * (excess + 2)) / gamma;
  return 1 / (gamma * gamma * (1 + beta));
}

/** β for a given γ − 1, without cancellation at small speeds. */
export function betaOfExcess(excess: number): number {
  return Math.sqrt(excess * (excess + 2)) / (1 + excess);
}
