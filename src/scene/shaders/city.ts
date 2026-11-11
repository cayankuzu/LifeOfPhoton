/**
 * Material of the city geometry.
 *
 * Vertex stage — geometry. Each vertex is moved from its rest-frame direction to
 * the direction the moving observer sees it in (relativistic aberration), keeping
 * its rest-frame distance so that the depth buffer still resolves occlusion along
 * every ray. Because the scene is static in its rest frame, this IS the complete
 * light-travel-time picture: Terrell rotation, the curving of straight lines and
 * the forward crowding of the world all follow from this one transformation.
 *
 * Fragment stage — radiometry. Per pixel the Doppler factor is computed from the
 * pixel's own viewing ray, and every contribution to the light arriving from the
 * surface is looked up in the spectral atlas at that Doppler factor. All lighting
 * inputs (normal, albedo, irradiance) are rest-frame quantities.
 */

import { SCENARIO } from '@/physics/scenario';
import { EMITTER } from '../emitters';
import { MEASURING_GRID_M } from '../geometry/layout';
import { ATLAS_SAMPLING, BOOST_MATH, COMMON_UNIFORMS, DISPLAY_TRANSFORM, glslFloat } from './chunks';

/** The diffuse moonlight a surface receives, as a share of uSkyFill: linear in n.y, 1 facing up (scenario.ts). */
const FILL_DOWN = SCENARIO.moon.skyFillFacingDown;
const FILL_MEAN = glslFloat((1 + FILL_DOWN) / 2);
const FILL_SLOPE = glslFloat((1 - FILL_DOWN) / 2);

/** Upper bound of an emitter code in the comparisons below (codes are interpolated floats). */
const below = (code: number): string => (code + 0.5).toFixed(1);

export const cityVertexShader = /* glsl */ `
  ${COMMON_UNIFORMS}
  uniform vec3 uObserver;        // world position of the observer's eye

  attribute vec3 color;          // linear albedo
  attribute vec3 aSurface;       // (LED irradiance, emitter code, emitter level)

  varying vec3 vRestRel;
  varying vec3 vApparent;
  varying vec3 vNormal;
  varying vec3 vAlbedo;
  varying vec3 vSurface;

  ${BOOST_MATH}

  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vec3 rel = world.xyz - uObserver;
    vRestRel = rel;
    vNormal = normal;            // chunks are only ever translated
    vAlbedo = color;
    vSurface = aSurface;

    float a;
    float b;
    float r;
    float doppler = dopplerOfRestDisplacement(rel, a, b, r);

    // seen: aberrated direction at the rest-frame distance
    vec3 seen = vec3(rel.xy / doppler, -r * (a - b) / (a + b));
    // measured: simultaneity slice of the observer's frame — pure Lorentz contraction along the motion
    vec3 measured = vec3(rel.xy, rel.z / uGamma);

    vec3 apparent = mix(measured, seen, uOptical);
    vApparent = apparent;
    gl_Position = projectionMatrix * viewMatrix * vec4(uObserver + apparent, 1.0);
  }
`;

