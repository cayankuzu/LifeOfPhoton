import { describe, expect, it } from 'vitest';
import { BETA_MAX, headOnDopplerFactor, lorentzFactor } from '../kinematics';
import {
  type Vec3,
  aberrate,
  aberratePoint,
  apparentAngleOfDoppler,
  bolometricRadianceGain,
  boostUniforms,
  deaberrate,
  deaberrateDirection,
  dopplerFromApparentAngle,
  dopplerFromRestAngle,
  neutralConeAngle,
  solidAngleFactor,
  terrellRotationAngle,
  transversePlaneApparentAngle,
} from '../optics';

const DEG = Math.PI / 180;
const BETAS = [0, 0.05, 0.5, 0.8660254037844386, 0.99, 0.9999, BETA_MAX];
const ANGLES = [0, 1, 17, 45, 90, 135, 170, 179, 180].map((d) => d * DEG);

/** Textbook form of the aberration formula (Einstein 1905, §7). */
const cosApparent = (theta: number, beta: number) => (Math.cos(theta) + beta) / (1 + beta * Math.cos(theta));

describe('aberration', () => {
  it('agrees with cos θ′ = (cos θ + β)/(1 + β cos θ)', () => {
    for (const beta of BETAS) {
      for (const theta of ANGLES) {
        expect(Math.cos(aberrate(theta, beta))).toBeCloseTo(cosApparent(theta, beta), 9);
      }
    }
  });

  it('is the identity at rest and fixes the poles', () => {
    for (const theta of ANGLES) expect(aberrate(theta, 0)).toBeCloseTo(theta, 14);
    for (const beta of BETAS) {
      expect(aberrate(0, beta)).toBe(0);
      expect(aberrate(Math.PI, beta)).toBeCloseTo(Math.PI, 12);
    }
  });

  it('inverts exactly', () => {
    for (const beta of BETAS) {
      for (const theta of ANGLES) {
        expect(deaberrate(aberrate(theta, beta), beta)).toBeCloseTo(theta, 8);
      }
    }
  });

  it('moves the transverse plane to cos θ′ = β', () => {
    expect(transversePlaneApparentAngle(0.5) / DEG).toBeCloseTo(60, 10);
    expect(transversePlaneApparentAngle(Math.sqrt(3) / 2) / DEG).toBeCloseTo(30, 10);
    expect(transversePlaneApparentAngle(0.99) / DEG).toBeCloseTo(8.1096, 3);
    expect(transversePlaneApparentAngle(BETA_MAX) / DEG).toBeCloseTo(0.25624, 4);
    for (const beta of BETAS) expect(Math.cos(transversePlaneApparentAngle(beta))).toBeCloseTo(beta, 10);
  });

  it('pulls even the rear hemisphere forward', () => {
    expect(aberrate(135 * DEG, 0.99) / DEG).toBeCloseTo(19.42, 1);
    expect(aberrate(170 * DEG, 0.99) / DEG).toBeCloseTo(78.07, 1);
    expect(aberrate(170 * DEG, BETA_MAX) / DEG).toBeCloseTo(2.928, 2);
  });
});

describe('Doppler factor', () => {
  it('is the same number whichever angle it is computed from', () => {
    for (const beta of BETAS) {
      const gamma = lorentzFactor(beta);
      for (const theta of ANGLES) {
        const apparent = aberrate(theta, beta);
        const fromRest = dopplerFromRestAngle(theta, beta);
        expect(fromRest / (gamma * (1 + beta * Math.cos(theta)))).toBeCloseTo(1, 7);
        expect(dopplerFromApparentAngle(apparent, beta) / fromRest).toBeCloseTo(1, 7);
      }
    }
  });

  it('equals D₀ ahead, 1/D₀ behind and 1/γ at θ′ = 90° (transverse Doppler effect)', () => {
    for (const beta of BETAS) {
      const d0 = headOnDopplerFactor(beta);
      expect(dopplerFromApparentAngle(0, beta)).toBeCloseTo(d0, 9);
      expect(dopplerFromApparentAngle(Math.PI, beta) * d0).toBeCloseTo(1, 9);
      expect(dopplerFromApparentAngle(Math.PI / 2, beta) * lorentzFactor(beta)).toBeCloseTo(1, 9);
    }
  });

  it('is 1 on the neutral cone tan(θ′/2) = e^(−φ/2), which is θ = π − θ′ in the rest frame', () => {
    for (const beta of BETAS.slice(1)) {
      const cone = neutralConeAngle(beta);
      expect(dopplerFromApparentAngle(cone, beta)).toBeCloseTo(1, 10);
      expect(deaberrate(cone, beta)).toBeCloseTo(Math.PI - cone, 8);
      const gamma = lorentzFactor(beta);
      expect(Math.cos(cone)).toBeCloseTo(Math.sqrt((gamma - 1) / (gamma + 1)), 9);
    }
    expect(neutralConeAngle(0) / DEG).toBeCloseTo(90, 12);
    expect(neutralConeAngle(0.99) / DEG).toBeCloseTo(29.82, 1);
    expect(neutralConeAngle(BETA_MAX) / DEG).toBeCloseTo(5.415, 2);
    // small-angle law for γ ≫ 1
    expect(neutralConeAngle(BETA_MAX) / Math.sqrt(2 / lorentzFactor(BETA_MAX))).toBeCloseTo(1, 2);
  });

  it('can be inverted for the cone of any Doppler factor', () => {
    for (const beta of BETAS.slice(1)) {
      for (const theta of [5, 30, 90, 150].map((d) => d * DEG)) {
        const d = dopplerFromApparentAngle(theta, beta);
        expect(apparentAngleOfDoppler(d, beta)).toBeCloseTo(theta, 6);
      }
    }
    expect(apparentAngleOfDoppler(1, 0)).toBeNaN();
    expect(apparentAngleOfDoppler(100, 0.5)).toBeNaN();
  });
});

