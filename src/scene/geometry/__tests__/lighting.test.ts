import { describe, expect, it } from 'vitest';
import { REFERENCE_LUMINANCE_CD_M2, SCENARIO } from '@/physics/scenario';
import {
  CARRIAGEWAY_HALF_WIDTH,
  CHUNK_LENGTH,
  LUMINAIRE_FACE_AREA,
  LUMINAIRE_SPACING,
  LUMINAIRE_X,
  LUMINAIRE_Y,
  ROAD_SURFACE_Y,
  chunkLuminaires,
} from '../layout';
import {
  LUMINAIRE_FACE_LUMINANCE,
  LUMINAIRE_INTENSITY,
  carriagewayIlluminance,
  ledIrradiance,
  luminaireIrradiance,
} from '../lighting';

/** Irradiance of the driving surface at (x, z), in units of the reference illuminance. */
const onRoad = (x: number, z: number): number => ledIrradiance(x, ROAD_SURFACE_Y, z, 0, 1, 0);

describe('photometric design of the street lighting', () => {
  it('the average horizontal illuminance of the carriageway is the reference illuminance', () => {
    // evaluated on a finer grid than the one that fixes the intensity
    const { mean } = carriagewayIlluminance(0.1);
    expect(mean).toBeCloseTo(1, 3);
  });

  it('meets the overall uniformity of lighting class C2 (minimum / average ≥ 0.4)', () => {
    const { uniformity, minimum, maximum } = carriagewayIlluminance(0.1);
    expect(uniformity).toBeGreaterThan(0.4);
    // and it is a real pattern of pools of light, not a flat field
    expect(maximum / minimum).toBeGreaterThan(1.5);
    expect(maximum).toBeLessThan(2.5);
  });

  it('the brightest spot of the road lies below a luminaire, the darkest midway between two pairs', () => {
    const below = onRoad(Math.min(LUMINAIRE_X, CARRIAGEWAY_HALF_WIDTH - 0.05), 9);
    const centreAbreast = onRoad(0, 9);
    const centreMidway = onRoad(0, 0);
    expect(below).toBeGreaterThan(centreAbreast);
    expect(centreAbreast).toBeGreaterThan(centreMidway);
  });

  it('luminaire intensity, face area and face luminance are consistent: I = L·A/π', () => {
    expect((LUMINAIRE_FACE_LUMINANCE * LUMINAIRE_FACE_AREA) / Math.PI).toBeCloseTo(LUMINAIRE_INTENSITY, 10);
    // In customary units: about a thousand candela straight down from a face of about
    // a third of a square metre — a luminance of a few 10³ cd/m², far above anything it lights.
    const intensityCd = LUMINAIRE_INTENSITY * SCENARIO.street.illuminanceLux;
    const luminanceCdM2 = LUMINAIRE_FACE_LUMINANCE * REFERENCE_LUMINANCE_CD_M2;
    expect(intensityCd).toBeGreaterThan(800);
    expect(intensityCd).toBeLessThan(2000);
    expect(luminanceCdM2).toBeGreaterThan(2000);
    expect(luminanceCdM2).toBeLessThan(6000);
    expect(LUMINAIRE_FACE_LUMINANCE).toBeGreaterThan(100);
    // total flux of a diffuse emitter, Φ = π I₀: a road luminaire of a few thousand lumens
    expect(Math.PI * intensityCd).toBeGreaterThan(2500);
    expect(Math.PI * intensityCd).toBeLessThan(6500);
  });
});

describe('a single luminaire', () => {
  it('obeys the inverse-square law', () => {
    // straight below, on a surface facing up: E = I / d²
    for (const d of [2, 4, 6.4, 12]) expect(luminaireIrradiance(0, d, 0, 0, 1, 0)).toBeCloseTo(1 / (d * d), 12);
  });

  it('obeys Lambert’s cosine law', () => {
    // the same point of space, the surface tilted by α away from the luminaire
    const straight = luminaireIrradiance(0, 5, 0, 0, 1, 0);
    for (const alpha of [0.2, 0.7, 1.2, 1.5]) {
      expect(luminaireIrradiance(0, 5, 0, Math.sin(alpha), Math.cos(alpha), 0)).toBeCloseTo(straight * Math.cos(alpha), 12);
    }
    // a surface facing away receives nothing
    expect(luminaireIrradiance(0, 5, 0, 0, -1, 0)).toBe(0);
    expect(luminaireIrradiance(0, 5, 0, 1, 0, 0)).toBe(0);
  });

  /** Intensity towards the direction at `angle` degrees from the nadir: E·d² on a surface facing the luminaire. */
  const intensityTowards = (angle: number): number => {
    const theta = (angle * Math.PI) / 180;
    const dx = 7 * Math.sin(theta);
    const dy = 7 * Math.cos(theta);
    return luminaireIrradiance(dx, dy, 0, dx / 7, dy / 7, 0) * 49;
  };

  it('is a diffuse emitter: its intensity falls off as the cosine of the angle from the nadir', () => {
    // equivalently, the luminance I(θ) / (A cos θ) of the face is the same from every direction
    for (const angle of [0, 20, 45, 60, 80, 89]) {
      expect(intensityTowards(angle)).toBeCloseTo(Math.cos((angle * Math.PI) / 180), 12);
    }
  });

  it('sends no light to the horizontal or above it: the face looks straight down', () => {
    // at exactly 90° the cosine is a rounding error away from zero
    expect(intensityTowards(90)).toBeCloseTo(0, 12);
    for (const angle of [91, 104, 150, 180]) expect(intensityTowards(angle)).toBe(0);
    // a point above the luminaire receives nothing, whatever way it faces
    expect(luminaireIrradiance(1, -2, 0, 0, -1, 0)).toBe(0);
    expect(luminaireIrradiance(1, -2, 0, 1, 0, 0)).toBe(0);
  });

  it('lights a horizontal surface as cos⁴ of the angle from the nadir', () => {
    // the textbook law for a diffuse source over a parallel plane: E = I₀ cos⁴θ / h²
    const h = 6.4;
    for (const angle of [0, 30, 55, 75]) {
      const theta = (angle * Math.PI) / 180;
      expect(luminaireIrradiance(h * Math.tan(theta), h, 0, 0, 1, 0)).toBeCloseTo(Math.cos(theta) ** 4 / (h * h), 12);
    }
  });

  it('is not a point: closer than √1.5 m it is treated as that far away', () => {
    expect(luminaireIrradiance(0, 0.3, 0, 0, 1, 0)).toBeCloseTo(1 / 1.5, 12);
    expect(luminaireIrradiance(0, 1e-9, 0, 0, 1, 0)).toBeCloseTo(1 / 1.5, 12);
  });
});

