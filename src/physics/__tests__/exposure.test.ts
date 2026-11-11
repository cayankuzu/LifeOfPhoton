import { describe, expect, it } from 'vitest';
import {
  type MeterInput,
  EXPOSURE_MAX_EV,
  EXPOSURE_MIN_EV,
  meterLnExposure,
  toExposureValue,
  typicalLuminance,
} from '../exposure';
import { BETA_MAX, RAPIDITY_MAX, headOnDopplerFactor, lorentzFactor } from '../kinematics';
import { sharedAtlas } from '../spectralAtlas';

const DEG = Math.PI / 180;

/** Vertical field of view of the ×1 lens, and the aspect ratio of a typical window. */
const STANDARD_FOV = 65 * DEG;
const ASPECT = 1.6;

/** Field of view of a lens that magnifies `zoom` times; the camera has a ×1, a ×3 and a ×10 lens. */
const lensFov = (zoom: number): number => 2 * Math.atan(Math.tan(STANDARD_FOV / 2) / zoom);
const ZOOMS = [1, 3, 10];

const atlas = sharedAtlas();

const LN_MIN = EXPOSURE_MIN_EV * Math.LN2;
const LN_MAX = EXPOSURE_MAX_EV * Math.LN2;

/** Head-on Doppler factor at the top of the simulated range, ≈ 447. */
const D0_MAX = headOnDopplerFactor(BETA_MAX);

/** The view all others are variations of: dead ahead through the ×1 lens, as seen, thermal emission on. */
const AHEAD: Omit<MeterInput, 'beta'> = {
  yaw: 0,
  pitch: 0,
  fieldOfView: STANDARD_FOV,
  aspect: ASPECT,
  optical: true,
  thermal: true,
};

/** Natural logarithm of the metered exposure at speed β; `view` replaces parts of {@link AHEAD}. */
function meterLn(beta: number, view: Partial<MeterInput> = {}): number {
  return meterLnExposure(atlas, { ...AHEAD, ...view, beta });
}

/** The same in exposure values (stops). */
function meterEv(beta: number, view: Partial<MeterInput> = {}): number {
  return toExposureValue(meterLn(beta, view));
}

describe('luminance of the generic street scene', () => {
  const rest = typicalLuminance(atlas, 1, false);

  it('is positive and finite at every Doppler factor of the simulated range, so that its logarithm can be metered', () => {
    for (let i = 0; i <= 200; i++) {
      // from 1/D₀ (directly behind) to D₀ (dead ahead) at the top of the range, in equal steps of ln D
      const doppler = D0_MAX ** (i / 100 - 1);
      for (const thermal of [true, false]) {
        const luminance = typicalLuminance(atlas, doppler, thermal);
        expect(Number.isFinite(luminance)).toBe(true);
        expect(luminance).toBeGreaterThan(0);
      }
    }
  });

  it('lets the surroundings glow only once they are blueshifted to red heat', () => {
    // A 288 K body emits no visible light: at rest the thermal term must not change a single digit.
    expect(typicalLuminance(atlas, 1, true) / rest).toBeCloseTo(1, 12);
    // At D = 2 the surroundings look like a body of 576 K, still below the ≈ 800 K at which glowing becomes
    // visible (the Draper point): less than 10⁻⁴ of the reflected light (measured 3 × 10⁻⁷).
    for (const doppler of [0.5, 1.5, 2]) {
      const reflected = typicalLuminance(atlas, doppler, false);
      expect(typicalLuminance(atlas, doppler, true) / reflected - 1).toBeLessThan(1e-4);
    }
    // At D = 5 they look like a body of 1440 K and outshine everything they reflect: by two orders of
    // magnitude at least (measured: a factor of 870).
    expect(typicalLuminance(atlas, 5, true)).toBeGreaterThan(100 * typicalLuminance(atlas, 5, false));
  });

  it('goes dark on the red side', () => {
    // The spectrum of the street LEDs is band-limited, so a redshift moves all of it into the infrared, and
    // the 4100 K moonlight slides down its Wien tail. At D = 0.5 less than a thousandth of the luminance at
    // rest is left (measured 6 × 10⁻⁵).
    expect(typicalLuminance(atlas, 0.5, true) / rest).toBeLessThan(1e-3);
  });

  it('spans more than eleven decades between rest and dead ahead at the top of the range', () => {
    // the figure with which exposure.ts and the dossier justify an automatic exposure (measured: 11.98)
    expect(Math.log10(typicalLuminance(atlas, D0_MAX, true) / rest)).toBeGreaterThan(11);
  });

  it('keeps brightening with the blueshift beyond the window of the street lighting', () => {
    // From D = 2 on every source left in view is thermal (4100 K moonlight, the 288 K surroundings). At
    // Doppler factor D a black body looks like one of D times its temperature, and the luminance of a black
    // body rises with its temperature without limit.
    let previous = typicalLuminance(atlas, 2, true);
    for (let i = 1; i <= 200; i++) {
      const luminance = typicalLuminance(atlas, 2 * (D0_MAX / 2) ** (i / 200), true);
      expect(luminance).toBeGreaterThan(previous);
      previous = luminance;
    }
  });
});