describe('conformality (Penrose 1959)', () => {
  it('scales both the polar and the azimuthal direction by 1/D', () => {
    const h = 1e-6;
    for (const beta of [0.3, 0.8660254037844386, 0.99, 0.9999]) {
      for (const theta of [10, 60, 90, 140, 175].map((d) => d * DEG)) {
        const d = dopplerFromRestAngle(theta, beta);
        const polar = (aberrate(theta + h, beta) - aberrate(theta - h, beta)) / (2 * h);
        const azimuthal = Math.sin(aberrate(theta, beta)) / Math.sin(theta);
        expect(polar * d).toBeCloseTo(1, 5);
        expect(azimuthal * d).toBeCloseTo(1, 7);
        expect(solidAngleFactor(d)).toBeCloseTo(polar * azimuthal, 5);
      }
    }
  });

  it('maps a small circle on the sky to a circle (a sphere always looks round)', () => {
    // A cap of angular radius ρ centred off-axis: its image must be equidistant from a common centre.
    const beta = 0.95;
    const centre = 70 * DEG;
    const rho = 4 * DEG;
    const u = boostUniforms(beta);
    const points: Vec3[] = [];
    for (let k = 0; k < 24; k++) {
      const psi = (k / 24) * 2 * Math.PI;
      // rotate the cap pole (θ = centre, φ = 0) — rim point in the frame where forward is −z
      const sinT = Math.sin(centre);
      const cosT = Math.cos(centre);
      const x = Math.cos(rho) * sinT + Math.sin(rho) * Math.cos(psi) * cosT;
      const y = Math.sin(rho) * Math.sin(psi);
      const f = Math.cos(rho) * cosT - Math.sin(rho) * Math.cos(psi) * sinT;
      points.push(aberratePoint({ x, y, z: -f }, u).position);
    }
    // A circle on the unit sphere is a planar section: every image point must lie in
    // the plane through three of them.
    const sub = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
    const e1 = sub(points[8], points[0]);
    const e2 = sub(points[16], points[0]);
    const n = { x: e1.y * e2.z - e1.z * e2.y, y: e1.z * e2.x - e1.x * e2.z, z: e1.x * e2.y - e1.y * e2.x };
    const length = Math.hypot(n.x, n.y, n.z);
    for (const p of points) {
      const d = sub(p, points[0]);
      expect(Math.abs(d.x * n.x + d.y * n.y + d.z * n.z) / length).toBeLessThan(1e-13);
    }
    // …and its angular radius has shrunk by the local scale factor 1/D (to first order in ρ).
    // Circumradius of the triangle P0 P8 P16 = planar radius of the image circle.
    const e3 = sub(points[16], points[8]);
    const circumradius =
      (Math.hypot(e1.x, e1.y, e1.z) * Math.hypot(e2.x, e2.y, e2.z) * Math.hypot(e3.x, e3.y, e3.z)) / (2 * length);
    const imageRadius = Math.asin(circumradius);
    expect(Math.abs(imageRadius / (rho / dopplerFromRestAngle(centre, beta)) - 1)).toBeLessThan(0.02);
  });
});

