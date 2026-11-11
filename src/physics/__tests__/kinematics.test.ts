import { describe, expect, it } from 'vitest';
import {
  BETA_MAX,
  RAPIDITY_MAX,
  betaFromLorentzFactor,
  betaFromRapidity,
  betaToControl,
  boostBy,
  clampBeta,
  composeVelocities,
  controlToBeta,
  headOnDopplerFactor,
  hyperbolicJourney,
  kinematicState,
  kineticEnergyPerRestEnergy,
  lorentzFactor,
  rapidityFromBeta,
} from '../kinematics';

describe('Lorentz factor', () => {
  it('reproduces the canonical values', () => {
    expect(lorentzFactor(0)).toBe(1);
    expect(lorentzFactor(0.5)).toBeCloseTo(2 / Math.sqrt(3), 12);
    expect(lorentzFactor(Math.sqrt(3) / 2)).toBeCloseTo(2, 12);
    expect(lorentzFactor(0.6)).toBeCloseTo(1.25, 12);
    expect(lorentzFactor(0.8)).toBeCloseTo(5 / 3, 12);
    expect(lorentzFactor(0.99)).toBeCloseTo(7.088812050083354, 9);
    expect(lorentzFactor(0.99999)).toBeCloseTo(223.60735676962747, 6);
  });

  it('inverts exactly', () => {
    for (const beta of [0.001, 0.1, 0.5, 0.9, 0.999, 0.99999]) {
      expect(betaFromLorentzFactor(lorentzFactor(beta))).toBeCloseTo(beta, 12);
    }
    expect(betaFromLorentzFactor(1)).toBe(0);
  });

  it('satisfies γ²(1 − β²) = 1 to machine precision near the limit', () => {
    const beta = 1 - 1e-12;
    const gamma = lorentzFactor(beta);
    // 1 − β² evaluated without cancellation
    expect(gamma * gamma * (1 - beta) * (1 + beta)).toBeCloseTo(1, 12);
  });
});

describe('rapidity', () => {
  it('is additive under collinear boosts while velocities are not', () => {
    const pairs: Array<[number, number]> = [
      [0.5, 0.5],
      [0.9, 0.9],
      [0.3, 0.99],
    ];
    for (const [a, b] of pairs) {
      const composed = composeVelocities(a, b);
      expect(composed).toBeLessThan(1);
      expect(rapidityFromBeta(composed)).toBeCloseTo(rapidityFromBeta(a) + rapidityFromBeta(b), 12);
    }
    expect(composeVelocities(0.5, 0.5)).toBeCloseTo(0.8, 14);
  });

  it('gives the head-on Doppler factor D₀ = e^φ = γ(1 + β)', () => {
    for (const beta of [0, 0.2, 0.8660254037844386, 0.99, BETA_MAX]) {
      const d0 = headOnDopplerFactor(beta);
      expect(d0).toBeCloseTo(Math.exp(rapidityFromBeta(beta)), 9);
      expect(d0).toBeCloseTo(lorentzFactor(beta) * (1 + beta), 9);
    }
    expect(headOnDopplerFactor(0.6)).toBeCloseTo(2, 14);
    expect(headOnDopplerFactor(BETA_MAX)).toBeCloseTo(447.2125, 3);
  });

  it('round-trips through tanh/artanh', () => {
    expect(betaFromRapidity(RAPIDITY_MAX)).toBeCloseTo(BETA_MAX, 12);
    expect(RAPIDITY_MAX).toBeCloseTo(6.103033822, 8);
  });
});

describe('kinetic energy', () => {
  it('reduces to ½β² in the Newtonian limit without cancellation', () => {
    for (const beta of [1e-3, 1e-6, 1e-9]) {
      const exact = kineticEnergyPerRestEnergy(beta);
      expect(exact / (0.5 * beta * beta)).toBeCloseTo(1, 5);
    }
  });

  it('equals γ − 1', () => {
    expect(kineticEnergyPerRestEnergy(0.8660254037844386)).toBeCloseTo(1, 12);
    expect(kineticEnergyPerRestEnergy(0.99)).toBeCloseTo(lorentzFactor(0.99) - 1, 10);
  });
});