describe('meter at rest and in the measured view', () => {
  it('asks for exactly the rest exposure at β = 0, wherever the camera looks', () => {
    for (const yaw of [-180, -90, -20, 0, 45, 135]) {
      for (const pitch of [-80, 0, 30]) {
        for (const zoom of ZOOMS) {
          for (const thermal of [true, false]) {
            expect(meterLn(0, { yaw: yaw * DEG, pitch: pitch * DEG, fieldOfView: lensFov(zoom), thermal })).toBe(0);
          }
        }
      }
    }
  });

  it('asks for exactly the rest exposure in the measured view, where nothing is Doppler shifted', () => {
    for (const beta of [0.5, 0.99, BETA_MAX]) {
      for (const yaw of [-180, -20, 0, 90]) {
        for (const zoom of ZOOMS) {
          for (const thermal of [true, false]) {
            expect(meterLn(beta, { yaw: yaw * DEG, fieldOfView: lensFov(zoom), thermal, optical: false })).toBe(0);
          }
        }
      }
    }
  });

  it('treats speeds outside the simulated range like its two ends', () => {
    // β ≥ 1 would otherwise give an infinite Doppler factor and NaN for the direction of motion
    for (const beta of [1, 1.5, 1e9]) expect(meterLn(beta)).toBe(meterLn(BETA_MAX));
    for (const beta of [-0.5, Number.NaN, Number.NEGATIVE_INFINITY]) expect(meterLn(beta)).toBe(0);
  });
});

describe('metering law', () => {
  /** A lens with a vanishing field of view: every sample of the metering grid looks in the same direction. */
  const pencil = (beta: number, yaw: number, pitch: number, thermal: boolean): number =>
    meterLn(beta, { yaw, pitch, thermal, fieldOfView: 0 });

  it('sets the exposure to the reciprocal of the luminance in view', () => {
    // exposure × luminance = luminance at rest, where the luminance in view follows from the angle θ′ between
    // the line of sight and the direction of motion through the textbook Doppler factor D = 1/(γ(1 − β cos θ′)).
    const rest = typicalLuminance(atlas, 1, false);
    let lit = 0;
    for (const beta of [0.1, 0.3, 0.6, 0.9, 0.99]) {
      const gamma = lorentzFactor(beta);
      for (const yaw of [0, 10, 30, 60, 90, 120, 180, -45]) {
        for (const pitch of [0, 20, -35, 70]) {
          const doppler = 1 / (gamma * (1 - beta * Math.cos(yaw * DEG) * Math.cos(pitch * DEG)));
          for (const thermal of [true, false]) {
            const relative = typicalLuminance(atlas, doppler, thermal) / rest;
            // glare far above the rest level is deliberately not followed all the way: not part of this law
            if (relative > 100) continue;
            // … and no view is exposed beyond the upper limit of the adaptation
            const expected = Math.min(LN_MAX, -Math.log(relative));
            // 12 digits: only rounding separates the meter's form of the Doppler factor from the textbook's
            // (measured 2 × 10⁻¹⁴)
            expect(pencil(beta, yaw * DEG, pitch * DEG, thermal)).toBeCloseTo(expected, 12);
            if (expected < LN_MAX) lit++;
          }
        }
      }
    }
    // most of the sample (203 of 317 views) must test the law itself, not the limit
    expect(lit).toBeGreaterThan(150);
  });

  it('needs no correction along the neutral cone, at any speed', () => {
    for (const beta of [0.05, 0.3, 0.9, 0.9999, BETA_MAX]) {
      // tan(θ′/2) = e^(−φ/2): the directions in which the light arrives unshifted
      const cone = 2 * Math.atan(Math.exp(-Math.atanh(beta) / 2));
      // 1e-9: the rounding error of D is amplified by D₀ ≤ 447 and by the steepness of the luminance near
      // D = 1 (about D⁸), which leaves it far below this (measured 8 × 10⁻¹⁴)
      expect(Math.abs(pencil(beta, cone, 0, true))).toBeLessThan(1e-9);
      expect(Math.abs(pencil(beta, -cone, 0, false))).toBeLessThan(1e-9);
      expect(Math.abs(pencil(beta, 0, cone, true))).toBeLessThan(1e-9);
    }
  });
});

