/**
 * GLSL shared by every material of the scene.
 *
 * The functions here are line-for-line counterparts of the reference
 * implementations in src/physics (optics.ts: aberratePoint / deaberrateDirection,
 * spectralAtlas.ts: sampleAtlas and friends, display.ts: toDisplay),
 * which are covered by unit tests — including a float32 emulation of exactly this
 * arithmetic.
 */

import { HIGHLIGHT_SLOPE } from '@/physics/display';
import { ATLAS_ROW, ATLAS_ROWS } from '@/physics/spectralAtlas';

const row = (index: number): string => ((index + 0.5) / ATLAS_ROWS).toFixed(6);

/** Uniform declarations common to all materials. */
export const COMMON_UNIFORMS = /* glsl */ `
  uniform float uOnePlusBeta;   // 1 + β   (formed in double precision on the CPU)
  uniform float uOneMinusBeta;  // 1 − β
  uniform float uGamma;         // Lorentz factor
  uniform float uOptical;       // 1 = what is seen (aberration + Doppler), 0 = what is measured (pure contraction)
  uniform float uThermal;       // 1 = include thermal self-emission of the environment
  uniform float uLnExposure;    // natural log of the camera exposure
  uniform sampler2D uAtlas;     // spectral atlas (src/physics/spectralAtlas.ts)
  uniform vec4 uAtlasAxis;      // (ln D min, 1 / ln D span, ln T min, 1 / ln T span)
  uniform vec2 uLineAxis;       // (λ min, 1 / λ span) of the line row, nm
`;

/**
 * Splits 1 ± cos θ without cancellation. `forward` is the component of the
 * displacement along the direction of motion, `perp2` its squared perpendicular
 * part and `r` its length.
 */
export const BOOST_MATH = /* glsl */ `
  void onePlusMinusCos(float forward, float perp2, float r, out float plus, out float minus) {
    if (forward >= 0.0) {
      plus = (r + forward) / r;
      minus = perp2 / (r * (r + forward));
    } else {
      minus = (r - forward) / r;
      plus = perp2 / (r * (r - forward));
    }
  }

  // Rest-frame displacement -> Doppler factor. D = γ(1 + β cos θ) = γ(a + b)/2 with
  // a = (1+β)(1+cos θ), b = (1−β)(1−cos θ): a sum of positive terms.
  float dopplerOfRestDisplacement(vec3 rel, out float a, out float b, out float r) {
    float forward = -rel.z;
    float perp2 = dot(rel.xy, rel.xy);
    r = max(sqrt(perp2 + forward * forward), 1e-6);
    float plus;
    float minus;
    onePlusMinusCos(forward, perp2, r, plus, minus);
    a = uOnePlusBeta * plus;
    b = uOneMinusBeta * minus;
    return 0.5 * uGamma * (a + b);
  }
`;

/** Sampling of the spectral atlas. */
export const ATLAS_SAMPLING = /* glsl */ `
  vec4 atlasAtDoppler(float lnD, float v) {
    return texture2D(uAtlas, vec2((lnD - uAtlasAxis.x) * uAtlasAxis.y, v));
  }

  // Radiance leaving a surface of the given albedo per unit irradiance of an
  // illuminant, seen at Doppler factor exp(lnD). 'firstRow' selects the illuminant.
  vec3 reflectedMoon(vec3 albedo, float lnD) {
    vec4 r = atlasAtDoppler(lnD, ${row(ATLAS_ROW.moonRed)});
    vec4 g = atlasAtDoppler(lnD, ${row(ATLAS_ROW.moonGreen)});
    vec4 b = atlasAtDoppler(lnD, ${row(ATLAS_ROW.moonBlue)});
    return (albedo.r * r.rgb + albedo.g * g.rgb + albedo.b * b.rgb) * exp(r.a + uLnExposure);
  }

  vec3 reflectedLed(vec3 albedo, float lnD) {
    vec4 r = atlasAtDoppler(lnD, ${row(ATLAS_ROW.ledRed)});
    vec4 g = atlasAtDoppler(lnD, ${row(ATLAS_ROW.ledGreen)});
    vec4 b = atlasAtDoppler(lnD, ${row(ATLAS_ROW.ledBlue)});
    return (albedo.r * r.rgb + albedo.g * g.rgb + albedo.b * b.rgb) * exp(r.a + uLnExposure);
  }

  // Black body of temperature exp(lnT), scaled by exp(lnScale) (dilution, emissivity).
  vec3 blackbody(float lnT, float lnScale) {
    vec4 s = texture2D(uAtlas, vec2((lnT - uAtlasAxis.z) * uAtlasAxis.w, ${row(ATLAS_ROW.blackbody)}));
    return s.rgb * exp(s.a + lnScale + uLnExposure);
  }

  // Quasi-monochromatic emitter of rest wavelength restNm and rest luminance exp(lnLuminance):
  // the line moves to restNm / D, its radiance grows as D^4, its luminance follows V(λ).
  vec3 lineEmitter(float restNm, float lnD, float lnLuminance) {
    vec4 seen = texture2D(uAtlas, vec2((restNm * exp(-lnD) - uLineAxis.x) * uLineAxis.y, ${row(ATLAS_ROW.line)}));
    vec4 rest = texture2D(uAtlas, vec2((restNm - uLineAxis.x) * uLineAxis.y, ${row(ATLAS_ROW.line)}));
    return seen.rgb * exp(4.0 * lnD + seen.a - rest.a + lnLuminance + uLnExposure);
  }
`;

/**
 * Scene-referred linear camera RGB -> display; the GLSL counterpart of
 * src/physics/display.ts. In this order:
 *   1. gamut: negative lobes are removed by the smallest luminance-preserving desaturation,
 *   2. highlights: luminance above the reference white is compressed logarithmically
 *      at constant chromaticity, so very bright thermal light keeps the colour of
 *      its temperature instead of clipping to white,
 *   3. tone: each channel follows a filmic curve,
 *   4. the exact sRGB transfer function, plus half an LSB of ordered dither to
 *      keep the dark sky free of banding.
 */
export const DISPLAY_TRANSFORM = /* glsl */ `
  const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);

  // Narkowicz (2015) fit of the ACES filmic curve: a toe, a linear middle and a long shoulder.
  vec3 filmic(vec3 x) {
    return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
  }

  vec3 encodeSrgb(vec3 c) {
    vec3 lo = 12.92 * c;
    vec3 hi = 1.055 * pow(max(c, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055;
    return mix(lo, hi, step(vec3(0.0031308), c));
  }

  // Interleaved gradient noise (Jimenez 2014), in [0, 1).
  float ditherNoise(vec2 pixel) {
    return fract(52.9829189 * fract(dot(pixel, vec2(0.06711056, 0.00583715))));
  }

  vec3 toDisplay(vec3 radiance) {
    float dither = (ditherNoise(gl_FragCoord.xy) - 0.5) / 255.0;
    float y = dot(radiance, LUMA);
    if (!(y > 0.0)) return vec3(dither);
    vec3 c = radiance;
    float lowest = min(c.r, min(c.g, c.b));
    if (lowest < 0.0) c = mix(vec3(y), c, y / (y - lowest));
    if (y > 1.0) c *= (1.0 + ${HIGHLIGHT_SLOPE.toFixed(4)} * log(y)) / y;
    return encodeSrgb(filmic(c)) + dither;
  }
`;
