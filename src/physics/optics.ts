/**
 * Relativistic optics of a moving observer: aberration, Doppler factor and the
 * transformation of radiance.
 *
 * Setting. S is the rest frame of the scene. The observer moves through it with
 * velocity β along the unit vector f ("forward"). A light ray reaches the observer
 * from the direction n (unit vector pointing from the observer towards the source,
 * measured in S); θ is the angle between n and f. In the observer's own frame S′
 * the same ray arrives from n′ at angle θ′ from f.
 *
 *   Aberration (Einstein 1905, §7):   cos θ′ = (cos θ + β) / (1 + β cos θ)
 *   Half-angle (stereographic) form:  tan(θ′/2) = e^(−φ) · tan(θ/2)
 *
 * (Einstein states the law for the direction of propagation, with minus signs; the
 * form above is the same law for the direction one looks in.)
 *   Doppler factor:                    D = ν′/ν = γ(1 + β cos θ) = 1 / (γ(1 − β cos θ′))
 *
 * The half-angle form shows that a boost acts on the celestial sphere as a pure
 * dilation of the Riemann sphere — a conformal, circle-preserving map with local
 * angular scale 1/D (Terrell 1959; Penrose 1959). It is also the numerically stable form: every expression below is a sum of
 * positive terms, so nothing cancels as β → 1.
 */

import { headOnDopplerFactor, lorentzFactor } from './kinematics';

// ---------------------------------------------------------------------------
// Scalar relations between angles
// ---------------------------------------------------------------------------

/**
 * Apparent angle θ′ (observer frame) of a ray whose rest-frame angle from the
 * direction of motion is θ. Both in radians, 0 = dead ahead.
 */
export function aberrate(thetaRest: number, beta: number): number {
  const d0 = headOnDopplerFactor(beta);
  return 2 * Math.atan2(Math.sin(thetaRest / 2), d0 * Math.cos(thetaRest / 2));
}

/** Inverse aberration: rest-frame angle θ of a ray seen at apparent angle θ′. */
export function deaberrate(thetaApparent: number, beta: number): number {
  const d0 = headOnDopplerFactor(beta);
  return 2 * Math.atan2(d0 * Math.sin(thetaApparent / 2), Math.cos(thetaApparent / 2));
}

/** Doppler factor D = ν′/ν of a ray with rest-frame angle θ: D = D₀cos²(θ/2) + sin²(θ/2)/D₀. */
export function dopplerFromRestAngle(thetaRest: number, beta: number): number {
  const d0 = headOnDopplerFactor(beta);
  const c = Math.cos(thetaRest / 2);
  const s = Math.sin(thetaRest / 2);
  return d0 * c * c + (s * s) / d0;
}

/** Doppler factor of a ray seen at apparent angle θ′: 1/D = cos²(θ′/2)/D₀ + D₀ sin²(θ′/2). */
export function dopplerFromApparentAngle(thetaApparent: number, beta: number): number {
  const d0 = headOnDopplerFactor(beta);
  const c = Math.cos(thetaApparent / 2);
  const s = Math.sin(thetaApparent / 2);
  return 1 / ((c * c) / d0 + d0 * s * s);
}

/**
 * Apparent half-angle of the cone on which the Doppler factor equals `doppler`.
 * Inside the cone light is shifted by more than `doppler`, outside by less.
 * Returns NaN when the requested factor is outside [1/D₀, D₀] (or at β = 0, where
 * D = 1 in every direction and no cone exists).
 */
export function apparentAngleOfDoppler(doppler: number, beta: number): number {
  const d0 = headOnDopplerFactor(beta);
  const span = d0 - 1 / d0;
  if (!(span > 0)) return Number.NaN;
  const sinSquared = (1 / doppler - 1 / d0) / span;
  if (sinSquared < -1e-12 || sinSquared > 1 + 1e-12) return Number.NaN;
  return 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, sinSquared))));
}

/**
 * Apparent half-angle of the neutral cone D = 1, the boundary between blueshift
 * (inside) and redshift (outside): tan(θ′/2) = e^(−φ/2). The same rays have
 * rest-frame angle π − θ′. Tends to 90° as β → 0 and to √(2/γ) for γ ≫ 1.
 */
export function neutralConeAngle(beta: number): number {
  return 2 * Math.atan(1 / Math.sqrt(headOnDopplerFactor(beta)));
}

