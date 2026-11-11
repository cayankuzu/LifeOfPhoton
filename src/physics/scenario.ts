/**
 * The modelled scene: every assumption about its light field that is NOT a law of
 * physics lives here.
 *
 * The relativistic transformation itself (optics.ts) is exact. What it is applied
 * to — the light field of a night-time city — has to be modelled, and a model is
 * only honest if its assumptions are stated. Each entry gives a value, the reason
 * for it and, where one exists, its source. The dossier renders this table.
 */

import { ILLUMINANT_A_TEMPERATURE_K, STANDARD_ATMOSPHERE_TEMPERATURE_K } from './constants';

export const SCENARIO = {
  /**
   * Scale of the scene. Covering 720 m of avenue at 0.99c takes 2.4 µs, so the
   * playback is slowed down: light crosses the scene at `visualLightSpeed` metres
   * per displayed second. Equivalently the display runs c / visualLightSpeed ≈
   * 6.2 × 10⁶ times slower than reality (the device of Gamow's "Mr Tompkins",
   * 1939, and of the MIT Game Lab's "A Slower Speed of Light", 2012). All dimensionless
   * quantities — β, γ, D, every angle and every colour — are unaffected.
   */
  visualLightSpeed: 48,

  camera: {
    /** Height of the observer's eye above the road surface, m. */
    eyeHeight: 1.65,
    /** Vertical field of view of the ×1 lens, degrees. */
    fieldOfViewDeg: 65,
    /**
     * Fixed white balance, K. Set to the colour temperature of the dominant
     * illuminant at rest so the city looks neutral at β = 0; it is never adapted
     * afterwards, otherwise the camera would cancel the Doppler shift it is meant
     * to show.
     */
    whiteBalanceK: 4100,
  },

  /** Full Moon: the broadband (thermal-spectrum) light source of the scene. */
  moon: {
    /**
     * Moonlight is sunlight reflected by a slightly reddish surface. Its correlated
     * colour temperature is commonly quoted as 4000–4150 K (no primary measurement with
     * an uncertainty was found); it is modelled as a Planck spectrum of 4100 K.
     */
    colourTemperatureK: 4100,
    /**
     * Illuminance of a high full Moon, lux. Kyba, Mohar & Posch (2017, Astron. Geophys.
     * 58, 1.31): 0.05–0.2 lx for most full Moons at mid-latitudes, ≈ 0.3 lx at most.
     */
    illuminanceLux: 0.2,
    /** Mean angular radius of the lunar disc, degrees (mean diameter 31.1′). */
    angularRadiusDeg: 0.259,
    /**
     * Moonlight scattered by the sky reaches every surface, whatever way it faces:
     * this share of the direct illuminance is added as a diffuse term.
     */
    skyFillFraction: 0.22,
    /** Position in the sky: azimuth measured from the direction of travel, and elevation, degrees. */
    azimuthDeg: 5,
    elevationDeg: 27,
  },

  /** Street lighting: the band-limited light source of the scene. */
  street: {
    /**
     * Average horizontal illuminance of the carriageway, lux: the maintained average
     * that lighting class C2 of EN 13201-2:2015 requires. It is the reference of the
     * renderer — the unit of radiance is the luminance of a perfect white diffuser
     * under this illuminance — and the intensity of the luminaires is set so that
     * the modelled street receives it (src/scene/geometry/lighting.ts). The luminance
     * of a luminaire's emitting face is therefore not an assumption of its own: it
     * follows from that intensity and the size of the face in the lamp model.
     */
    illuminanceLux: 20,
    /**
     * Phosphor-converted white LED, CCT ≈ 4000 K: a narrow InGaN pump line plus a
     * broad, asymmetric phosphor band. Its emission is confined to ≈ 420–780 nm —
     * there is no infrared or ultraviolet tail to shift into the visible.
     */
    led: {
      pumpPeakNm: 450,
      pumpFwhmNm: 22,
      phosphorPeakNm: 570,
      phosphorSigmaBelowNm: 40,
      phosphorSigmaAboveNm: 58,
      /** Height of the pump line relative to the phosphor peak. */
      pumpToPhosphorRatio: 1.15,
    },
  },

  /** Lit windows: tungsten-like interior light, a true thermal emitter. */
  interior: {
    /** CIE standard illuminant A. */
    colourTemperatureK: ILLUMINANT_A_TEMPERATURE_K,
    /** Mean luminance of a lit window seen from the street, cd/m². */
    windowLuminanceCdM2: 4,
    /** Fraction of windows that are lit. */
    litFraction: 0.42,
    /** Lit rooms are not equally bright: the luminance above is scaled by a factor between these limits. */
    levelRange: [0.45, 1.95],
  },

  /** LED traffic signals: quasi-monochromatic emitters. */
  signals: {
    /** Dominant wavelengths of LED signal modules, nm. */
    redNm: 626,
    amberNm: 590,
    greenNm: 505,
    /** Luminance of the lit lens, cd/m². */
    luminanceCdM2: 8000,
    /** Spectral width (standard deviation) of the emission line as observed, nm. */
    lineSigmaNm: 8,
  },

  /**
   * Thermal self-emission. Everything at ambient temperature radiates in the far
   * infrared; a large enough blueshift brings that radiation into the visible.
   */
  environment: {
    /** International Standard Atmosphere at sea level, 15 °C. */
    temperatureK: STANDARD_ATMOSPHERE_TEMPERATURE_K,
    /** Long-wave emissivity of asphalt, concrete, brick and glass: 0.85–0.96 (Incropera et al., Table A.11). */
    surfaceEmissivity: 0.92,
    /** Broadband emissivity of the clear night sky at 288 K (Swinbank 1963: ε ≈ 9.4 × 10⁻⁶ T²). */
    skyEmissivity: 0.78,
  },

  /** The star field. */
  stars: {
    count: 2600,
    /** Faintest magnitude generated. */
    limitingMagnitude: 5.8,
    /**
     * Stars are far too faint to register in an exposure set for street lighting.
     * Their flux is multiplied by this factor so that they are visible at all; the
     * relative brightnesses and the relativistic transformation are untouched.
     */
    visibilityGain: 60,
  },

  /**
   * The night sky over a lit city: the glow of the city's own lighting, scattered by
   * the air. It has the spectrum of the street LEDs, weighted towards the blue because
   * air scatters short wavelengths more strongly.
   */
  sky: {
    /** Glow at the zenith, in units of the reference luminance. */
    glowZenith: 0.0016,
    /** Additional glow at the horizon, and its e-folding in the tangent of the elevation. */
    glowHorizon: 0.02,
    glowFalloff: 6,
    /** Spectral weighting of the glow, as the reflectance of a bluish scatterer. */
    glowTint: [0.42, 0.62, 1.0],
  },

  /** The ground beyond the models of the avenue: a dark, diffusely reflecting plane. */
  ground: {
    albedo: [0.075, 0.08, 0.09],
    /** Street light that spills onto it next to the avenue, as a fraction of the reference illuminance, and the distance over which it fades, m. */
    ledFill: 0.06,
    ledFillRangeM: 260,
  },

  /**
   * Diffuse, band-limited light scattered back from the city onto unlit surfaces, as a
   * fraction of the street illuminance: a stand-in for inter-reflection. It decreases
   * with height towards the share `ambientLedAloft` of its value at street level.
   */
  ambientLedFraction: 0.02,
  ambientLedAloft: 0.55,
  ambientLedScaleHeightM: 14,
} as const;

/** Luminance of a perfect white diffuser under the reference street illuminance, cd/m² — the renderer's unit of radiance. */
export const REFERENCE_LUMINANCE_CD_M2 = SCENARIO.street.illuminanceLux / Math.PI;

/**
 * Luminance of the lunar disc, cd/m². Not an assumption of its own: a uniform disc of
 * angular radius R that delivers the illuminance E on a surface facing it has the
 * luminance E / (π sin²R) — about 3100 cd/m² for the values above, at the upper end
 * of what is quoted for a high full Moon.
 */
export const MOON_DISC_LUMINANCE_CD_M2 =
  SCENARIO.moon.illuminanceLux / (Math.PI * Math.sin((SCENARIO.moon.angularRadiusDeg * Math.PI) / 180) ** 2);

/** Ratio between real time and displayed time. */
export function slowMotionFactor(speedOfLight: number): number {
  return speedOfLight / SCENARIO.visualLightSpeed;
}