describe('baked irradiance', () => {
  it('repeats with the spacing of the luminaires and with the block', () => {
    for (const [x, y, z] of [
      [0, ROAD_SURFACE_Y, 2],
      [3.1, ROAD_SURFACE_Y, -7.3],
      [-8, 0.3, 4],
    ]) {
      const here = ledIrradiance(x, y, z, 0, 1, 0);
      // the sum over neighbouring blocks is truncated, hence a small tolerance
      expect(ledIrradiance(x, y, z + LUMINAIRE_SPACING, 0, 1, 0)).toBeCloseTo(here, 2);
      expect(ledIrradiance(x, y, z - CHUNK_LENGTH, 0, 1, 0)).toBeCloseTo(here, 2);
    }
  });

  it('is symmetric about the centre line of the avenue', () => {
    for (const z of [-11, -4, 0, 6.5]) {
      for (const x of [0.5, 2.6, 5.9, 9]) {
        expect(ledIrradiance(-x, ROAD_SURFACE_Y, z, 0, 1, 0)).toBeCloseTo(ledIrradiance(x, ROAD_SURFACE_Y, z, 0, 1, 0), 12);
        // a wall facing the street on either side
        expect(ledIrradiance(-10.7, 3, z, 1, 0, 0)).toBeCloseTo(ledIrradiance(10.7, 3, z, -1, 0, 0), 12);
      }
    }
  });

  it('a surface facing away from every luminaire receives only the diffuse term', () => {
    const ambientAtRoad = ledIrradiance(0, ROAD_SURFACE_Y, 0, 0, -1, 0);
    expect(ambientAtRoad).toBeGreaterThan(0);
    expect(ambientAtRoad).toBeLessThanOrEqual(SCENARIO.ambientLedFraction);
    // the back of a building, facing away from the street
    expect(ledIrradiance(25, 5, 3, 1, 0, 0)).toBeCloseTo(ledIrradiance(25, 5, 3, 0, -1, 0), 12);
  });

  it('the diffuse term decreases with height and never vanishes', () => {
    let previous = Infinity;
    for (const y of [0, 2, 10, 30, 60]) {
      const ambient = ledIrradiance(0, y + 100, 0, 0, -1, 0) * 0 + ledIrradiance(30, y, 0, 1, 0, 0);
      expect(ambient).toBeLessThanOrEqual(previous);
      expect(ambient).toBeGreaterThan(0.4 * SCENARIO.ambientLedFraction);
      previous = ambient;
    }
  });

  it('facades are lit below the luminaires and receive only the diffuse term above them', () => {
    const below = ledIrradiance(10.7, LUMINAIRE_Y - 3, 9, -1, 0, 0);
    expect(below).toBeGreaterThan(0.3);
    for (const height of [0.01, 2, 6, 40]) {
      const above = ledIrradiance(10.7, LUMINAIRE_Y + height, 9, -1, 0, 0);
      expect(above).toBeCloseTo(ledIrradiance(10.7, LUMINAIRE_Y + height, 9, 0, 0, 1), 12);
      expect(above).toBeLessThanOrEqual(SCENARIO.ambientLedFraction);
    }
  });

  it('is finite, non-negative and bounded everywhere, also right at a luminaire', () => {
    const lamp = chunkLuminaires()[0].position;
    for (const offset of [0, 1e-6, 0.01, 0.3]) {
      for (const normal of [
        [0, 1, 0],
        [0, -1, 0],
        [1, 0, 0],
        [0, 0, -1],
      ]) {
        const value = ledIrradiance(lamp[0] + offset, lamp[1] - offset, lamp[2], normal[0], normal[1], normal[2]);
        expect(Number.isFinite(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
        // direct light is capped at three times the reference, plus the diffuse term
        expect(value).toBeLessThanOrEqual(3 + SCENARIO.ambientLedFraction);
      }
    }
  });
});