/** Apparent angle at which the rest-frame transverse plane (θ = 90°) is seen: cos θ′ = β. */
export function transversePlaneApparentAngle(beta: number): number {
  return aberrate(Math.PI / 2, beta);
}

/** Factor by which a small solid angle shrinks under aberration: dΩ′/dΩ = 1/D². */
export function solidAngleFactor(doppler: number): number {
  return 1 / (doppler * doppler);
}

/**
 * Terrell rotation. An object of small angular size in uniform motion that is seen
 * at right angles to its velocity (θ′ = 90° in the observer's frame) looks rotated
 * by α with sin α = β rather than contracted (Terrell 1959; the rule is spelled out
 * by Weisskopf 1960). It does not hold for objects that fill a large solid angle
 * (Boas 1961; Scott & Viner 1965).
 */
export function terrellRotationAngle(beta: number): number {
  return Math.asin(Math.min(1, Math.max(0, beta)));
}

// ---------------------------------------------------------------------------
// Radiance
// ---------------------------------------------------------------------------

/**
 * Transformation of radiance. The photon phase-space density is Lorentz invariant,
 * hence I_ν/ν³ is invariant (Rybicki & Lightman 1979, §4.9):
 *
 *   spectral radiance per unit frequency   I′_ν′(ν′) = D³ · I_ν(ν′/D)
 *   spectral radiance per unit wavelength  I′_λ′(λ′) = D⁵ · I_λ(D·λ′)
 *   frequency-integrated radiance          I′ = D⁴ · I
 *   unresolved point source (flux)         F′ = D² · F      (because dΩ′ = dΩ/D²)
 *
 * A Planck spectrum of temperature T therefore stays a Planck spectrum, of
 * temperature D·T (Peebles & Wilkinson 1968).
 */
export const RADIANCE_EXPONENT = {
  perUnitFrequency: 3,
  perUnitWavelength: 5,
  bolometric: 4,
  pointSourceBolometricFlux: 2,
} as const;

/** Bolometric (all-wavelength) radiance gain, D⁴. */
export function bolometricRadianceGain(doppler: number): number {
  const d2 = doppler * doppler;
  return d2 * d2;
}

// ---------------------------------------------------------------------------
// Vector form — line-for-line mirror of the GLSL in src/scene/shaders
// ---------------------------------------------------------------------------

/** Minimal immutable 3-vector used by the reference implementation and the tests. */
export interface Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** Double-precision uniforms handed to the shaders. Computed once per frame on the CPU. */
export interface BoostUniforms {
  /** 1 + β */
  readonly onePlusBeta: number;
  /** 1 − β (kept separate: the GPU works in float32 and could not form it accurately) */
  readonly oneMinusBeta: number;
  /** γ */
  readonly gamma: number;
}

export function boostUniforms(beta: number): BoostUniforms {
  return { onePlusBeta: 1 + beta, oneMinusBeta: 1 - beta, gamma: lorentzFactor(beta) };
}

/** Result of transforming one scene point into the observer's view. */
export interface AberratedPoint {
  /** Position relative to the observer in the apparent (observer-frame) direction, at the rest-frame distance */
  readonly position: Vec3;
  /** Doppler factor of the ray */
  readonly doppler: number;
}

/**
 * Splits 1 ± cos θ without cancellation, given a displacement whose component along
 * the direction of motion is `forward`, whose squared perpendicular distance is
 * `perp2` and whose length is `r`. Uses 1 − cos θ = sin²θ / (1 + cos θ) on the side
 * where the direct difference would cancel.
 */
function onePlusMinusCos(forward: number, perp2: number, r: number, round: (v: number) => number): [number, number] {
  if (forward >= 0) {
    const plus = round(round(r + forward) / r);
    const minus = round(perp2 / round(r * round(r + forward)));
    return [plus, minus];
  }
  const minus = round(round(r - forward) / r);
  const plus = round(perp2 / round(r * round(r - forward)));
  return [plus, minus];
}

