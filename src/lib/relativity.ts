export const SPEED_OF_LIGHT_MPS = 299_792_458; // exact m/s
export const SPEED_OF_LIGHT_KMS = 299_792.458; // exact km/s
export const SPEED_OF_LIGHT_KMH = 1_079_252_848.8; // exact km/h
export const EARTH_CIRCUMFERENCE_KM = 40_075.0; // km at equator
export const MAX_BETA = 0.99999;
export const DEFAULT_EMIT_WAVELENGTH_NM = 560; // Streetlamp reference (nm)

export const CAR_REST_LENGTH_M = 4.60; // Standard sports car length in meters
export const CAR_REST_WIDTH_M = 1.90; // Car width in meters (invariant)
export const CAR_REST_HEIGHT_M = 1.40; // Car height in meters (invariant)
export const CAR_REST_MASS_KG = 1500; // 1.5 metric tons

export interface ThirdPersonObjectState {
  restLengthM: number;
  contractedLengthM: number;
  lengthContractionPercent: number;
  widthM: number;
  heightM: number;
  restMassKg: number;
  relativisticMassKg: number;
  kineticEnergyJoules: number;
  kineticEnergyMegatonsTnt: number;
  terrellRotationAngleDeg: number;
}

export function computeThirdPersonCarState(gamma: number, beta: number): ThirdPersonObjectState {
  const contractedLengthM = CAR_REST_LENGTH_M / gamma;
  const lengthContractionPercent = (1 - 1 / gamma) * 100;
  const relativisticMassKg = CAR_REST_MASS_KG * gamma;
  const c2 = SPEED_OF_LIGHT_MPS * SPEED_OF_LIGHT_MPS;
  const kineticEnergyJoules = Math.max(0, (gamma - 1)) * CAR_REST_MASS_KG * c2;
  const kineticEnergyMegatonsTnt = kineticEnergyJoules / 4.184e15;
  const terrellRotationAngleDeg = (Math.asin(Math.min(1, beta)) * 180) / Math.PI;

  return {
    restLengthM: CAR_REST_LENGTH_M,
    contractedLengthM,
    lengthContractionPercent,
    widthM: CAR_REST_WIDTH_M,
    heightM: CAR_REST_HEIGHT_M,
    restMassKg: CAR_REST_MASS_KG,
    relativisticMassKg,
    kineticEnergyJoules,
    kineticEnergyMegatonsTnt,
    terrellRotationAngleDeg,
  };
}

export interface RelativisticState {
  beta: number; // v / c in [0, 0.99999]
  gamma: number; // 1 / sqrt(1 - beta^2)
  contractionRatio: number; // L / L0 = 1 / gamma
  timeDilationRatio: number; // d_tau / dt = 1 / gamma
  velocityMps: number; // v in m/s (metre / saniye)
  velocityKms: number; // v in km/s (kilometre / saniye)
  velocityKmh: number; // v in km/h (kilometre / saat)
  earthOrbitsPerSec: number; // How many times per second around Earth's equator
  dopplerForward: number; // sqrt((1 + beta) / (1 - beta))
  dopplerBackward: number; // sqrt((1 - beta) / (1 + beta))
  dopplerTransverse: number; // 1 / gamma
  wavelengthForwardNm: number; // lambda_emit / D_forward
  wavelengthBackwardNm: number; // lambda_emit / D_backward
  aberrationSideAngleDeg: number; // Apparent angle theta' of an object at rest-frame 90 deg
  aberrationRear135Deg: number; // Apparent angle theta' of an object at rest-frame 135 deg
  aberrationRear170Deg: number; // Apparent angle theta' of an object at rest-frame 170 deg
  searchlightConeHalfAngleDeg: number; // Half-angle of forward hemisphere compression
  rapidity: number; // artanh(beta)
}

export interface PresetThreshold {
  id: string;
  beta: number;
  labelTr: string;
  labelEn: string;
  subtitleTr: string;
  subtitleEn: string;
  shortTag: string;
  gammaLabel: string;
}

