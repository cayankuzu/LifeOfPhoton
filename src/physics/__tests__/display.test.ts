import { describe, expect, it } from 'vitest';
import { DISPLAY_TRANSFORM } from '@/scene/shaders/chunks';
import { type Triple, LUMINANCE_WEIGHTS, compressToGamut, encodeSrgb, relativeLuminance } from '../colorimetry';
import { HIGHLIGHT_SLOPE, compressHighlight, filmic, toCss, toDisplay, toneMap } from '../display';

const scaled = (colour: Triple, factor: number): Triple => [colour[0] * factor, colour[1] * factor, colour[2] * factor];

/** A saturated orange, such as the glow of a body at about 2000 K. */
const ORANGE: Triple = [1, 0.3, 0.05];

/** Colours of positive luminance that the transform must handle alike. */
const COLOURS: Triple[] = [
  [1, 1, 1], // neutral
  ORANGE,
  [0.05, 0.3, 1], // saturated blue
  [0.2, 1, 0.1], // saturated green
  [1.4, -0.3, 0.2], // outside the display gamut: negative green
  [-0.2, 0.9, 1.3], // outside the display gamut: negative red
];

describe('filmic curve', () => {
  it('maps black to black, never leaves [0, 1] and ignores negative input', () => {
    expect(filmic(0)).toBe(0);
    // The rational function itself is negative just below zero (−6 × 10⁻⁴ at x = −0.005) and tends to 1.03
    // for large negative x; neither may reach the screen.
    for (const x of [-1e-9, -0.005, -1, -1e6]) expect(filmic(x)).toBe(0);
    for (let exponent = -12; exponent <= 12; exponent += 0.25) {
      const value = filmic(10 ** exponent);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it('rises strictly until it reaches 1 at x ≈ 7.24 and stays there', () => {
    // 2.51x² + 0.03x = 2.43x² + 0.59x + 0.14 at x = 7.2417; beyond it the fit would overshoot towards its
    // asymptote 2.51/2.43. The cubic spacing puts most of the samples into the toe.
    let previous = 0;
    for (let i = 1; i <= 400; i++) {
      const value = filmic(7.24 * (i / 400) ** 3);
      expect(value).toBeGreaterThan(previous);
      previous = value;
    }
    expect(previous).toBeLessThan(1);
    for (const x of [7.25, 8, 100, 1e6, 1e12]) expect(filmic(x)).toBe(1);
  });

  it('has a toe and a shoulder: convex below a single inflection near x = 0.12, concave above it', () => {
    const curvature = (x: number): number => filmic(x + 1e-3) - 2 * filmic(x) + filmic(x - 1e-3);
    for (const x of [0.005, 0.02, 0.05, 0.1]) expect(curvature(x)).toBeGreaterThan(0);
    for (const x of [0.15, 0.3, 1, 3, 7]) expect(curvature(x)).toBeLessThan(0);
    // the toe darkens deep shadows, the shoulder holds the reference white below display white
    expect(filmic(0.01)).toBeLessThan(0.01);
    expect(filmic(1)).toBeLessThan(1);
  });
});

describe('highlight compression', () => {
  it('leaves luminance up to the reference white untouched', () => {
    for (const luminance of [0, 1e-6, 0.18, 0.5, 1]) expect(compressHighlight(luminance)).toBe(luminance);
  });

  it('continues without a step above the reference white, with the slope dropping from 1 to HIGHLIGHT_SLOPE', () => {
    // 1 + s·ln(1 + ε) = 1 + s·ε − s·ε²/2: with ε = 10⁻⁶ the quotient is s to better than 10⁻⁶
    expect((compressHighlight(1 + 1e-6) - 1) / 1e-6).toBeCloseTo(HIGHLIGHT_SLOPE, 5);
  });

  it('adds HIGHLIGHT_SLOPE for every factor of e in luminance', () => {
    for (const luminance of [1, 2, 10, 1e5, 1e11]) {
      expect(compressHighlight(Math.E * luminance) - compressHighlight(luminance)).toBeCloseTo(HIGHLIGHT_SLOPE, 12);
    }
  });

  it('maps twelve decades above the reference white to the range 1 … 6', () => {
    // the figure quoted where the slope is defined: 1 + 0.18 · ln 10¹² = 5.97
    expect(compressHighlight(1e12)).toBeCloseTo(1 + 12 * Math.LN10 * HIGHLIGHT_SLOPE, 12);
    expect(Math.round(compressHighlight(1e12))).toBe(6);
  });

  it('is strictly increasing', () => {
    let previous = compressHighlight(1e-6);
    for (let exponent = -5.75; exponent <= 13; exponent += 0.25) {
      const value = compressHighlight(10 ** exponent);
      expect(value).toBeGreaterThan(previous);
      previous = value;
    }
  });
});

describe('toneMap', () => {
  it('shows nothing for light without luminance', () => {
    expect(toneMap([0, 0, 0])).toEqual([0, 0, 0]);
    expect(toneMap([-1, -1, -1])).toEqual([0, 0, 0]);
    // a positive red channel, but negative luminance
    expect(relativeLuminance([1, -1, 0])).toBeLessThan(0);
    expect(toneMap([1, -1, 0])).toEqual([0, 0, 0]);
    // an undefined radiance must not reach the screen as NaN
    expect(toneMap([Number.NaN, 1, 1])).toEqual([0, 0, 0]);
  });

  it('applies the filmic curve channel by channel to colours inside the gamut and below the reference white', () => {
    const colours: Triple[] = [
      [0.2, 0.5, 0.7],
      [0.02, 0.01, 0.3],
      [0.9, 0.9, 0.9],
    ];
    for (const colour of colours) {
      expect(relativeLuminance(colour)).toBeLessThan(1);
      expect(toneMap(colour)).toEqual([filmic(colour[0]), filmic(colour[1]), filmic(colour[2])]);
    }
  });

  it('keeps neutral input neutral at every level', () => {
    for (let exponent = -6; exponent <= 14; exponent++) {
      const grey = 10 ** exponent;
      const [r, g, b] = toneMap([grey, grey, grey]);
      expect(g).toBe(r);
      expect(b).toBe(r);
    }
  });

  it('brightens every channel with the exposure and never leaves [0, 1]', () => {
    for (const colour of COLOURS) {
      let previous: Triple = [0, 0, 0];
      // twenty-two decades of exposure, twelve steps to the decade
      for (let step = 0; step <= 264; step++) {
        const mapped = toneMap(scaled(colour, 10 ** (step / 12 - 8)));
        for (let channel = 0; channel < 3; channel++) {
          // 1e-12: above the reference white the common factor compress(Y)/Y is rounded afresh at every
          // exposure, which can lower a saturated channel by a few 10⁻¹⁶
          expect(mapped[channel]).toBeGreaterThanOrEqual(previous[channel] - 1e-12);
          expect(mapped[channel]).toBeGreaterThanOrEqual(0);
          expect(mapped[channel]).toBeLessThanOrEqual(1);
        }
        previous = mapped;
      }
      // … and the sweep really went from black to the top of the scale
      expect(Math.max(...toneMap(scaled(colour, 1e-8)))).toBeLessThan(1e-6);
      expect(Math.max(...previous)).toBeGreaterThan(0.99);
    }
  });

  it('has no step where the highlight compression sets in', () => {
    for (const colour of COLOURS) {
      const atWhite = scaled(colour, 1 / relativeLuminance(colour));
      const below = toneMap(scaled(atWhite, 1 - 1e-9));
      const above = toneMap(scaled(atWhite, 1 + 1e-9));
      // The curve has a slope of order 1 here, so a change of 2 × 10⁻⁹ in luminance moves a channel by
      // about as much (measured 4 × 10⁻¹⁰); 10⁻⁷ would reveal the smallest offset between the branches.
      for (let channel = 0; channel < 3; channel++) expect(Math.abs(above[channel] - below[channel])).toBeLessThan(1e-7);
    }
  });

  it('keeps the colour of very bright light instead of clipping it to white', () => {
    // A million times the reference white in a saturated orange. The filmic curve alone would saturate in
    // every channel …
    const glare = scaled(ORANGE, 1e6);
    expect([filmic(glare[0]), filmic(glare[1]), filmic(glare[2])]).toEqual([1, 1, 1]);
    // … but the luminance is compressed first, at constant chromaticity. Measured: (1.000, 0.931, 0.529)
    // in linear display values, rgb(255 247 192) on screen: pale, but unmistakably orange.
    expect(toneMap(glare)[2]).toBeLessThan(0.6);
    // The order of the channels survives at any brightness. Even at 10¹², the scale of the brightest light
    // in the scene, the weakest channel is still a quarter below the strongest (measured 0.708).
    for (const factor of [1, 1e3, 1e6, 1e9, 1e12]) {
      const [r, g, b] = toneMap(scaled(ORANGE, factor));
      expect(r).toBeGreaterThan(g);
      expect(g).toBeGreaterThan(b);
      expect(b).toBeLessThan(0.75);
    }
  });

  it('shows a colour outside the display gamut like its projection into the gamut', () => {
    const colours: Triple[] = [
      [1.4, -0.3, 0.2],
      [0.5, 0.5, -0.1],
      [-0.2, 0.9, 1.3],
      [-0.5, 0.4, -0.1],
      [5, -1, -1],
    ];
    for (const colour of colours) {
      expect(relativeLuminance(colour)).toBeGreaterThan(0);
      const mapped = toneMap(colour);
      const projected = toneMap(compressToGamut(colour));
      for (let channel = 0; channel < 3; channel++) {
        expect(mapped[channel]).toBeGreaterThanOrEqual(0);
        expect(mapped[channel]).toBeLessThanOrEqual(1);
        // 12 digits: projecting a second time changes the colour by rounding only
        expect(mapped[channel]).toBeCloseTo(projected[channel], 12);
      }
      // the smallest desaturation that fits puts the most negative channel on the edge of the gamut: at zero,
      // give or take the rounding of the projection
      expect(mapped[colour.indexOf(Math.min(...colour))]).toBeCloseTo(0, 12);
    }
  });
});

describe('display encoding', () => {
  const samples: Triple[] = [
    [0, 0, 0],
    [1e-4, 2e-4, 3e-4],
    [0.18, 0.18, 0.18],
    ORANGE,
    scaled(ORANGE, 1e6),
    [1.4, -0.3, 0.2],
    [1e12, 1e12, 1e12],
  ];

  it('toDisplay is the sRGB encoding of the tone-mapped colour', () => {
    for (const radiance of samples) {
      const mapped = toneMap(radiance);
      expect(toDisplay(radiance)).toEqual([encodeSrgb(mapped[0]), encodeSrgb(mapped[1]), encodeSrgb(mapped[2])]);
    }
  });

  it('toCss writes the display value in 8 bits as a CSS colour', () => {
    for (const radiance of samples) {
      const match = /^rgb\((\d{1,3}) (\d{1,3}) (\d{1,3})\)$/.exec(toCss(radiance));
      expect(match?.slice(1).map(Number)).toEqual(toDisplay(radiance).map((value) => Math.round(255 * value)));
    }
    // the two ends of the scale
    expect(toCss([0, 0, 0])).toBe('rgb(0 0 0)');
    expect(toCss([1e14, 1e14, 1e14])).toBe('rgb(255 255 255)');
  });
});

describe('GLSL copy of the display transform (src/scene/shaders/chunks.ts)', () => {
  // The shader repeats constants that the CPU reference holds as literals of its own. Each test pins the
  // CPU side to a constant numerically and then looks for the same literal in the shader source, so that a
  // change on either side alone fails.
  const literals = DISPLAY_TRANSFORM.match(/\d+\.\d+/g) ?? [];

  it('uses the same filmic coefficients', () => {
    // Narkowicz (2015): f(x) = x(ax + b) / (x(cx + d) + e)
    const [a, b, c, d, e] = [2.51, 0.03, 2.43, 0.59, 0.14];
    for (const x of [1e-6, 0.02, 0.18, 1, 3, 7]) {
      expect(filmic(x)).toBeCloseTo((x * (a * x + b)) / (x * (c * x + d) + e), 14);
    }
    for (const coefficient of [a, b, c, d, e]) expect(literals).toContain(String(coefficient));
  });

  it('uses the same luminance weights, to four decimals', () => {
    const rounded = LUMINANCE_WEIGHTS.map((weight) => weight.toFixed(4));
    expect(rounded).toEqual(['0.2126', '0.7152', '0.0722']);
    for (const weight of rounded) expect(literals).toContain(weight);
  });

  it('uses the same sRGB transfer function', () => {
    const [slope, gain, offset, threshold, gamma] = [12.92, 1.055, 0.055, 0.0031308, 2.4];
    // both branches, and the threshold itself
    for (const linear of [0.001, 0.003, threshold, 0.004, 0.18, 0.9]) {
      const encoded = linear <= threshold ? slope * linear : gain * linear ** (1 / gamma) - offset;
      expect(encodeSrgb(linear)).toBeCloseTo(encoded, 14);
    }
    for (const constant of [slope, gain, offset, threshold, gamma]) expect(literals).toContain(String(constant));
  });

  it('receives the highlight slope without loss', () => {
    expect(literals).toContain(HIGHLIGHT_SLOPE.toFixed(4));
    // the shader source carries four decimals: a slope with more would be compressed differently on the GPU
    expect(Number(HIGHLIGHT_SLOPE.toFixed(4))).toBe(HIGHLIGHT_SLOPE);
  });
});