/**
 * Reference implementation of the vertex transform used by the city shader.
 *
 * `rel` is the rest-frame displacement from the observer to a scene point; the
 * observer moves along −Z (so "forward" = −rel.z), exactly as in the scene. With
 *
 *     a = (1 + β)(1 + cos θ),   b = (1 − β)(1 − cos θ)
 *
 * the Doppler factor is D = γ(a + b)/2 and the apparent position is
 *
 *     x′ = x / D,   y′ = y / D,   forward′ = r · (a − b)/(a + b)
 *
 * which keeps |rel′| = |rel| (so depth ordering along every ray is preserved) and
 * reproduces cos θ′ = (cos θ + β)/(1 + β cos θ) exactly.
 *
 * Pass `Math.fround` as `round` to emulate the GPU's float32 arithmetic.
 */
export function aberratePoint(rel: Vec3, u: BoostUniforms, round: (v: number) => number = (v) => v): AberratedPoint {
  const forward = round(-rel.z);
  const perp2 = round(round(rel.x * rel.x) + round(rel.y * rel.y));
  const r = round(Math.sqrt(round(perp2 + round(forward * forward))));
  if (!(r > 0)) return { position: { x: 0, y: 0, z: 0 }, doppler: 1 };

  const [plus, minus] = onePlusMinusCos(forward, perp2, r, round);
  const a = round(round(u.onePlusBeta) * plus);
  const b = round(round(u.oneMinusBeta) * minus);
  const sum = round(a + b);
  const doppler = round(round(0.5 * round(u.gamma)) * sum);
  const forwardApparent = round(r * round(round(a - b) / sum));
  return {
    position: { x: round(rel.x / doppler), y: round(rel.y / doppler), z: round(-forwardApparent) },
    doppler,
  };
}

/** Result of tracing one view direction of the observer back into the rest frame. */
export interface DeaberratedDirection {
  /** Unit direction in the rest frame from which the light arrived */
  readonly direction: Vec3;
  /** Doppler factor of the ray */
  readonly doppler: number;
}

/**
 * Reference implementation of the per-pixel inverse transform used by the sky shader:
 * given the unit view direction n′ in the observer frame, returns the rest-frame
 * direction n and the Doppler factor. With a′ = (1 − β)(1 + cos θ′) and
 * b′ = (1 + β)(1 − cos θ′): D = 2/(γ(a′ + b′)), cos θ = (a′ − b′)/(a′ + b′) and the
 * transverse components scale by D.
 */
export function deaberrateDirection(
  dirApparent: Vec3,
  u: BoostUniforms,
  round: (v: number) => number = (v) => v
): DeaberratedDirection {
  const forward = round(-dirApparent.z);
  const perp2 = round(round(dirApparent.x * dirApparent.x) + round(dirApparent.y * dirApparent.y));
  const [plus, minus] = onePlusMinusCos(forward, perp2, 1, round);
  const a = round(round(u.oneMinusBeta) * plus);
  const b = round(round(u.onePlusBeta) * minus);
  const sum = round(a + b);
  const doppler = round(2 / round(round(u.gamma) * sum));
  const cosRest = round(round(a - b) / sum);
  return {
    direction: {
      x: round(dirApparent.x * doppler),
      y: round(dirApparent.y * doppler),
      z: round(-cosRest),
    },
    doppler,
  };
}

// ---------------------------------------------------------------------------
// Measured view — what the observer's frame says is where, at one instant
// ---------------------------------------------------------------------------

/**
 * Reference implementation of the measured view of the city and star shaders. On the
 * observer's surface of simultaneity the scene, moving at β along +Z past an observer
 * who travels along −Z, is Lorentz contracted along the motion and nothing else:
 *
 *     x′ = x,   y′ = y,   z′ = z / γ
 *
 * for a rest-frame displacement `rel` from the observer. The city shader moves its
 * vertices so; the star shader uses the direction of the result.
 */
export function measuredPoint(rel: Vec3, gamma: number): Vec3 {
  return { x: rel.x, y: rel.y, z: rel.z / gamma };
}

/**
 * Inverse of measuredPoint for directions, as the sky shader evaluates it per pixel:
 * the unit rest-frame direction whose contracted image lies along the unit view
 * direction `dir`, the normalised (x, y, γ z).
 */
export function measuredDirectionInverse(dir: Vec3, gamma: number): Vec3 {
  const z = dir.z * gamma;
  const length = Math.hypot(dir.x, dir.y, z);
  return { x: dir.x / length, y: dir.y / length, z: z / length };
}
