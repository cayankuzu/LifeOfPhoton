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

import { ATLAS_SAMPLING, BOOST_MATH, COMMON_UNIFORMS, DISPLAY_TRANSFORM } from './chunks';

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
  uniform float uMoonIrradiance;
  uniform float uSkyFill;
  uniform float uLnAmbientT;
  uniform float uLnEmissivity;
  uniform float uLnSkyEmissivity;
  uniform float uEyeHeight;
  uniform float uOdometer;
  uniform float uGrid;
  uniform vec2 uSkyGlow;           // LED sky glow: (zenith level, extra level at the horizon), reference units

  varying vec3 vDirection;

  ${BOOST_MATH}
  ${ATLAS_SAMPLING}
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
      float slope = d.y / max(length(d.xz), 1e-5);          // tan(elevation)
      // night sky: the glow of the city's own band-limited LEDs, strongest near the horizon.
      // Air scatters short wavelengths more strongly, which is what the blue-weighted factor stands for.
      radiance += reflectedLed(vec3(0.42, 0.62, 1.0), lnD) * (uSkyGlow.x + uSkyGlow.y * exp(-slope * 6.0));
      // the atmosphere's own thermal emission
      radiance += thermal * blackbody(uLnAmbientT + lnD, uLnSkyEmissivity);
      // the Moon: a uniform disc, anti-aliased over one pixel footprint
      float sine = length(cross(d, uMoonDirection));
      float angle = dot(d, uMoonDirection) > 0.0 ? asin(clamp(sine, 0.0, 1.0)) : 3.14159265;
      float footprint = max(fwidth(angle), 1e-7);
      float disc = 1.0 - smoothstep(uMoonRadius - footprint, uMoonRadius + footprint, angle);
      radiance += disc * blackbody(uLnMoonT + lnD, uLnMoonDisc);
    } else {
      // the ground beyond the avenue: a dark plane, moonlit from above
      float range = uEyeHeight / max(-d.y, 1e-4);
      vec2 ground = d.xz * range;
      vec3 soil = vec3(0.075, 0.08, 0.09);
      float falloff = exp(-length(ground) / 260.0);
      radiance += reflectedMoon(soil, lnD) * uMoonIrradiance * (uMoonDirection.y + uSkyFill);
      radiance += reflectedLed(soil, lnD) * 0.06 * falloff;
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

    gl_FragColor = vec4(toDisplay(radiance), 1.0);
  }
`;
