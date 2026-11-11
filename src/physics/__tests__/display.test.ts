import { describe, expect, it } from 'vitest';
import { BASE_LN_EXPOSURE } from '@/scene/uniforms';
import { DISPLAY_TRANSFORM } from '@/scene/shaders/chunks';
import {
  type Triple,
  D65_XYZ,
  LUMINANCE_WEIGHTS,
  SRGB_TO_XYZ,
  apply,
  compressToGamut,
  decodeSrgb,
  encodeSrgb,
  relativeLuminance,
} from '../colorimetry';
import { HIGHLIGHT_SLOPE, compressHighlight, filmic, toCss, toDisplay, toneMap } from '../display';
import { EXPOSURE_MAX_EV, EXPOSURE_MIN_EV } from '../exposure';
import { REFERENCE_LUMINANCE_CD_M2, SCENARIO } from '../scenario';
import { lineRadiance, sharedAtlas } from '../spectralAtlas';

const scaled = (colour: Triple, factor: number): Triple => [colour[0] * factor, colour[1] * factor, colour[2] * factor];

/** The tone curve as it was before, applied to each channel separately: the reference for what had to change. */
function perChannel(radiance: Triple): Triple {
  const luminance = relativeLuminance(radiance);
  if (!(luminance > 0)) return [0, 0, 0];
  const scale = compressHighlight(luminance) / luminance;
  const inGamut = compressToGamut(radiance);
  return [filmic(inGamut[0] * scale), filmic(inGamut[1] * scale), filmic(inGamut[2] * scale)];
}

/** Hue of a display colour on the colour wheel of its RGB values, degrees: red 0, green 120, blue 240, magenta 300. */
function hue([r, g, b]: Triple): number {
  const max = Math.max(r, g, b);
  const span = max - Math.min(r, g, b);
  if (!(span > 0)) return Number.NaN;
  const sector = max === r ? (g - b) / span : max === g ? 2 + (b - r) / span : 4 + (r - g) / span;
  return (60 * sector + 360) % 360;
}

/** Angle between two hues, degrees. */
const hueDistance = (a: number, b: number): number => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));

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