describe('limits of the adaptation', () => {
  it('stays finite and within [EXPOSURE_MIN_EV, EXPOSURE_MAX_EV] at every speed, direction, lens and thermal setting', () => {
    // the rest exposure itself must lie inside the range
    expect(EXPOSURE_MIN_EV).toBeLessThan(0);
    expect(EXPOSURE_MAX_EV).toBeGreaterThan(0);
    const offenders: string[] = [];
    for (const beta of [1e-6, 1e-3, 0.1, 0.5, 0.9, 0.99, 0.999, 0.9999, BETA_MAX]) {
      for (let yaw = -180; yaw <= 180; yaw += 30) {
        for (const pitch of [-89, -40, 0, 15, 60]) {
          for (const zoom of ZOOMS) {
            for (const thermal of [true, false]) {
              const value = meterLn(beta, { yaw: yaw * DEG, pitch: pitch * DEG, fieldOfView: lensFov(zoom), thermal });
              // written so that NaN fails as well
              if (!(value >= LN_MIN && value <= LN_MAX)) {
                offenders.push(`β=${beta} yaw=${yaw}° pitch=${pitch}° ×${zoom} thermal=${thermal}: ${value}`);
              }
            }
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('dependence on speed', () => {
  it('joins the rest exposure without a step: the correction is of first order in β', () => {
    // In every direction |ln D| ≤ β, and near D = 1 the luminance of the street varies as D⁶ (blue side) to
    // D⁸ (red side): D⁴ from the transformation of radiance, the rest from the LED spectrum sliding across
    // V(λ). Hence |EV| ≲ 8β/ln 2 ≈ 11.5β; measured: 11.3β at most (straight back through the ×10 lens).
    // The bound of 15β leaves room for another lamp spectrum, but none for an offset as β → 0.
    for (const beta of [1e-6, 1e-4, 1e-3]) {
      for (const yaw of [0, 60, 90, 180]) {
        for (const zoom of ZOOMS) {
          for (const thermal of [true, false]) {
            const correction = meterEv(beta, { yaw: yaw * DEG, fieldOfView: lensFov(zoom), thermal });
            expect(Math.abs(correction)).toBeLessThan(15 * beta);
          }
        }
      }
    }
  });

  it('stops down slightly towards the blueshift and opens up towards the redshift at low speed', () => {
    // A small blueshift brightens the street (radiance grows as D⁴, and the phosphor band moves onto the
    // peak of V(λ)); a small redshift dims it.
    for (const beta of [0.01, 0.05, 0.1]) {
      for (const zoom of ZOOMS) {
        expect(meterEv(beta, { fieldOfView: lensFov(zoom) })).toBeLessThan(0);
        expect(meterEv(beta, { yaw: Math.PI, fieldOfView: lensFov(zoom) })).toBeGreaterThan(0);
      }
    }
  });

  it('changes by less than half a stop between neighbouring speeds', () => {
    // 400 equal steps of rapidity from rest to the top of the range, looking ahead. A sample direction that
    // grows dark leaves the average gradually (its weight falls between two levels of luminance), so the
    // meter is continuous; a sharp threshold would let a whole ring of the grid drop out at once and make the
    // exposure jump by up to a stop between two neighbouring speeds, however fine the sweep. Measured: 0.25 EV
    // with thermal emission and 0.21 EV without it, near β = 0.995, where the rapidity changes by 0.015 per step.
    const steps = 400;
    for (const thermal of [true, false]) {
      let previous = meterEv(0, { thermal });
      let largest = 0;
      for (let i = 1; i <= steps; i++) {
        const value = meterEv(Math.tanh((i / steps) * RAPIDITY_MAX), { thermal });
        largest = Math.max(largest, Math.abs(value - previous));
        previous = value;
      }
      expect(largest).toBeLessThan(0.5);
    }
  });

  it('changes by a small fraction of a stop when the camera turns a little', () => {
    // The same at a fixed speed, turning the camera from straight ahead to straight back in steps of 0.05°.
    // A sharp threshold made the exposure jump by up to 0.77 EV in one such step (at β = 0.99, 35.55°); measured
    // now: 0.10 EV at most (β = 0.999).
    for (const beta of [0.5, 0.9, 0.99, 0.999]) {
      for (const thermal of [true, false]) {
        let previous = meterEv(beta, { thermal });
        let largest = 0;
        for (let i = 1; i <= 3600; i++) {
          const value = meterEv(beta, { yaw: i * 0.05 * DEG, thermal });
          largest = Math.max(largest, Math.abs(value - previous));
          previous = value;
        }
        expect(largest, `β = ${beta}, thermal ${thermal}`).toBeLessThan(0.15);
      }
    }
  });
});

describe('symmetry', () => {
  it('does not tell left from right', () => {
    // The Doppler factor depends only on the angle from the direction of motion, and the metering grid is
    // its own mirror image. 12 digits: the mirrored view adds the same terms in another order (measured
    // 4 × 10⁻¹⁵).
    for (const beta of [0.1, 0.9, 0.99, BETA_MAX]) {
      for (const yaw of [5, 45, 90, 170]) {
        for (const pitch of [-30, 0, 15]) {
          for (const thermal of [true, false]) {
            const left = meterLn(beta, { yaw: yaw * DEG, pitch: pitch * DEG, thermal });
            const right = meterLn(beta, { yaw: -yaw * DEG, pitch: pitch * DEG, thermal });
            expect(right).toBeCloseTo(left, 12);
          }
        }
      }
    }
  });
});

describe('thermal emission of the surroundings', () => {
  it('is invisible to the meter up to half the speed of light', () => {
    // At β = 0.5 the largest Doppler factor in view is D₀ = √3: the surroundings look like a body of 500 K,
    // far too cold to glow. 10⁻⁶ EV is nothing on any display (measured 2 × 10⁻⁹).
    for (const beta of [0.1, 0.3, 0.5]) {
      for (const yaw of [0, 45, 90, 180]) {
        for (const zoom of ZOOMS) {
          const view = { yaw: yaw * DEG, fieldOfView: lensFov(zoom) };
          expect(Math.abs(meterEv(beta, { ...view, thermal: true }) - meterEv(beta, { ...view, thermal: false }))).toBeLessThan(
            1e-6
          );
        }
      }
    }
  });

  it('never makes the camera open up', () => {
    // Thermal emission only adds light. It does so where the view is blueshifted by more than D ≈ 2.5, and
    // those directions are lit by moonlight in any case, so it brightens lit directions without turning
    // dark ones into dim lit ones — the one way in which more light could raise an average over the lit
    // part of the view. 1e-12 allows for rounding (measured: never above).
    for (const beta of [0.3, 0.7, 0.9, 0.95, 0.99, 0.999, 0.9999, BETA_MAX]) {
      for (let yaw = 0; yaw <= 180; yaw += 20) {
        for (const pitch of [-60, 0, 25]) {
          for (const zoom of ZOOMS) {
            const view = { yaw: yaw * DEG, pitch: pitch * DEG, fieldOfView: lensFov(zoom) };
            expect(meterLn(beta, { ...view, thermal: true })).toBeLessThanOrEqual(
              meterLn(beta, { ...view, thermal: false }) + 1e-12
            );
          }
        }
      }
    }
  });

  it('makes the camera stop down when it looks ahead at high speed', () => {
    // From β = 0.9 on the direction of motion is blueshifted by D₀ ≥ 4.4: there the surroundings glow at
    // 1250 K and more, brighter than anything moonlight can do (measured: 0.12 to 8.6 EV less exposure).
    for (const beta of [0.9, 0.95, 0.99, 0.999, 0.9999, BETA_MAX]) {
      for (const zoom of ZOOMS) {
        const fieldOfView = lensFov(zoom);
        expect(meterEv(beta, { fieldOfView, thermal: true })).toBeLessThan(meterEv(beta, { fieldOfView, thermal: false }));
      }
    }
  });

  it('stops the camera down by more than ten stops once the glow fills the field of view', () => {
    // Through the ×10 lens every direction in the frame is then more than 20 000 times as bright as the street
    // at rest; at β = 0.99 it is 4 × 10⁶ times in the corners and 4 × 10⁸ times in the centre, 22 to 28 stops.
    // The meter follows glare up to a ceiling only and asks for −11.55 EV; ten stops is the round figure
    // below what it does.
    for (const beta of [0.95, 0.99, 0.999]) {
      expect(meterEv(beta, { fieldOfView: lensFov(10) })).toBeLessThan(-10);
    }
  });
});

describe('darkness', () => {
  it('opens up all the way when nothing in view is lit: looking back, and sideways at high speed', () => {
    // Behind the observer, and at high speed everywhere outside a narrow cone around the direction of
    // motion, the light is redshifted. The band-limited light of the street LEDs is shifted out of the
    // visible band altogether and the moonlight fades down its Wien tail, so no direction in view counts as
    // lit and the meter returns its upper limit exactly.
    for (const zoom of ZOOMS) {
      for (const thermal of [true, false]) {
        const view = { fieldOfView: lensFov(zoom), thermal };
        for (const beta of [0.5, 0.9, 0.99, BETA_MAX]) {
          expect(meterLn(beta, { ...view, yaw: Math.PI })).toBe(LN_MAX);
        }
        for (const beta of [0.99, 0.9999, BETA_MAX]) {
          expect(meterLn(beta, { ...view, yaw: Math.PI / 2 })).toBe(LN_MAX);
          expect(meterLn(beta, { ...view, yaw: -Math.PI / 2 })).toBe(LN_MAX);
        }
      }
    }
  });

  it('opens up most of the way when it looks ahead at the top of the range without thermal emission', () => {
    // At β = 0.9999 everything further than about 11° from the direction of motion is too red to count as
    // lit, at the top of the range everything beyond about 6°. Of the 63 directions sampled in the standard
    // field of view three are then lit (the centre by blueshifted moonlight, the two next to it by the red
    // edge of the LED ring), at the top of the range only the centre, so the meter opens up more than
    // half-way to its limit (measured +1.91 and +1.96 EV) — but not all the way, because something is
    // still lit.
    for (const beta of [0.9999, BETA_MAX]) {
      const correction = meterEv(beta, { thermal: false });
      expect(correction).toBeGreaterThan(EXPOSURE_MAX_EV / 2);
      expect(correction).toBeLessThan(EXPOSURE_MAX_EV);
    }
  });
});

describe('exposure value', () => {
  it('counts doublings of the exposure', () => {
    expect(toExposureValue(Math.LN2)).toBe(1);
    expect(toExposureValue(0)).toBe(0);
    expect(toExposureValue(Math.log(1 / 8))).toBeCloseTo(-3, 12);
    expect(toExposureValue(LN_MAX)).toBeCloseTo(EXPOSURE_MAX_EV, 12);
  });
});
