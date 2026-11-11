/**
 * The star field: unresolved black-body point sources.
 *
 * A star of temperature T seen at Doppler factor D looks like a black body at D·T
 * whose solid angle has shrunk by D² (McKinley & Doherty 1979). Its visible-band
 * flux therefore changes by
 *
 *     L(D·T) / (D² · L(T))
 *
 * where L is the luminance of a black body. There is no rainbow in this: the
 * colour slides along the Planckian locus, cool stars brighten as their peak
 * enters the visible band and hot stars fade as theirs leaves it. The flux law and
 * the normalisation of the point-spread function are src/scene/geometry/stars.ts
 * (starLnFlux, starLnNormalisation, starLnOffAxis), where they are tested.
 *
 * Compositing. A star adds its radiance to that of the sky behind it, and where
 * aberration crowds the stars together, to that of its neighbours. The display
 * transform is not linear (highlights are compressed), so stars cannot be
 * tone-mapped one by one and added to the picture: in front of a sky that outshines
 * a star a hundredfold it would stay as visible as in front of a dark one, and
 * where seven stars share a pixel they would add up to white. So the stars are
 * drawn first, additively, into a half-float target of the size of the drawing
 * buffer (starRadianceFragmentShader): per pixel it holds the sum of their
 * radiances, after exposure. The sky shader adds that sum to the radiance it
 * computes for the pixel before its own display transform, which is exact for any
 * number of stars, and is drawn only where no building is in front.
 *
 * Where a half-float target cannot be rendered to (WebGL 2 without
 * EXT_color_buffer_float or EXT_color_buffer_half_float), the stars are drawn over
 * the sky instead (starFragmentShader): each evaluates the sky in its own direction
 * and writes the increment display(sky + star) − display(sky), which the additive
 * blend puts on top of the sky. That is exact for a star by itself as long as the
 * increment is positive in every channel. It need not be: the highlight compression
 * and the tone curve, which sets all three channels by the largest, let a bright
 * star of another colour than the sky lower the sky's other channels on the display,
 * and a blend cannot subtract, so those channels stay too bright (in the GPU check,
 * looking up at β = 0.9 with thermal emission on, a sixth of the star pixels were
 * off by more than one level, by 110 of 255 at most). Where point-spread functions
 * overlap, the increments add on the display, not in radiance, and a crowded
 * cluster comes out too bright.
 */

import { ATLAS_ROW, ATLAS_ROWS } from '@/physics/spectralAtlas';
import { STAR_PSF_CUTOFF, STAR_PSF_STEEPNESS } from '../geometry/stars';
import { ATLAS_SAMPLING, BOOST_MATH, COMMON_UNIFORMS, DISPLAY_TRANSFORM, SKY_RADIANCE, glslFloat } from './chunks';

const BLACKBODY_ROW = ((ATLAS_ROW.blackbody + 0.5) / ATLAS_ROWS).toFixed(6);

/** Largest ln of the radiance a star is drawn with at the centre of its sprite (after exposure). */
export const STAR_LN_PEAK_MAX = 12;

/**
 * Star radiance is stored in the half-float target multiplied by this factor. Half
 * floats reach 65 504; scaled down, a single star at the cap above stores at most
 * about 5 000 (e^12 times the largest colour component of a unit-luminance black body
 * in the atlas, 7.9, for the reddest of them), so thirteen of the brightest possible
 * stars fit on one pixel; should more ever meet there, the sky shader clamps what it
 * reads, so the pixel is still drawn at full brightness, in a colour the clamp has made
 * a little paler, rather than undefined. At the dark end the scaled
 * radiance of a star that is just visible (1/255 on the display, about 1.4 × 10⁻³) is
 * still held to about one per cent by the subnormal half floats.
 */
export const STAR_RADIANCE_SCALE = 1 / 256;

