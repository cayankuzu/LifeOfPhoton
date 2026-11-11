/**
 * Relativistic kinematics of the observer.
 *
 * Conventions: β = v/c ∈ [0, 1); γ = (1 − β²)^(−1/2); rapidity φ = artanh β.
 * The head-on Doppler factor D₀ = e^φ = √((1+β)/(1−β)) is the single number that
 * governs all of the observer's optics (see optics.ts).
 *
 * References: Einstein (1905), Ann. Phys. 17, 891; Taylor & Wheeler (1992),
 * Spacetime Physics; Rindler (2006), Relativity, §3.
 */

import { JULIAN_YEAR_SECONDS, LIGHT_YEAR_METRES, SPEED_OF_LIGHT, STANDARD_GRAVITY } from './constants';

/** Upper end of the simulated range. A massive observer can approach but never reach β = 1. */
export const BETA_MAX = 0.99999;

/** Rapidity at the upper end of the simulated range, φ_max = artanh(β_max) ≈ 6.1030. */
export const RAPIDITY_MAX = Math.atanh(BETA_MAX);

/** Clamps an arbitrary number into the simulated velocity range [0, β_max]. */
export function clampBeta(beta: number): number {
  if (!Number.isFinite(beta)) return 0;
  return Math.min(BETA_MAX, Math.max(0, beta));
}

/**
 * Lorentz factor γ = 1/√(1 − β²).
 * Evaluated as 1/√((1 − β)(1 + β)) so that no significance is lost as β → 1.
 */
export function lorentzFactor(beta: number): number {
  return 1 / Math.sqrt((1 - beta) * (1 + beta));
}

/** Inverse of {@link lorentzFactor}: β = √((γ − 1)(γ + 1)) / γ. */
export function betaFromLorentzFactor(gamma: number): number {
  if (!(gamma > 1)) return 0;
  return Math.sqrt((gamma - 1) * (gamma + 1)) / gamma;
}

/** Rapidity φ = artanh β. Rapidities add under collinear boosts; velocities do not. */
export function rapidityFromBeta(beta: number): number {
  return Math.atanh(beta);
}

/** β = tanh φ. */
export function betaFromRapidity(rapidity: number): number {
  return Math.tanh(rapidity);
}

/** Head-on Doppler factor D₀ = √((1+β)/(1−β)) = e^φ = γ(1+β). */
export function headOnDopplerFactor(beta: number): number {
  return Math.sqrt((1 + beta) / (1 - beta));
}

/** Einstein velocity addition for collinear velocities: β = (β₁ + β₂)/(1 + β₁β₂). */
export function composeVelocities(beta1: number, beta2: number): number {
  return (beta1 + beta2) / (1 + beta1 * beta2);
}

/**
 * Kinetic energy in units of the rest energy, T/(mc²) = γ − 1.
 * Written as β²γ²/(γ + 1) so the Newtonian limit ½β² is recovered without cancellation.
 */
export function kineticEnergyPerRestEnergy(beta: number): number {
  const gamma = lorentzFactor(beta);
  return (beta * beta * gamma * gamma) / (gamma + 1);
}

/** Everything the instruments display that follows from β alone. */
export interface KinematicState {
  /** v/c */
  readonly beta: number;
  /** 1 − β, kept separately because it is the well-conditioned quantity near the limit */
  readonly oneMinusBeta: number;
  /** Lorentz factor γ */
  readonly gamma: number;
  /** Rapidity φ = artanh β */
  readonly rapidity: number;
  /** Head-on Doppler factor D₀ = e^φ (light arriving from dead ahead) */
  readonly dopplerAhead: number;
  /** Doppler factor of light arriving from directly behind, 1/D₀ */
  readonly dopplerBehind: number;
  /** Speed in m/s */
  readonly speedMetresPerSecond: number;
  /** Proper velocity (celerity) γβ, in units of c: rest-frame distance covered per unit proper time */
  readonly properVelocity: number;
  /** Length contraction factor L/L₀ = 1/γ */
  readonly contraction: number;
  /** Clock rate dτ/dt = 1/γ */
  readonly clockRate: number;
}