describe('vertex transform (mirror of the GLSL)', () => {
  const sample: Vec3[] = [
    { x: 3, y: 1, z: -40 },
    { x: -12, y: 20, z: -5 },
    { x: 8, y: -1.6, z: 0 },
    { x: 0.5, y: 0.2, z: 60 },
    { x: -15, y: 9, z: 120 },
  ];

  it('is the identity at rest', () => {
    const u = boostUniforms(0);
    for (const p of sample) {
      const out = aberratePoint(p, u);
      expect(out.position.x).toBeCloseTo(p.x, 12);
      expect(out.position.y).toBeCloseTo(p.y, 12);
      expect(out.position.z).toBeCloseTo(p.z, 12);
      expect(out.doppler).toBeCloseTo(1, 14);
    }
  });

  it('keeps the distance, turns the direction by the aberration formula and reports the right Doppler factor', () => {
    for (const beta of BETAS) {
      const u = boostUniforms(beta);
      for (const p of sample) {
        const r = Math.hypot(p.x, p.y, p.z);
        const theta = Math.acos(-p.z / r);
        const out = aberratePoint(p, u);
        const q = out.position;
        expect(Math.hypot(q.x, q.y, q.z) / r).toBeCloseTo(1, 9);
        expect(-q.z / r).toBeCloseTo(cosApparent(theta, beta), 9);
        expect(out.doppler / dopplerFromRestAngle(theta, beta)).toBeCloseTo(1, 9);
        // azimuth about the direction of motion is unchanged
        expect(Math.atan2(q.y, q.x)).toBeCloseTo(Math.atan2(p.y, p.x), 9);
      }
    }
  });

  it('is inverted by the per-pixel transform of the sky shader', () => {
    for (const beta of BETAS) {
      const u = boostUniforms(beta);
      for (const p of sample) {
        const r = Math.hypot(p.x, p.y, p.z);
        const forward = aberratePoint(p, u);
        const unit = { x: forward.position.x / r, y: forward.position.y / r, z: forward.position.z / r };
        const back = deaberrateDirection(unit, u);
        expect(back.direction.x).toBeCloseTo(p.x / r, 7);
        expect(back.direction.y).toBeCloseTo(p.y / r, 7);
        expect(back.direction.z).toBeCloseTo(p.z / r, 7);
        expect(back.doppler / forward.doppler).toBeCloseTo(1, 7);
      }
    }
  });

  it('handles points exactly on the axis of motion', () => {
    const u = boostUniforms(0.99);
    const ahead = aberratePoint({ x: 0, y: 0, z: -10 }, u);
    expect(ahead.position.z).toBeCloseTo(-10, 12);
    expect(ahead.doppler).toBeCloseTo(headOnDopplerFactor(0.99), 9);
    const behind = aberratePoint({ x: 0, y: 0, z: 10 }, u);
    expect(behind.position.z).toBeCloseTo(10, 12);
    expect(behind.doppler * headOnDopplerFactor(0.99)).toBeCloseTo(1, 9);
    expect(aberratePoint({ x: 0, y: 0, z: 0 }, u).doppler).toBe(1);
  });
});

describe('single-precision conditioning at the top of the range', () => {
  const f = Math.fround;
  const beta = BETA_MAX;
  const u = boostUniforms(beta);

  /** What a shader would compute if it evaluated the textbook formula in float32. */
  const naiveCosApparent = (theta: number): number => {
    const c = f(Math.cos(theta));
    const b = f(beta);
    return f(f(c + b) / f(1 + f(b * c)));
  };

  it('the stereographic form stays accurate where the textbook form loses all digits', () => {
    for (const degrees of [150, 170, 179, 179.9, 179.99]) {
      const theta = degrees * DEG;
      const r = 80;
      const p = { x: f(r * Math.sin(theta)), y: 0, z: f(-r * Math.cos(theta)) };
      // reference in double precision from the same (already rounded) input point
      const exact = aberratePoint(p, u);
      const single = aberratePoint(p, u, f);
      const exactAngle = Math.atan2(Math.hypot(exact.position.x, exact.position.y), -exact.position.z);
      const singleAngle = Math.atan2(Math.hypot(single.position.x, single.position.y), -single.position.z);
      expect(Math.abs(singleAngle - exactAngle)).toBeLessThan(2e-5);
      expect(Math.abs(single.doppler / exact.doppler - 1)).toBeLessThan(2e-5);
    }
  });

  it('the textbook form in float32 is visibly wrong near the backward direction', () => {
    const theta = 179.9 * DEG;
    const exact = aberrate(theta, beta);
    const naive = Math.acos(Math.min(1, Math.max(-1, naiveCosApparent(theta))));
    const naiveError = Math.abs(naive - exact);
    // a quarter of a degree is several pixels on screen …
    expect(naiveError / DEG).toBeGreaterThan(0.2);
    // … and more than a hundred times the error of the form the shaders use
    expect(naiveError).toBeGreaterThan(100 * 2e-5);
  });
});

describe('radiance and appearance', () => {
  it('gives the bolometric gain D⁴', () => {
    expect(bolometricRadianceGain(2)).toBe(16);
    expect(bolometricRadianceGain(0.5)).toBe(0.0625);
  });

  it('gives the Terrell rotation sin α = β', () => {
    expect(terrellRotationAngle(0)).toBe(0);
    expect(terrellRotationAngle(0.5) / DEG).toBeCloseTo(30, 10);
    expect(terrellRotationAngle(Math.sqrt(3) / 2) / DEG).toBeCloseTo(60, 10);
    expect(terrellRotationAngle(1.2) / DEG).toBeCloseTo(90, 10);
  });
});
