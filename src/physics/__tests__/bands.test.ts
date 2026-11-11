import { describe, expect, it } from 'vitest';
import { type BandId, BANDS, VISIBLE_MAX_NM, VISIBLE_MIN_NM, classifyWavelength, spectralSwatch } from '../bands';
import { CIE1931_END_NM, CIE1931_START_NM, colourMatching } from '../cie1931';
import { D65_XYZ, SRGB_TO_XYZ, apply, chromaticity, decodeSrgb } from '../colorimetry';
import { BETA_MAX, headOnDopplerFactor } from '../kinematics';

const DEG = Math.PI / 180;
const LAST_BAND = BANDS[BANDS.length - 1];

type Rgb = readonly [number, number, number];

/** The 8-bit channels of a swatch. Throws unless the string has exactly the form "rgb(r g b)". */
function channels(css: string | null): Rgb {
  const match = /^rgb\((\d{1,3}) (\d{1,3}) (\d{1,3})\)$/.exec(css ?? '');
  if (!match) throw new Error(`not a CSS colour: ${String(css)}`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/**
 * Hue angle in degrees (the hexagonal hue of HSV: red 0°, green 120°, blue 240°). Reds with a touch of
 * blue come out negative instead of near 360°, so that the hue is continuous along the whole spectrum.
 */
function hue([r, g, b]: Rgb): number {
  const max = Math.max(r, g, b);
  const span = max - Math.min(r, g, b);
  if (max === r) return (60 * (g - b)) / span;
  if (max === g) return 60 * ((b - r) / span + 2);
  return 60 * ((r - g) / span + 4);
}

describe('band table', () => {
  it('divides all positive wavelengths into contiguous bands of increasing wavelength', () => {
    expect(BANDS[0].from).toBe(0);
    expect(LAST_BAND.to).toBe(Number.POSITIVE_INFINITY);
    BANDS.forEach((band, index) => {
      expect(band.to).toBeGreaterThan(band.from);
      if (index > 0) expect(band.from).toBe(BANDS[index - 1].to);
    });
    expect(new Set(BANDS.map((band) => band.id)).size).toBe(BANDS.length);
  });

  it('marks as visible exactly the bands within the range of the CIE 1931 observer', () => {
    expect(VISIBLE_MIN_NM).toBe(CIE1931_START_NM);
    expect(VISIBLE_MAX_NM).toBe(CIE1931_END_NM);
    for (const band of BANDS) {
      expect(band.visible).toBe(band.from >= VISIBLE_MIN_NM && band.to <= VISIBLE_MAX_NM);
    }
    // … and those bands tile the range without a gap, in the order of the rainbow
    const visible = BANDS.filter((band) => band.visible);
    expect(visible[0].from).toBe(VISIBLE_MIN_NM);
    expect(visible[visible.length - 1].to).toBe(VISIBLE_MAX_NM);
    expect(visible.map((band) => band.id)).toEqual(['violet', 'blue', 'cyan', 'green', 'yellow', 'orange', 'red']);
  });

  it('follows the CIE division of ultraviolet and infrared radiation', () => {
    // International Lighting Vocabulary (CIE S 017): UV-C 100–280 nm, UV-B 280–315 nm, UV-A from 315 nm;
    // IR-A 780–1400 nm, IR-B 1.4–3 µm, IR-C 3 µm–1 mm (divided here into mid and far infrared).
    const limits = (id: BandId): number[] => BANDS.filter((band) => band.id === id).flatMap((band) => [band.from, band.to]);
    expect(limits('uvC')).toEqual([100, 280]);
    expect(limits('uvB')).toEqual([280, 315]);
    expect(limits('uvA')).toEqual([315, VISIBLE_MIN_NM]);
    expect(limits('nearIr')).toEqual([VISIBLE_MAX_NM, 1400]);
    expect(limits('shortIr')).toEqual([1400, 3000]);
    expect(limits('midIr')[0]).toBe(3000);
    expect(limits('farIr')[1]).toBe(1e6);
  });
});

describe('classifyWavelength', () => {
  it('finds every band from a wavelength inside it', () => {
    for (const band of BANDS) {
      const inside = Number.isFinite(band.to) ? (band.from + band.to) / 2 : 2 * band.from;
      expect(classifyWavelength(inside)).toBe(band);
    }
  });

  it('assigns a wavelength on a boundary to the upper band', () => {
    for (let index = 1; index < BANDS.length; index++) {
      const boundary = BANDS[index].from;
      expect(classifyWavelength(boundary)).toBe(BANDS[index]);
      // One part in 10¹² to either side: thousands of times the spacing of doubles, so the neighbours are
      // distinct numbers, yet far closer to the boundary than any wavelength is ever known.
      expect(classifyWavelength(boundary * (1 - 1e-12))).toBe(BANDS[index - 1]);
      expect(classifyWavelength(boundary * (1 + 1e-12))).toBe(BANDS[index]);
    }
  });

  it('returns a band for any number: the first for non-positive or undefined wavelengths, the last beyond the table', () => {
    for (const nm of [0, -0, -555, Number.NaN, Number.NEGATIVE_INFINITY]) {
      expect(classifyWavelength(nm)).toBe(BANDS[0]);
    }
    expect(classifyWavelength(Number.MIN_VALUE)).toBe(BANDS[0]);
    for (const nm of [Number.MAX_VALUE, Number.POSITIVE_INFINITY]) {
      expect(classifyWavelength(nm)).toBe(LAST_BAND);
    }
  });

  it('names familiar wavelengths', () => {
    const cases: Array<[number, BandId]> = [
      [1e-3, 'gamma'], // 1 pm: a photon of 1.2 MeV
      [0.1, 'xray'], // 1 Å, the scale of crystal lattices
      [121.6, 'uvC'], // Lyman α
      [555, 'green'], // peak of the photopic sensitivity V(λ)
      [589, 'yellow'], // sodium D lines
      [656.3, 'red'], // Hα
      [10_600, 'midIr'], // CO₂ laser
      [2.1e8, 'microwave'], // 21 cm line of neutral hydrogen
      [3e9, 'radio'], // 3 m, the FM broadcast band
    ];
    for (const [nm, id] of cases) expect(classifyWavelength(nm).id).toBe(id);
  });

  it('follows 555 nm light out of the visible band as the observer speeds up', () => {
    // What the instrument panel reports for light from dead ahead (λ/D₀) and from directly behind (λ·D₀).
    const half = headOnDopplerFactor(0.5); // √3
    expect(classifyWavelength(555 / half).id).toBe('uvA'); // 320 nm
    expect(classifyWavelength(555 * half).id).toBe('nearIr'); // 961 nm
    const top = headOnDopplerFactor(BETA_MAX); // ≈ 447
    expect(classifyWavelength(555 / top).id).toBe('xray'); // 1.24 nm
    expect(classifyWavelength(555 * top).id).toBe('farIr'); // 0.25 mm
  });
});

describe('spectralSwatch', () => {
  it('has a colour exactly where the band table says the light is visible', () => {
    // Half-nanometre steps that fall between the band limits; the two limits of vision follow separately.
    for (let nm = 200.25; nm < 1000; nm += 0.5) {
      expect(spectralSwatch(nm) !== null).toBe(classifyWavelength(nm).visible);
    }
    expect(spectralSwatch(VISIBLE_MIN_NM - 1e-3)).toBeNull();
    expect(spectralSwatch(VISIBLE_MIN_NM + 1e-3)).not.toBeNull();
    expect(spectralSwatch(VISIBLE_MAX_NM - 1e-3)).not.toBeNull();
    expect(spectralSwatch(VISIBLE_MAX_NM + 1e-3)).toBeNull();
    for (const nm of [0, -555, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(spectralSwatch(nm)).toBeNull();
    }
  });

  it('is a well-formed CSS colour at full brightness and full saturation', () => {
    for (let nm = VISIBLE_MIN_NM + 0.5; nm < VISIBLE_MAX_NM; nm += 1) {
      const rgb = channels(spectralSwatch(nm));
      for (const value of rgb) expect(value).toBeLessThanOrEqual(255);
      // normalised: the strongest channel is at full scale
      expect(Math.max(...rgb)).toBe(255);
      // Every spectral colour lies outside the sRGB gamut, and the smallest desaturation that brings it in
      // leaves it on the edge of the gamut, where one channel is exactly zero.
      expect(Math.min(...rgb)).toBe(0);
    }
  });

  it('runs through the hues of the rainbow in order', () => {
    const strongest = (nm: number): number => {
      const rgb = channels(spectralSwatch(nm));
      return rgb.indexOf(Math.max(...rgb));
    };
    expect(strongest(450)).toBe(2); // blue
    expect(strongest(530)).toBe(1); // green
    expect(strongest(620)).toBe(0); // red

    // From violet (≈ 270°) through blue, cyan, green, yellow and orange to a slightly purplish red (≈ −20°:
    // spectral reds beyond 611 nm are redder than the red primary of the display).
    const hueAt = (nm: number): number => hue(channels(spectralSwatch(nm)));
    expect(hueAt(400)).toBeGreaterThan(255);
    expect(hueAt(700)).toBeLessThan(0);
    // Never backwards — except by one 8-bit step of the middle channel (60°/255), which rounding may flip
    // to and fro where the hue stands still, as it does beyond 700 nm.
    let previous = hueAt(VISIBLE_MIN_NM + 0.5);
    for (let nm = VISIBLE_MIN_NM + 1.5; nm < VISIBLE_MAX_NM; nm += 1) {
      const current = hueAt(nm);
      expect(current).toBeLessThanOrEqual(previous + 60 / 255 + 1e-9);
      previous = current;
    }
  });

  it('shows every wavelength with its own dominant wavelength', () => {
    // Desaturating towards the achromatic colour of equal luminance moves a chromaticity along the straight
    // line to the white point (D65). Seen from the white point, the swatch must therefore lie in the direction
    // of the spectral colour it stands for. 1°: rounding to 8 bits moves the chromaticity by up to 0.001,
    // and near 495 nm the swatch is only 0.09 away from the white point (measured: 0.4° at worst).
    const white = chromaticity(D65_XYZ);
    const xyz = [0, 0, 0];
    for (let nm = VISIBLE_MIN_NM + 0.5; nm < VISIBLE_MAX_NM; nm += 1) {
      colourMatching(nm, xyz);
      const spectral = chromaticity([xyz[0], xyz[1], xyz[2]]);
      const rgb = channels(spectralSwatch(nm));
      const shown = chromaticity(
        apply(SRGB_TO_XYZ, [decodeSrgb(rgb[0] / 255), decodeSrgb(rgb[1] / 255), decodeSrgb(rgb[2] / 255)])
      );
      const a = [spectral[0] - white[0], spectral[1] - white[1]];
      const b = [shown[0] - white[0], shown[1] - white[1]];
      const angle = Math.atan2(a[0] * b[1] - a[1] * b[0], a[0] * b[0] + a[1] * b[1]);
      expect(Math.abs(angle) / DEG).toBeLessThan(1);
    }
  });
});