export const RELATIVISTIC_PRESETS: PresetThreshold[] = [
  {
    id: 'rest',
    beta: 0.0,
    labelTr: '0c • Durağan',
    labelEn: '0c • Stationary',
    subtitleTr: '0 m/sn (Normal Dünya)',
    subtitleEn: '0 m/s (Normal World)',
    shortTag: '0c',
    gammaLabel: 'γ = 1.00',
  },
  {
    id: 'half',
    beta: 0.5,
    labelTr: '0.5c • Yarı Işık Hızı',
    labelEn: '0.5c • Half Light Speed',
    subtitleTr: '149.896 km/sn',
    subtitleEn: '149,896 km/s',
    shortTag: '0.5c',
    gammaLabel: 'γ = 1.15',
  },
  {
    id: 'gamma2',
    beta: 0.8660254,
    labelTr: '0.866c • Kritik Eşik',
    labelEn: '0.866c • Critical Threshold',
    subtitleTr: 'Zaman & Uzay Yarıya İner (γ=2)',
    subtitleEn: 'Time & Space Halved (γ=2)',
    shortTag: '0.866c',
    gammaLabel: 'γ = 2.00',
  },
  {
    id: 'ultra',
    beta: 0.99,
    labelTr: '0.99c • Tünel Görüşü',
    labelEn: '0.99c • Tunnel Vision',
    subtitleTr: '296.795 km/sn (γ=7.09)',
    subtitleEn: '296,795 km/s (γ=7.09)',
    shortTag: '0.99c',
    gammaLabel: 'γ = 7.09',
  },
  {
    id: 'photon',
    beta: 0.9999,
    labelTr: '0.9999c • Foton Limiti',
    labelEn: '0.9999c • Photon Limit',
    subtitleTr: '299.762 km/sn (γ=70.7)',
    subtitleEn: '299,762 km/s (γ=70.7)',
    shortTag: '0.9999c',
    gammaLabel: 'γ = 70.71',
  },
];

/**
 * Maps normalized scroll/slider progress s in [0, 1] to beta in [0, 0.99999]
 * with logarithmic precision in the relativistic regime (0.9c -> 0.99999c).
 */
export function sliderToBeta(s: number): number {
  const clamped = Math.max(0, Math.min(1, s));
  if (clamped <= 0) return 0;
  if (clamped <= 0.5) {
    const t = clamped / 0.5;
    return 0.9 * Math.pow(t, 1.15);
  } else {
    const u = (clamped - 0.5) / 0.5;
    const exponent = 1 + 4 * u;
    const beta = 1 - Math.pow(10, -exponent);
    return Math.min(MAX_BETA, Math.max(0, beta));
  }
}

/**
 * Exact inverse of sliderToBeta: maps beta in [0, 0.99999] back to s in [0, 1].
 */
export function betaToSlider(beta: number): number {
  const b = Math.max(0, Math.min(MAX_BETA, beta));
  if (b <= 0) return 0;
  if (b <= 0.9) {
    const t = Math.pow(b / 0.9, 1 / 1.15);
    return 0.5 * t;
  } else {
    const oneMinusBeta = Math.max(1e-5, 1 - b);
    const exponent = -Math.log10(oneMinusBeta);
    const u = (exponent - 1) / 4;
    return Math.min(1, Math.max(0.5, 0.5 + 0.5 * u));
  }
}

export function computeGamma(beta: number): number {
  const b = Math.max(0, Math.min(MAX_BETA, beta));
  return 1 / Math.sqrt(Math.max(1e-12, 1 - b * b));
}

export function computeAberratedViewingAngleRad(thetaRestRad: number, beta: number): number {
  const cosTheta = Math.cos(thetaRestRad);
  const cosThetaPrime = (cosTheta + beta) / (1 + beta * cosTheta);
  return Math.acos(Math.max(-1, Math.min(1, cosThetaPrime)));
}

export function computeRelativisticState(
  rawBeta: number,
  emitWavelengthNm: number = DEFAULT_EMIT_WAVELENGTH_NM
): RelativisticState {
  const beta = Math.max(0, Math.min(MAX_BETA, rawBeta));
  const gamma = computeGamma(beta);
  const contractionRatio = 1 / gamma;
  const timeDilationRatio = 1 / gamma;

  const velocityMps = beta * SPEED_OF_LIGHT_MPS;
  const velocityKms = beta * SPEED_OF_LIGHT_KMS;
  const velocityKmh = beta * SPEED_OF_LIGHT_KMH;
  const earthOrbitsPerSec = velocityKms / EARTH_CIRCUMFERENCE_KM;

  const dopplerForward = Math.sqrt((1 + beta) / Math.max(1e-12, 1 - beta));
  const dopplerBackward = Math.sqrt(Math.max(0, 1 - beta) / (1 + beta));
  const dopplerTransverse = 1 / gamma;

  const wavelengthForwardNm = emitWavelengthNm / dopplerForward;
  const wavelengthBackwardNm = emitWavelengthNm / Math.max(1e-6, dopplerBackward);

  const aberrationSideAngleDeg = (Math.acos(Math.min(1, beta)) * 180) / Math.PI;
  const aberrationRear135Deg =
    (computeAberratedViewingAngleRad((135 * Math.PI) / 180, beta) * 180) / Math.PI;
  const aberrationRear170Deg =
    (computeAberratedViewingAngleRad((170 * Math.PI) / 180, beta) * 180) / Math.PI;

  const searchlightConeHalfAngleDeg = aberrationSideAngleDeg;
  const rapidity = 0.5 * Math.log((1 + beta) / Math.max(1e-12, 1 - beta));

  return {
    beta,
    gamma,
    contractionRatio,
    timeDilationRatio,
    velocityMps,
    velocityKms,
    velocityKmh,
    earthOrbitsPerSec,
    dopplerForward,
    dopplerBackward,
    dopplerTransverse,
    wavelengthForwardNm,
    wavelengthBackwardNm,
    aberrationSideAngleDeg,
    aberrationRear135Deg,
    aberrationRear170Deg,
    searchlightConeHalfAngleDeg,
    rapidity,
  };
}