const atlas = sharedAtlas();
/** Lines of the scene at unit luminance, in camera RGB (with the fixed white balance), all outside the gamut. */
const LINES = {
  red: lineRadiance(atlas, SCENARIO.signals.redNm, 1),
  amber: lineRadiance(atlas, SCENARIO.signals.amberNm, 1),
  green: lineRadiance(atlas, SCENARIO.signals.greenNm, 1),
  violet: lineRadiance(atlas, 400, 1),
};
const SATURATED: Triple[] = Object.values(LINES);

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

  it('sets the largest channel by the filmic curve and scales the other two with it', () => {
    // inside the gamut and below the reference white, where neither step 1 nor step 2 does anything
    const colours: Triple[] = [
      [0.2, 0.5, 0.7],
      [0.02, 0.01, 0.3],
      [0.9, 0.9, 0.9],
    ];
    for (const colour of colours) {
      expect(relativeLuminance(colour)).toBeLessThan(1);
      const peak = Math.max(...colour);
      const level = filmic(peak);
      expect(toneMap(colour)).toEqual(colour.map((value) => level * (value / peak)));
    }
  });

  it('keeps neutral input neutral at every level, exactly as the curve applied to each channel did', () => {
    for (let exponent = -6; exponent <= 14; exponent += 0.25) {
      const grey = 10 ** exponent;
      const [r, g, b] = toneMap([grey, grey, grey]);
      expect(g).toBe(r);
      expect(b).toBe(r);
      expect([r, g, b]).toEqual(perChannel([grey, grey, grey]));
    }
  });

  it('keeps the ratios between the channels at every exposure', () => {
    // what steps 1 and 2 leave of a colour (the projection into the gamut; a common factor) is what is shown
    for (const colour of [...COLOURS, ...SATURATED]) {
      const inGamut = compressToGamut(colour);
      const strongest = Math.max(...inGamut);
      for (let step = 0; step <= 264; step++) {
        const mapped = toneMap(scaled(colour, 10 ** (step / 12 - 8)));
        const peak = Math.max(...mapped);
        if (peak === 0) continue;
        for (let channel = 0; channel < 3; channel++) {
          expect(mapped[channel] / peak).toBeCloseTo(Math.max(0, inGamut[channel]) / strongest, 12);
          expect(mapped[channel]).toBeGreaterThanOrEqual(0);
          expect(mapped[channel]).toBeLessThanOrEqual(1);
        }
      }
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
    // … and applied to each channel after the highlight compression it still bleached the orange to
    // (1.000, 0.931, 0.529), rgb(255 247 192). On the largest channel it shows the orange itself, at full
    // brightness: (1, 0.3, 0.05), rgb(255 149 63), here and at 10¹², the scale of the brightest light in the scene.
    expect(perChannel(glare)[2]).toBeGreaterThan(0.5);
    for (const factor of [1e6, 1e9, 1e12]) {
      const mapped = toneMap(scaled(ORANGE, factor));
      for (let channel = 0; channel < 3; channel++) expect(mapped[channel]).toBeCloseTo(ORANGE[channel], 12);
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

describe('the lights of the scene', () => {
  // a lit signal lens, about 1 250 times the reference white, at every exposure the camera can choose
  const signalLevel = SCENARIO.signals.luminanceCdM2 / REFERENCE_LUMINANCE_CD_M2;
  const exposures: number[] = [];
  for (let ev = EXPOSURE_MIN_EV; ev <= EXPOSURE_MAX_EV; ev += 0.5) exposures.push(Math.exp(BASE_LN_EXPOSURE) * 2 ** ev);
  const shown = (line: Triple, level: number): Triple => toDisplay(scaled(line, level));

  it('a red signal at rest is red, not magenta', () => {
    // 626 nm keeps a small blue component in the gamut (its dominant wavelength lies beyond that of the sRGB red
    // primary, towards the purples): 4.7 % of the red in linear terms, rgb(255 0 61) at the exposure at rest. Per
    // channel the shoulder lifted it to rgb(255 0 207), 49° from red on the colour wheel and 11° from magenta.
    for (const exposure of exposures) {
      const colour = shown(LINES.red, signalLevel * exposure);
      expect(colour[1]).toBeCloseTo(0, 9);
      expect(colour[2]).toBeLessThan(0.25 * colour[0]);
      // at most 14.4° on the colour wheel, at full brightness, where the blue is encoded highest
      expect(hueDistance(hue(colour), 0)).toBeLessThan(20);
    }
    const atRest = Math.exp(BASE_LN_EXPOSURE) * signalLevel;
    expect(toCss(scaled(LINES.red, atRest))).toBe('rgb(255 0 61)');
    expect(hueDistance(hue(perChannel(scaled(LINES.red, atRest)).map(encodeSrgb) as unknown as Triple), 300)).toBeLessThan(15);
  });

  it('a red signal keeps its dominant wavelength, its perceived hue only roughly (display.ts, step 1)', () => {
    // CIELAB hue angle (D65), the usual measure of perceived hue
    const lab = (t: number): number => (t > (6 / 29) ** 3 ? Math.cbrt(t) : t / (3 * (6 / 29) ** 2) + 4 / 29);
    const hueAngle = (rgb: Triple): number => {
      const [x, y, z] = apply(SRGB_TO_XYZ, rgb).map((value, i) => lab(value / D65_XYZ[i]));
      return ((Math.atan2(200 * (y - z), 500 * (x - y)) * 180) / Math.PI + 360) % 360;
    };
    const shown = toDisplay(scaled(LINES.red, Math.exp(BASE_LN_EXPOSURE) * signalLevel)).map(decodeSrgb) as unknown as Triple;
    // the light itself has the hue of the sRGB red primary (measured 41.0° and 40.0°); shown, it is 13.5° nearer pink
    expect(Math.abs(hueAngle(LINES.red) - hueAngle([1, 0, 0]))).toBeLessThan(2);
    expect(hueAngle(shown)).toBeCloseTo(27.5, 1);
    // per channel it was 337.6°, next to magenta (328.2°)
    expect(hueAngle(perChannel(scaled(LINES.red, Math.exp(BASE_LN_EXPOSURE) * signalLevel)))).toBeCloseTo(337.6, 1);
  });

  it('a green signal is the blue-green of 505 nm, not cyan', () => {
    // In the gamut 505 nm has two thirds as much blue as green. Per channel the blue was lifted to the green:
    // rgb(0 250 246) at rest, cyan. Shown at its own ratio it is rgb(0 250 209).
    for (const exposure of exposures) {
      const colour = shown(LINES.green, signalLevel * exposure);
      expect(colour[0]).toBeCloseTo(0, 9);
      expect(colour[2]).toBeLessThan(0.86 * colour[1]);
    }
    const atRest = Math.exp(BASE_LN_EXPOSURE) * signalLevel;
    expect(toCss(scaled(LINES.green, atRest))).toBe('rgb(0 250 209)');
    expect(perChannel(scaled(LINES.green, atRest))[2]).toBeGreaterThan(0.95 * perChannel(scaled(LINES.green, atRest))[1]);
  });

  it('violet light is violet, not magenta, however bright', () => {
    // 400 nm: the blue channel carries it and the red one stays at a sixth of it in linear terms; per channel
    // the red rose with the brightness to rgb(241 0 255) already at the reference white
    for (let exponent = -2; exponent <= 4; exponent += 0.5) {
      const colour = shown(LINES.violet, 10 ** exponent);
      expect(colour[1]).toBeCloseTo(0, 9);
      expect(colour[0]).toBeLessThan(0.5 * colour[2]);
      expect(hueDistance(hue(colour), 270)).toBeLessThan(10);
    }
    expect(hueDistance(hue(perChannel(LINES.violet).map(encodeSrgb) as unknown as Triple), 300)).toBeLessThan(5);
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
    // Narkowicz (2016): f(x) = x(ax + b) / (x(cx + d) + e)
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

  it('applies the curve to the largest channel and keeps the ratios, as toneMap does', () => {
    const code = DISPLAY_TRANSFORM.replace(/\/\/[^\n]*/g, '').replace(/\s+/g, ' ');
    // the curve takes a single value; a vec3 version would bring the per-channel curve back
    expect(code).toContain('float filmic(float x)');
    expect(code).not.toContain('vec3 filmic');
    for (const line of [
      'c = max(c, vec3(0.0));',
      'float peak = max(c.r, max(c.g, c.b));',
      'if (!(peak > 0.0)) return vec3(dither);',
      'return encodeSrgb(filmic(peak) * (c / peak)) + dither;',
    ]) {
      expect(code).toContain(line);
    }
    // in this order, after the highlight compression
    const order = ['log(y)) / y;', 'c = max(c, vec3(0.0));', 'float peak', 'filmic(peak) * (c / peak)'].map((part) =>
      code.indexOf(part)
    );
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });
});
