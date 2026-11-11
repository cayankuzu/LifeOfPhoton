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
 * enters the visible band and hot stars fade as theirs leaves it.
 *
 * Compositing. A star adds its radiance to that of the sky behind it. The display
 * transform is not linear (highlights are compressed), so the star cannot be
 * tone-mapped by itself and added to the picture: in front of a sky that outshines
 * it a hundredfold it would stay as visible as in front of a dark one. The shader
 * therefore evaluates the sky in the star's own direction and writes the
 * difference display(sky + star) − display(sky), which the additive blend puts on
 * top of the sky already drawn. A star lost in the glow of the sky then adds
 * nothing, as it should.
 */

import { ATLAS_ROW, ATLAS_ROWS } from '@/physics/spectralAtlas';
import { ATLAS_SAMPLING, BOOST_MATH, COMMON_UNIFORMS, DISPLAY_TRANSFORM, SKY_RADIANCE } from './chunks';

const BLACKBODY_ROW = ((ATLAS_ROW.blackbody + 0.5) / ATLAS_ROWS).toFixed(6);

export const starVertexShader = /* glsl */ `
  ${COMMON_UNIFORMS}
  uniform vec3 uObserver;
  uniform float uPointSize;      // diameter of the point-spread function, device pixels
  uniform float uLnStarNorm;     // ln of 1 / (solid angle covered by the point-spread function)

  attribute vec3 aStar;          // (ln of rest illuminance in reference units, ln T, atlas ln-luminance at T)

  varying vec3 vRadiance;
  varying vec3 vSky;             // radiance of the sky behind the star

  ${BOOST_MATH}
  ${ATLAS_SAMPLING}
  ${SKY_RADIANCE}

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

    vec4 body = texture2D(uAtlas, vec2((aStar.y + lnD - uAtlasAxis.z) * uAtlasAxis.w, ${BLACKBODY_ROW}));
    float lnFlux = aStar.x + (body.a - aStar.z) - 2.0 * lnD + uLnStarNorm + uLnExposure;
    vRadiance = body.rgb * exp(min(lnFlux, 12.0));
    vSky = skyRadiance(rest.y / max(length(rest.xz), 1e-5), lnD);

    vec4 clip = projectionMatrix * viewMatrix * vec4(uObserver + direction, 1.0);
    gl_Position = clip.xyww;
    gl_PointSize = uPointSize;
  }
`;

export const starFragmentShader = /* glsl */ `
  varying vec3 vRadiance;
  varying vec3 vSky;

  ${DISPLAY_TRANSFORM}

  void main() {
    vec2 p = (gl_PointCoord - 0.5) * 2.0;
    float falloff = exp(-4.0 * dot(p, p));
    if (falloff < 0.02) discard;
    // the increment the star makes on the display over the sky behind it (the dither cancels)
    gl_FragColor = vec4(toDisplay(vSky + vRadiance * falloff) - toDisplay(vSky), 1.0);
  }
`;