export const cityFragmentShader = /* glsl */ `
  ${COMMON_UNIFORMS}
  uniform vec3 uMoonDirection;     // unit vector towards the Moon (rest frame)
  uniform float uMoonIrradiance;   // moonlight on a surface facing the Moon, reference units
  uniform float uSkyFill;          // diffuse fraction of the moonlight reaching every surface
  uniform float uLnAmbientT;       // ln of the ambient temperature
  uniform float uLnEmissivity;     // ln of the long-wave emissivity of surfaces
  uniform float uLnWindowT;        // ln of the colour temperature of interior light
  uniform float uLnWindow;         // ln of window luminance / luminance of a black body at that temperature
  uniform float uLnLuminaire;      // ln of the luminance of a street luminaire, reference units
  uniform float uLnSignal;         // ln of the luminance of a lit signal lens, reference units
  uniform vec3 uSignalNm;          // rest wavelengths of the red, amber and green signals
  uniform vec2 uFadeAhead;         // rest-frame distance ahead over which the model dissolves (start, end)
  uniform vec2 uFadeBehind;        // the same behind the observer
  uniform float uCoverage;         // 1 = the framebuffer is multisampled, dissolve by coverage
  uniform float uOdometer;         // distance travelled, modulo the grid period
  uniform float uGrid;             // 1 = draw the measuring grid on the ground

  varying vec3 vRestRel;
  varying vec3 vApparent;
  varying vec3 vNormal;
  varying vec3 vAlbedo;
  varying vec3 vSurface;

  ${BOOST_MATH}
  ${ATLAS_SAMPLING}
  ${DISPLAY_TRANSFORM}

  void main() {
    // The model is a finite sample of an endless avenue: dissolve it at both ends.
    float along = -vRestRel.z;
    float keep = (1.0 - smoothstep(uFadeAhead.x, uFadeAhead.y, along)) * (1.0 - smoothstep(uFadeBehind.x, uFadeBehind.y, -along));
    if (keep <= 0.0) discard;
    float grain = ditherNoise(gl_FragCoord.xy + 17.0);
    // without multisampling the dissolve falls back to an ordered dither
    if (uCoverage < 0.5 && keep < grain) discard;

    // Doppler factor of this pixel's own ray: the interpolated apparent position lies
    // exactly on it, so the result is exact however coarse the triangle is.
    vec3 ray = normalize(vApparent);
    float plus;
    float minus;
    onePlusMinusCos(-ray.z, dot(ray.xy, ray.xy), 1.0, plus, minus);
    float doppler = 2.0 / (uGamma * (uOneMinusBeta * plus + uOnePlusBeta * minus));
    float lnD = log(doppler) * uOptical;

    vec3 n = normalize(vNormal);
    if (!gl_FrontFacing) n = -n;

    // --- reflected light: band-limited street LEDs and broadband moonlight
    float moon = uMoonIrradiance * (max(dot(n, uMoonDirection), 0.0) + uSkyFill * (${FILL_MEAN} + ${FILL_SLOPE} * n.y));
    vec3 radiance = reflectedLed(vAlbedo, lnD) * vSurface.x + reflectedMoon(vAlbedo, lnD) * moon;

    // --- thermal self-emission: a grey body at ambient temperature, seen at D·T
    radiance += uThermal * uOptical * blackbody(uLnAmbientT + lnD, uLnEmissivity);

    // --- emitters
    float code = vSurface.y;
    if (code > ${below(EMITTER.none)}) {
      float lnLevel = log(max(vSurface.z, 1e-4));
      if (code < ${below(EMITTER.window)}) {
        radiance += blackbody(uLnWindowT + lnD, uLnWindow + lnLevel);
      } else if (code < ${below(EMITTER.luminaire)}) {
        radiance += reflectedLed(vec3(1.0), lnD) * exp(uLnLuminaire + lnLevel);
      } else {
        float nm = code < ${below(EMITTER.signalRed)} ? uSignalNm.x : (code < ${below(EMITTER.signalAmber)} ? uSignalNm.y : uSignalNm.z);
        radiance += lineEmitter(nm, lnD, uLnSignal + lnLevel);
      }
    }

    // --- measuring grid (measured view only): a line every MEASURING_GRID_M of REST length along the avenue
    if (uGrid > 0.5 && n.y > 0.9) {
      float s = (uOdometer + along) / ${glslFloat(MEASURING_GRID_M)};
      float line = 1.0 - smoothstep(0.0, 1.5, abs(fract(s - 0.5) - 0.5) / max(fwidth(s), 1e-5));
      float major = 1.0 - smoothstep(0.0, 1.5, abs(fract(s / 5.0 - 0.5) - 0.5) / max(fwidth(s / 5.0), 1e-5));
      radiance += vec3(0.95, 0.62, 0.12) * exp(uLnExposure) * (0.22 * line + 0.5 * major);
    }

    // With multisampling the dissolve is carried by the sample coverage (alpha to coverage). Outside the
    // two dissolving ends the alpha must be exactly one: anything less drops samples and leaves a grain
    // on every surface.
    float alpha = (uCoverage < 0.5 || keep >= 1.0) ? 1.0 : clamp(keep + (grain - 0.5) * 0.25, 0.0, 1.0);
    gl_FragColor = vec4(toDisplay(radiance), alpha);
  }
`;
