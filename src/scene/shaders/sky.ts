/**
 * Everything beyond the models of the avenue — the night sky, the Moon and the
 * ground plane — evaluated per pixel. None of it is geometry: the sky is a
 * radiance that depends on direction only, the ground an infinite plane.
 *
 * For each pixel the view direction n′ of the observer is traced back into the
 * rest frame (inverse aberration), the rest-frame world is evaluated in that
 * direction, and the light found there is transformed with the Doppler factor of
 * the ray. This is exact per pixel: no tessellation is involved.
 */

import { SCENARIO } from '@/physics/scenario';
import { ATLAS_SAMPLING, BOOST_MATH, COMMON_UNIFORMS, DISPLAY_TRANSFORM, SKY_RADIANCE, glslFloat, glslVec3 } from './chunks';
import { STAR_RADIANCE_LOOKUP } from './stars';

const { ground } = SCENARIO;

export const skyVertexShader = /* glsl */ `
  uniform vec3 uObserver;
  varying vec3 vDirection;

  void main() {
    vDirection = position;
    vec4 clip = projectionMatrix * viewMatrix * vec4(uObserver + position, 1.0);
    gl_Position = clip.xyww; // pinned to the far plane: drawn only where no geometry is
  }
`;

export const skyFragmentShader = /* glsl */ `
  ${COMMON_UNIFORMS}
  uniform vec3 uMoonDirection;
  uniform float uMoonRadius;       // angular radius of the lunar disc, rad
  uniform float uLnMoonT;          // ln of the colour temperature of moonlight
  uniform float uLnMoonDisc;       // ln of (disc luminance / luminance of a black body at that temperature)
  uniform float uLnMoonSurfaceT;   // ln of the temperature of the sunlit lunar surface
  uniform float uLnMoonEmissivity; // ln of its long-wave emissivity
  uniform float uMoonIrradiance;
  uniform float uSkyFill;
  uniform float uLnEmissivity;
  uniform float uEyeHeight;
  uniform float uOdometer;
  uniform float uGrid;

  varying vec3 vDirection;

  ${BOOST_MATH}
  ${ATLAS_SAMPLING}
  ${SKY_RADIANCE}
  ${STAR_RADIANCE_LOOKUP}
  ${DISPLAY_TRANSFORM}

  void main() {
    vec3 seen = normalize(vDirection);

    // --- inverse aberration: observer-frame direction -> rest-frame direction and Doppler factor
    float plus;
    float minus;
    onePlusMinusCos(-seen.z, dot(seen.xy, seen.xy), 1.0, plus, minus);
    float a = uOneMinusBeta * plus;
    float b = uOnePlusBeta * minus;
    float doppler = 2.0 / (uGamma * (a + b));
    vec3 restSeen = vec3(seen.xy * doppler, -(a - b) / (a + b));
    // measured view: the linear map z' = z/γ, inverted for directions
    vec3 restMeasured = normalize(vec3(seen.xy, seen.z * uGamma));
    vec3 d = normalize(mix(restMeasured, restSeen, uOptical));
    float lnD = log(doppler) * uOptical;

    vec3 radiance = vec3(0.0);
    float thermal = uThermal * uOptical;

    if (d.y > 0.0) {
      // night sky: the glow of the city's LEDs and the atmosphere's own thermal emission
      radiance += skyRadiance(d.y / max(length(d.xz), 1e-5), lnD);
      // the Moon: a uniform disc, anti-aliased over one pixel footprint while it is resolved
      float sine = length(cross(d, uMoonDirection));
      float angle = dot(d, uMoonDirection) > 0.0 ? asin(clamp(sine, 0.0, 1.0)) : 3.14159265;
      float footprint = max(fwidth(angle), 1e-7);
      float resolved = 1.0 - smoothstep(uMoonRadius - footprint, uMoonRadius + footprint, angle);
      // Aberration shrinks the disc: at the top of the range it is a hundredth of a pixel across. Below
      // about a pixel it is a point source, and an edge filter would draw it far too bright: its light
      // L·Ω is then spread over the footprint of the pixel instead, which conserves the flux.
      float ratio = uMoonRadius / footprint;
      float spread = max(footprint, uMoonRadius);
      float unresolved = min(ratio * ratio, 1.0) * exp(-(angle * angle) / (spread * spread));
      float disc = mix(unresolved, resolved, smoothstep(0.75, 2.0, ratio));
      // reflected sunlight, and the surface's own thermal emission, which outshines it above D ≈ 5.5
      radiance += disc * (blackbody(uLnMoonT + lnD, uLnMoonDisc) + thermal * blackbody(uLnMoonSurfaceT + lnD, uLnMoonEmissivity));
    } else {
      // the ground beyond the avenue: a dark plane, moonlit from above
      float range = uEyeHeight / max(-d.y, 1e-4);
      vec2 ground = d.xz * range;
      vec3 soil = ${glslVec3(ground.albedo)};
      float falloff = exp(-length(ground) / ${glslFloat(ground.ledFillRangeM)});
      radiance += reflectedMoon(soil, lnD) * uMoonIrradiance * (uMoonDirection.y + uSkyFill);
      radiance += reflectedLed(soil, lnD) * ${glslFloat(ground.ledFill)} * falloff;
      radiance += thermal * blackbody(uLnAmbientT + lnD, uLnEmissivity);

      if (uGrid > 0.5) {
        // measuring grid: squares of 10 m REST length, which the contraction turns into slabs
        vec2 s = vec2(ground.x, uOdometer - ground.y) / 10.0;
        vec2 w = max(fwidth(s), vec2(1e-5));
        vec2 fine = 1.0 - smoothstep(vec2(0.0), vec2(1.5), abs(fract(s - 0.5) - 0.5) / w);
        float major = 1.0 - smoothstep(0.0, 1.5, abs(fract(s.y / 5.0 - 0.5) - 0.5) / max(fwidth(s.y / 5.0), 1e-5));
        float fade = exp(-range / 420.0);
        radiance += vec3(0.95, 0.62, 0.12) * exp(uLnExposure) * fade * (0.16 * max(fine.x, fine.y) + 0.4 * major);
      }
    }

    // the stars in front of all this, summed in radiance (see stars.ts)
    radiance += starRadiance();

    gl_FragColor = vec4(toDisplay(radiance), 1.0);
  }
`;