describe('speed control mapping', () => {
  it('spans exactly the simulated range', () => {
    expect(controlToBeta(0)).toBe(0);
    expect(controlToBeta(1)).toBeCloseTo(BETA_MAX, 12);
    expect(controlToBeta(-3)).toBe(0);
    expect(controlToBeta(7)).toBeCloseTo(BETA_MAX, 12);
    expect(controlToBeta(Number.NaN)).toBe(0);
  });

  it('is strictly monotonic and invertible', () => {
    let previous = -1;
    for (let i = 0; i <= 1000; i++) {
      const s = i / 1000;
      const beta = controlToBeta(s);
      expect(beta).toBeGreaterThan(previous);
      previous = beta;
      expect(betaToControl(beta)).toBeCloseTo(s, 9);
    }
  });

  it('places the regimes where the design intends', () => {
    expect(betaToControl(0.5)).toBeCloseTo(0.3, 2);
    expect(betaToControl(Math.sqrt(3) / 2)).toBeCloseTo(0.4645, 3);
    expect(betaToControl(0.99)).toBeCloseTo(0.6585, 3);
  });
});

describe('boost steps', () => {
  it('compose like velocities', () => {
    const step = 0.05;
    let beta = 0;
    for (let i = 0; i < 20; i++) beta = boostBy(beta, step);
    expect(beta).toBeCloseTo(Math.tanh(1), 12);
    expect(boostBy(0.5, 0)).toBeCloseTo(0.5, 14);
    expect(boostBy(0.3, -5)).toBe(0);
    expect(boostBy(0.9, 50)).toBe(BETA_MAX);
  });
});

describe('clampBeta', () => {
  it('rejects non-finite and out-of-range input', () => {
    expect(clampBeta(Number.NaN)).toBe(0);
    expect(clampBeta(Number.POSITIVE_INFINITY)).toBe(0);
    expect(clampBeta(-0.2)).toBe(0);
    expect(clampBeta(1)).toBe(BETA_MAX);
  });
});

describe('kinematic state', () => {
  it('is internally consistent', () => {
    for (const beta of [0, 0.1, 0.5, 0.8660254037844386, 0.99, BETA_MAX]) {
      const k = kinematicState(beta);
      expect(k.contraction * k.gamma).toBeCloseTo(1, 12);
      expect(k.clockRate).toBe(k.contraction);
      expect(k.dopplerAhead * k.dopplerBehind).toBeCloseTo(1, 12);
      expect(k.properVelocity).toBeCloseTo(Math.sinh(k.rapidity), 8);
      expect(k.gamma).toBeCloseTo(Math.cosh(k.rapidity), 8);
    }
    expect(kinematicState(0.5).speedMetresPerSecond).toBe(149_896_229);
  });
});

describe('hyperbolic motion at 1 g', () => {
  it('reaches the simulated limit after 5.9 years on board and 217 years outside', () => {
    const journey = hyperbolicJourney(RAPIDITY_MAX);
    expect(journey.properTimeYears).toBeCloseTo(5.912, 2);
    expect(journey.coordinateTimeYears).toBeCloseTo(216.61, 1);
    expect(journey.distanceLightYears).toBeCloseTo(215.64, 1);
  });

  it('reduces to x = ½at² for small rapidity', () => {
    const journey = hyperbolicJourney(1e-6);
    const newtonian = 0.5 * 9.80665 * journey.coordinateTimeSeconds ** 2;
    expect(journey.distanceMetres / newtonian).toBeCloseTo(1, 9);
    expect(journey.properTimeSeconds / journey.coordinateTimeSeconds).toBeCloseTo(1, 9);
  });
});