/** Derives the complete kinematic state from β (clamped into the simulated range). */
export function kinematicState(rawBeta: number): KinematicState {
  const beta = clampBeta(rawBeta);
  const gamma = lorentzFactor(beta);
  const dopplerAhead = headOnDopplerFactor(beta);
  return {
    beta,
    oneMinusBeta: 1 - beta,
    gamma,
    rapidity: rapidityFromBeta(beta),
    dopplerAhead,
    dopplerBehind: 1 / dopplerAhead,
    speedMetresPerSecond: beta * SPEED_OF_LIGHT,
    properVelocity: gamma * beta,
    contraction: 1 / gamma,
    clockRate: 1 / gamma,
  };
}

// ---------------------------------------------------------------------------
// Speed control mapping
// ---------------------------------------------------------------------------

/**
 * Maps the normalised position s ∈ [0, 1] of the speed control to a velocity:
 *
 *     β(s) = tanh(φ_max · s²)
 *
 * The control is therefore linear in √φ. Linear-in-rapidity would be the "pure"
 * choice (equal steps = equal boosts) but crowds the whole 0 → 0.87c range, where
 * the geometry changes most, into the first fifth of the travel; the square
 * spreads the regimes evenly (0.5c at 30 %, γ = 2 at 46 %, 0.99c at 66 %) while
 * staying smooth, strictly monotonic and analytically invertible.
 */
export function controlToBeta(position: number): number {
  const s = Math.min(1, Math.max(0, Number.isFinite(position) ? position : 0));
  return clampBeta(Math.tanh(RAPIDITY_MAX * s * s));
}

/** Exact inverse of {@link controlToBeta}: s = √(artanh β / φ_max). */
export function betaToControl(beta: number): number {
  return Math.min(1, Math.sqrt(Math.atanh(clampBeta(beta)) / RAPIDITY_MAX));
}

/**
 * Applies a boost of rapidity Δφ on top of the current velocity (collinear).
 * This is what one notch of the scroll wheel or one key press does, so that
 * every step is the same physical boost regardless of the current speed.
 */
export function boostBy(beta: number, deltaRapidity: number): number {
  return clampBeta(Math.tanh(Math.atanh(clampBeta(beta)) + deltaRapidity));
}

// ---------------------------------------------------------------------------
// Hyperbolic motion (constant proper acceleration)
// ---------------------------------------------------------------------------

/** How long a rocket with constant proper acceleration needs to reach a given rapidity. */
export interface HyperbolicJourney {
  /** Proper time on board, s: τ = (c/a)·φ */
  readonly properTimeSeconds: number;
  /** Coordinate time in the launch frame, s: t = (c/a)·sinh φ */
  readonly coordinateTimeSeconds: number;
  /** Distance covered in the launch frame, m: x = (c²/a)(cosh φ − 1) */
  readonly distanceMetres: number;
  /** Same quantities in years / light-years for display */
  readonly properTimeYears: number;
  readonly coordinateTimeYears: number;
  readonly distanceLightYears: number;
}

/**
 * Hyperbolic motion from rest with constant proper acceleration a
 * (Misner, Thorne & Wheeler 1973, §6.2; Rindler 2006, §3.7):
 * φ(τ) = aτ/c, t = (c/a) sinh φ, x = (c²/a)(cosh φ − 1).
 */
export function hyperbolicJourney(rapidity: number, properAcceleration: number = STANDARD_GRAVITY): HyperbolicJourney {
  const cOverA = SPEED_OF_LIGHT / properAcceleration;
  const half = Math.sinh(rapidity / 2);
  const properTimeSeconds = cOverA * rapidity;
  const coordinateTimeSeconds = cOverA * Math.sinh(rapidity);
  // cosh φ − 1 = 2 sinh²(φ/2): no cancellation for small φ
  const distanceMetres = SPEED_OF_LIGHT * cOverA * 2 * half * half;
  return {
    properTimeSeconds,
    coordinateTimeSeconds,
    distanceMetres,
    properTimeYears: properTimeSeconds / JULIAN_YEAR_SECONDS,
    coordinateTimeYears: coordinateTimeSeconds / JULIAN_YEAR_SECONDS,
    distanceLightYears: distanceMetres / LIGHT_YEAR_METRES,
  };
}
