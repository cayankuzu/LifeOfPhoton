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
 */

import { ATLAS_ROW, ATLAS_ROWS } from '@/physics/spectralAtlas';
import { BOOST_MATH, COMMON_UNIFORMS, DISPLAY_TRANSFORM } from './chunks';

const BLACKBODY_ROW = ((ATLAS_ROW.blackbody + 0.5) / ATLAS_ROWS).toFixed(6);

export const starVertexShader = /* glsl */ `
  ${COMMON_UNIFORMS}
  uniform vec3 uObserver;
  uniform float uPointSize;      // diameter of the point-spread function, device pixels
  uniform float uLnStarNorm;     // ln of 1 / (solid angle covered by the point-spread function)

  attribute vec3 aStar;          // (ln of rest illuminance in reference units, ln T, atlas ln-luminance at T)

  varying vec3 vRadiance;

  ${BOOST_MATH}

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

    vec4 clip = projectionMatrix * viewMatrix * vec4(uObserver + direction, 1.0);
    gl_Position = clip.xyww;
    gl_PointSize = uPointSize;
  }
`;

export const starFragmentShader = /* glsl */ `
  varying vec3 vRadiance;

  ${DISPLAY_TRANSFORM}

  void main() {
    vec2 p = (gl_PointCoord - 0.5) * 2.0;
    float falloff = exp(-4.0 * dot(p, p));
    if (falloff < 0.02) discard;
    gl_FragColor = vec4(toDisplay(vRadiance * falloff), 1.0);
  }
`;