const vertexShader = (overSky: boolean): string => /* glsl */ `
  ${COMMON_UNIFORMS}
  uniform vec3 uObserver;
  uniform float uPointSize;      // diameter of the point-spread function, device pixels
  uniform float uLnStarNorm;     // ln of 1 / (solid angle covered by the point-spread function on the optical axis)

  attribute vec3 aStar;          // (ln of rest illuminance in reference units, ln T, atlas ln-luminance at T)

  varying vec3 vRadiance;
  ${overSky ? 'varying vec3 vSky;             // radiance of the sky behind the star' : ''}

  ${BOOST_MATH}
  ${ATLAS_SAMPLING}
  ${overSky ? SKY_RADIANCE : ''}

  void main() {
    vec3 rest = normalize(position);
    float a;
    float b;
    float r;
    float doppler = dopplerOfRestDisplacement(rest, a, b, r);
    vec3 seen = vec3(rest.xy / doppler, -(a - b) / (a + b));
    vec3 measured = normalize(vec3(rest.xy, rest.z / uGamma));
    vec3 direction = normalize(mix(measured, seen, uOptical));
    float lnD = log(doppler) * uOptical;
    vec4 view = viewMatrix * vec4(uObserver + direction, 1.0);

    // flux: starLnFlux of geometry/stars.ts
    vec4 body = texture2D(uAtlas, vec2((aStar.y + lnD - uAtlasAxis.z) * uAtlasAxis.w, ${BLACKBODY_ROW}));
    float lnFlux = aStar.x + (body.a - aStar.z) - 2.0 * lnD;
    // radiance at the centre of the sprite: flux / solid angle of the point-spread function. The sprite is
    // the same number of pixels everywhere, and off the optical axis a pixel subtends cos³θ less solid angle.
    float cosAxis = -view.z / length(view.xyz);
    float lnRadiance = lnFlux + uLnStarNorm - 3.0 * log(max(cosAxis, 1e-3)) + uLnExposure;
    vRadiance = body.rgb * exp(min(lnRadiance, ${glslFloat(STAR_LN_PEAK_MAX)}));
    ${overSky ? 'vSky = skyRadiance(rest.y / max(length(rest.xz), 1e-5), lnD);' : ''}

    vec4 clip = projectionMatrix * view;
    gl_Position = clip.xyww;
    gl_PointSize = uPointSize;
  }
`;

/** The point-spread function over the sprite (STAR_PSF_STEEPNESS, STAR_PSF_CUTOFF of geometry/stars.ts). */
const POINT_SPREAD = /* glsl */ `
  float pointSpread() {
    vec2 p = (gl_PointCoord - 0.5) * 2.0;
    return exp(-${glslFloat(STAR_PSF_STEEPNESS)} * dot(p, p));
  }
`;

/** Vertex stage of both ways of drawing the stars; the one over the sky also passes on the sky behind each star. */
export const starVertexShader = vertexShader(true);
export const starRadianceVertexShader = vertexShader(false);

/** The stars into the half-float target: radiance after exposure, summed by the additive blend. */
export const starRadianceFragmentShader = /* glsl */ `
  varying vec3 vRadiance;

  ${POINT_SPREAD}

  void main() {
    float falloff = pointSpread();
    if (falloff < ${glslFloat(STAR_PSF_CUTOFF)}) discard;
    gl_FragColor = vec4(vRadiance * (falloff * ${glslFloat(STAR_RADIANCE_SCALE)}), 1.0);
  }
`;

/** Fallback: the stars over the sky already drawn, each as the increment it makes on the display. */
export const starFragmentShader = /* glsl */ `
  varying vec3 vRadiance;
  varying vec3 vSky;

  ${POINT_SPREAD}
  ${DISPLAY_TRANSFORM}

  void main() {
    float falloff = pointSpread();
    if (falloff < ${glslFloat(STAR_PSF_CUTOFF)}) discard;
    // the increment the star makes on the display over the sky behind it (the dither cancels)
    gl_FragColor = vec4(toDisplay(vSky + vRadiance * falloff) - toDisplay(vSky), 1.0);
  }
`;

/**
 * Read by the sky shader: the summed radiance of the stars in this pixel, in the
 * units of the sky's own radiance. The target holds zeros where it is not used.
 */
export const STAR_RADIANCE_LOOKUP = /* glsl */ `
  uniform sampler2D uStars;        // summed star radiance per pixel, scaled (stars.ts)
  uniform vec2 uStarsTexel;        // 1 / size of that target in pixels

  vec3 starRadiance() {
    vec3 stored = texture2D(uStars, gl_FragCoord.xy * uStarsTexel).rgb;
    return clamp(stored, vec3(-6.0e4), vec3(6.0e4)) * ${glslFloat(1 / STAR_RADIANCE_SCALE)};
  }
`;