export function wavelengthToColorInfo(
  wavelengthNm: number,
  lang: 'tr' | 'en'
): { hex: string; bandName: string; isInvisible: boolean } {
  if (wavelengthNm < 10) {
    return {
      hex: '#e0e7ff',
      bandName: lang === 'tr' ? 'X-Işını / Gama (Aşırı Maviye Kayma)' : 'X-Ray / Gamma (Extreme Blueshift)',
      isInvisible: true,
    };
  }
  if (wavelengthNm < 380) {
    return {
      hex: '#8b5cf6',
      bandName: lang === 'tr' ? 'Morötesi (UV - Maviye Kayma)' : 'Ultraviolet (UV Blueshift)',
      isInvisible: true,
    };
  }
  if (wavelengthNm < 435) {
    return {
      hex: '#7c3aed',
      bandName: lang === 'tr' ? 'Mor (Görünür Spektrum)' : 'Violet (Visible)',
      isInvisible: false,
    };
  }
  if (wavelengthNm < 485) {
    return {
      hex: '#3b82f6',
      bandName: lang === 'tr' ? 'Mavi (Blueshift)' : 'Blue (Blueshift)',
      isInvisible: false,
    };
  }
  if (wavelengthNm < 510) {
    return {
      hex: '#06b6d4',
      bandName: lang === 'tr' ? 'Camgöbeği / Cyan' : 'Cyan',
      isInvisible: false,
    };
  }
  if (wavelengthNm < 565) {
    return {
      hex: '#22c55e',
      bandName: lang === 'tr' ? 'Yeşil-Sarı (Normal Sokak Işığı)' : 'Green-Yellow (Normal Lamp)',
      isInvisible: false,
    };
  }
  if (wavelengthNm < 590) {
    return {
      hex: '#eab308',
      bandName: lang === 'tr' ? 'Sarı (Sodyum Lambası)' : 'Yellow (Sodium Lamp)',
      isInvisible: false,
    };
  }
  if (wavelengthNm < 625) {
    return {
      hex: '#f97316',
      bandName: lang === 'tr' ? 'Turuncu (Kızıla Kayma)' : 'Orange (Redshift)',
      isInvisible: false,
    };
  }
  if (wavelengthNm <= 740) {
    return {
      hex: '#ef4444',
      bandName: lang === 'tr' ? 'Koyu Kırmızı (Redshift)' : 'Deep Red (Redshift)',
      isInvisible: false,
    };
  }
  if (wavelengthNm <= 3000) {
    return {
      hex: '#7f1d1d',
      bandName: lang === 'tr' ? 'Yakın Kızılötesi (Gözle Görülmez / Kararma)' : 'Near-Infrared (Invisible / Dimming)',
      isInvisible: true,
    };
  }
  return {
    hex: '#310808',
    bandName: lang === 'tr' ? 'Uzak Kızılötesi / Mikrodalga (Zifiri Karanlık)' : 'Far-IR / Microwave (Pitch Dark)',
    isInvisible: true,
  };
}

export function formatBeta(beta: number): string {
  if (beta === 0) return '0.00000';
  if (beta < 0.9) return beta.toFixed(4);
  if (beta < 0.99) return beta.toFixed(4);
  return beta.toFixed(5);
}

export function formatGamma(gamma: number): string {
  if (gamma < 10) return gamma.toFixed(3);
  if (gamma < 100) return gamma.toFixed(2);
  return gamma.toFixed(1);
}
