import * as THREE from 'three';

export interface RelativisticUniforms {
  uBeta: { value: number };
  uGamma: { value: number };
  uCameraPos: { value: THREE.Vector3 };
  uTime: { value: number };
  uProperTime: { value: number };
  uOpticalMode: { value: number };
}

export function createSharedRelativisticUniforms(): RelativisticUniforms {
  return {
    uBeta: { value: 0.0 },
    uGamma: { value: 1.0 },
    uCameraPos: { value: new THREE.Vector3(0, 1.85, 0) },
    uTime: { value: 0.0 },
    uProperTime: { value: 0.0 },
    uOpticalMode: { value: 1.0 },
  };
}

export const relativisticVertexShader = /* glsl */ `
  uniform float uBeta;
  uniform float uGamma;
  uniform vec3 uCameraPos;
  uniform float uTime;
  uniform float uProperTime;
  uniform float uOpticalMode;

  varying vec3 vWorldPos;
  varying vec3 vRestRelPos;
  varying vec3 vNormal;
  varying vec2 vUv;
  varying float vCosThetaRest;
  varying float vCosThetaPrime;
  varying float vDopplerFactor;

  void main() {
    vUv = uv;
    vNormal = normalize(mat3(modelMatrix) * normal);

    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPosition.xyz;

    // Rest-frame displacement from observer camera to vertex.
    // Observer moves forward along -Z axis: forward unit vector = (0, 0, -1).
    vec3 rel = worldPosition.xyz - uCameraPos;
    vRestRelPos = rel;

    float zForward = -rel.z; // > 0 ahead of observer, < 0 behind observer
    vec2 xyPerp = rel.xy;
    float rPerp = length(xyPerp);
    float r0 = max(0.001, length(rel));

    float cosTheta = clamp(zForward / r0, -1.0, 1.0);
    float sinTheta = clamp(rPerp / r0, 0.0, 1.0);
    vCosThetaRest = cosTheta;

    // Exact physical Relativistic Aberration & Doppler Factor for spectral shift
    float physDenom = max(1e-6, 1.0 + uBeta * cosTheta);
    float physCosThetaPrime = clamp((cosTheta + uBeta) / physDenom, -1.0, 1.0);
    vCosThetaPrime = physCosThetaPrime;
    vDopplerFactor = 1.0 / max(1e-5, uGamma * (1.0 - uBeta * physCosThetaPrime));

    // =========================================================================
    // MODE 0: SADECE UZUNLUK KISALMASI (PURE LORENTZ CONTRACTION L = L0 / gamma)
    // Simultaneous rest-frame coordinates compressed along motion axis Z by 1/gamma.
    // Above gamma = 6, smooth logarithmic compression keeps the 720m looping corridor
    // continuous on screen while clearly demonstrating extreme accordion flattening.
    // =========================================================================
    float gammaGeom = (uGamma <= 6.0) ? uGamma : (6.0 + 3.2 * log(1.0 + (uGamma - 6.0)));
    vec3 geomRel = vec3(xyPerp, -zForward / gammaGeom);

    // =========================================================================
    // MODE 1: GERÇEK OPTİK GÖZLEM (EXACT LORENTZ PAST-LIGHT-CONE TRANSFORMATION)
    // A photon emitted at rest-frame displacement (x, y, -zForward) at t_emit = -r0/c
    // transforms under a Lorentz boost along -Z into observer camera coordinates:
    //   x' = x / (gamma * (1 + beta * cosTheta))
    //   y' = y / (gamma * (1 + beta * cosTheta))
    //   z' = -(zForward + beta * r0) / (1 + beta * cosTheta) = -r0 * cos(theta')
    //
    // Properties of this exact transformation:
    // 1. At beta = 0 (gamma = 1): (x', y', z') == (x, y, -zForward) (100% identity!).
    // 2. Whenever cos(theta') < 0 (behind the observer's aberrated 90° field of view),
    //    z' > 0 (genuinely behind the camera in view space—never reflected forward!).
    // 3. Euclidean length |(x', y', z')| == r0, preserving exact depth occlusion.
    // =========================================================================
    float gammaVis = (uGamma <= 4.0) ? uGamma : (4.0 + 2.8 * log(1.0 + (uGamma - 4.0)));
    float betaVis = (uBeta <= 0.0) ? 0.0 : sqrt(max(0.0, 1.0 - 1.0 / (gammaVis * gammaVis)));

    float visDenom = max(0.025, 1.0 + betaVis * cosTheta);
    vec3 optRel = vec3(
      xyPerp.x / (gammaVis * visDenom),
      xyPerp.y / (gammaVis * visDenom),
      -(zForward + betaVis * r0) / visDenom
    );

    vec3 finalRel = mix(geomRel, optRel, uOpticalMode);
    vec3 finalWorld = uCameraPos + finalRel;

    gl_Position = projectionMatrix * viewMatrix * vec4(finalWorld, 1.0);
  }
`;

export const relativisticFragmentShader = /* glsl */ `
  uniform float uBeta;
  uniform float uGamma;
  uniform vec3 uCameraPos;
  uniform float uTime;
  uniform float uProperTime;
  uniform float uOpticalMode;
  uniform sampler2D uMap;
  uniform float uHasMap;
  uniform vec3 uBaseColor;
  uniform float uEmissiveHint;

  varying vec3 vWorldPos;
  varying vec3 vRestRelPos;
  varying vec3 vNormal;
  varying vec2 vUv;
  varying float vCosThetaRest;
  varying float vCosThetaPrime;
  varying float vDopplerFactor;

  // CIE-inspired physical wavelength (nm) to sRGB conversion
  vec3 wavelengthToRGB(float lambda) {
    vec3 c = vec3(0.0);
    if (lambda < 380.0) {
      float t = clamp((380.0 - lambda) / 220.0, 0.0, 1.0);
      c = mix(vec3(0.45, 0.24, 1.0), vec3(0.86, 0.94, 1.0), t);
    } else if (lambda < 440.0) {
      float t = (lambda - 380.0) / 60.0;
      c = vec3(0.50 * (1.0 - t), 0.16 * t, 1.0);
    } else if (lambda < 490.0) {
      float t = (lambda - 440.0) / 50.0;
      c = vec3(0.0, pow(t, 0.85), 1.0);
    } else if (lambda < 510.0) {
      float t = (lambda - 490.0) / 20.0;
      c = vec3(0.0, 1.0, 1.0 - 0.85 * t);
    } else if (lambda < 580.0) {
      float t = (lambda - 510.0) / 70.0;
      c = vec3(pow(t, 0.9), 1.0, 0.12 * (1.0 - t));
    } else if (lambda < 645.0) {
      float t = (lambda - 580.0) / 65.0;
      c = vec3(1.0, pow(1.0 - t, 0.9), 0.0);
    } else if (lambda <= 750.0) {
      float t = (lambda - 645.0) / 105.0;
      c = vec3(1.0 - 0.80 * t, 0.03 * (1.0 - t), 0.0);
    } else {
      float ir = exp(-(lambda - 750.0) / 280.0);
      c = vec3(0.20 * ir, 0.01 * ir, 0.0);
    }
    return clamp(c, 0.0, 1.0);
  }

  vec3 applyBroadbandDopplerShift(vec3 rgb, float D, float isEmissive) {
    float logD = log(max(1e-4, D));

    float lambdaR = 630.0 / D;
    float lambdaG = 532.0 / D;
    float lambdaB = 465.0 / D;
    float lambdaNIR = 820.0 / D;

    float luma = dot(rgb, vec3(0.299, 0.587, 0.114));
    float nirIntensity = luma * 0.65;

    vec3 shiftedSpectrum =
      rgb.r * wavelengthToRGB(lambdaR) +
      rgb.g * wavelengthToRGB(lambdaG) +
      rgb.b * wavelengthToRGB(lambdaB) +
      nirIntensity * wavelengthToRGB(lambdaNIR) * smoothstep(1.15, 2.5, D);

    vec3 normalizedShift = shiftedSpectrum / max(0.35, (rgb.r + rgb.g + rgb.b + 0.25));
    float shiftBlend = clamp(abs(logD) * 0.88, 0.0, 0.90);

    vec3 result = mix(rgb, normalizedShift * (0.48 + 1.12 * luma), shiftBlend);

    // Relativistic Doppler Rainbow Iris around D = 1 (Kraus 2000 / Weisskopf 1960)
    if (uBeta > 0.60) {
      float irisStrength = smoothstep(0.60, 0.96, uBeta) * (0.38 + 0.42 * isEmissive);
      vec3 irisColor = wavelengthToRGB(555.0 / max(0.08, D));
      result = mix(result, irisColor * (0.38 + 1.12 * luma), irisStrength * 0.58);
    }

    return result;
  }

  void main() {
    vec4 texSample = (uHasMap > 0.5) ? texture2D(uMap, vUv) : vec4(uBaseColor, 1.0);
    vec3 albedo = texSample.rgb;

    // Realistic Physical Sun + Sky Hemisphere + Street bounce lighting + Ground AO
    vec3 sunDir = normalize(vec3(0.52, 0.78, 0.34));
    vec3 fillDir = normalize(vec3(-0.45, 0.40, -0.55));
    vec3 norm = normalize(vNormal);

    float ndotl = max(0.0, dot(norm, sunDir));
    float fillLight = max(0.0, dot(norm, fillDir)) * 0.24;
    float hemi = 0.5 + 0.5 * norm.y;

    // Ground contact ambient occlusion near Y = 0.28m
    float groundAO = smoothstep(0.0, 1.35, vWorldPos.y) * 0.32 + 0.68;

    vec3 skyAmbient = mix(vec3(0.28, 0.32, 0.40), vec3(0.55, 0.64, 0.78), hemi);
    vec3 directSun = vec3(1.05, 0.97, 0.88) * ndotl * 0.85;
    vec3 bounceFill = vec3(0.45, 0.55, 0.70) * fillLight;

    // Specular highlight for windows, metallic cars, and asphalt sheen
    vec3 viewDir = normalize(-vRestRelPos);
    vec3 halfVec = normalize(sunDir + viewDir);
    float spec = pow(max(0.0, dot(norm, halfVec)), 28.0) * 0.22;

    float brightness = dot(albedo, vec3(0.299, 0.587, 0.114));
    float saturation = max(albedo.r, max(albedo.g, albedo.b)) - min(albedo.r, min(albedo.g, albedo.b));
    float isWindowOrLight = step(0.70, brightness) * step(0.16, saturation) + uEmissiveHint;
    isWindowOrLight = clamp(isWindowOrLight, 0.0, 1.0);

    vec3 litSurface = (albedo * (skyAmbient + directSun + bounceFill) + vec3(spec)) * groundAO;
    vec3 restShaded = mix(litSurface, albedo * 1.45 + vec3(0.18, 0.14, 0.06), isWindowOrLight * 0.72);

    // Subtle distance atmospheric perspective in rest frame
    vec3 rel = vRestRelPos;
    float r0 = max(0.001, length(rel));
    float fogFactor = 1.0 - exp(-r0 * 0.0022);
    vec3 horizonFogColor = vec3(0.14, 0.22, 0.36);
    restShaded = mix(restShaded, horizonFogColor, fogFactor * 0.48);

    // In Pure Geometric Contraction mode (uOpticalMode == 0), highlight longitudinal compression grid lines
    if (uOpticalMode < 0.5) {
      float gridZ = abs(fract(vWorldPos.z / 6.0 - 0.5) - 0.5);
      float line = smoothstep(0.035, 0.0, gridZ) * smoothstep(1.05, 3.0, uGamma) * 0.32;
      restShaded += vec3(0.1, 0.85, 0.65) * line;
    }

    float cosTheta = clamp(-rel.z / r0, -1.0, 1.0);
    float denom = max(1e-6, 1.0 + uBeta * cosTheta);
    float cosThetaPrime = clamp((cosTheta + uBeta) / denom, -1.0, 1.0);

    float D = 1.0 / max(1e-5, uGamma * (1.0 - uBeta * cosThetaPrime));

    vec3 dopplerShaded = applyBroadbandDopplerShift(restShaded, D, isWindowOrLight);

    // Relativistic Headlight Beaming (I ~ D^3 with logarithmic eye response)
    float beaming = 1.0;
    if (D >= 1.0) {
      beaming = 1.0 + log(1.0 + pow(D - 1.0, 1.25)) * 0.75;
    } else {
      beaming = pow(max(0.005, D), 1.85);
    }

    vec3 opticalColor = dopplerShaded * mix(1.0, beaming, clamp(uBeta * 1.25, 0.0, 1.0));

    // Ultra-relativistic 90-degree Terrell-Penrose Horizon Ring highlight on buildings
    if (uBeta > 0.75 && uOpticalMode > 0.5) {
      float ultra = smoothstep(0.75, 0.9999, uBeta);
      float ring90 = exp(-pow(cosTheta * 15.0, 2.0)) * ultra * 0.38;
      opticalColor += vec3(0.25, 0.78, 1.0) * ring90;
    }

    vec3 finalColor = mix(restShaded, opticalColor, uOpticalMode);

    // ACES filmic tone mapping
    finalColor = (finalColor * (2.51 * finalColor + 0.03)) / (finalColor * (2.43 * finalColor + 0.59) + 0.14);
    finalColor = pow(clamp(finalColor, 0.0, 1.0), vec3(0.94));

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

/**
 * FULL 360-DEGREE PER-PIXEL RELATIVISTIC EARTH, HORIZON & COSMOS RAY-TRACER SHADER:
 * Matches the exact Lorentz Past-Light-Cone camera projection of the 3D city geometry
 * pixel-for-pixel, tracing inverse relativistic aberration across the entire 360° sphere.
 */
export const cosmosDomeVertexShader = /* glsl */ `
  varying vec3 vLocalDir;
  void main() {
    vLocalDir = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const cosmosDomeFragmentShader = /* glsl */ `
  uniform float uBeta;
  uniform float uGamma;
  uniform float uTime;
  uniform float uOpticalMode;

  varying vec3 vLocalDir;

  vec3 wavelengthToRGB(float lambda) {
    vec3 c = vec3(0.0);
    if (lambda < 380.0) {
      float t = clamp((380.0 - lambda) / 220.0, 0.0, 1.0);
      c = mix(vec3(0.48, 0.25, 1.0), vec3(0.88, 0.95, 1.0), t);
    } else if (lambda < 440.0) {
      float t = (lambda - 380.0) / 60.0;
      c = vec3(0.52 * (1.0 - t), 0.15 * t, 1.0);
    } else if (lambda < 490.0) {
      float t = (lambda - 440.0) / 50.0;
      c = vec3(0.0, pow(t, 0.85), 1.0);
    } else if (lambda < 510.0) {
      float t = (lambda - 490.0) / 20.0;
      c = vec3(0.0, 1.0, 1.0 - 0.85 * t);
    } else if (lambda < 580.0) {
      float t = (lambda - 510.0) / 70.0;
      c = vec3(pow(t, 0.9), 1.0, 0.12 * (1.0 - t));
    } else if (lambda < 645.0) {
      float t = (lambda - 580.0) / 65.0;
      c = vec3(1.0, pow(1.0 - t, 0.9), 0.0);
    } else if (lambda <= 750.0) {
      float t = (lambda - 645.0) / 105.0;
      c = vec3(1.0 - 0.80 * t, 0.03 * (1.0 - t), 0.0);
    } else {
      float ir = exp(-(lambda - 750.0) / 250.0);
      c = vec3(0.18 * ir, 0.01 * ir, 0.0);
    }
    return clamp(c, 0.0, 1.0);
  }

  float hash31(vec3 p) {
    p = fract(p * vec3(443.897, 441.423, 437.195));
    p += dot(p, p.yzx + 19.19);
    return fract((p.x + p.y) * p.z);
  }

  void main() {
    // Apparent viewing direction d' in camera space (100% locked to 3D vertex projection!)
    vec3 dirPrime = normalize(vLocalDir);
    float rXY = length(dirPrime.xy);
    float cosThetaPrime = clamp(-dirPrime.z, -1.0, 1.0);
    float sinThetaPrime = clamp(rXY, 0.0, 1.0);

    // Match the exact visual Lorentz parameters (betaVis, gammaVis) used by the 3D city vertices
    float gammaVisRaw = (uGamma <= 4.0) ? uGamma : (4.0 + 2.8 * log(1.0 + (uGamma - 4.0)));
    float betaVisRaw = (uBeta <= 0.0) ? 0.0 : sqrt(max(0.0, 1.0 - 1.0 / (gammaVisRaw * gammaVisRaw)));

    float effBeta = betaVisRaw * uOpticalMode;
    float effGamma = mix(1.0, gammaVisRaw, uOpticalMode);

    // EXACT INVERSE RELATIVISTIC ABERRATION:
    // Trace the photon backward in time to find where on the 360° Earth/Sky sphere it originated!
    // cos(theta_rest) = (cos(theta') - beta) / (1 - beta * cos(theta'))
    float invDenom = max(1e-6, 1.0 - effBeta * cosThetaPrime);
    float cosThetaRest = clamp((cosThetaPrime - effBeta) / invDenom, -1.0, 1.0);
    float sinThetaRest = clamp(sinThetaPrime / max(1e-6, effGamma * invDenom), 0.0, 1.0);

    vec2 phiDir = (rXY > 1e-5) ? (dirPrime.xy / rXY) : vec2(0.0, 1.0);

    // True rest-frame unit vector on the 360-degree Earth + Sky sphere
    vec3 restDir = normalize(vec3(
      phiDir.x * sinThetaRest,
      phiDir.y * sinThetaRest,
      -cosThetaRest
    ));

    // Physical Relativistic Doppler Factor D(theta')
    float physBeta = uBeta * uOpticalMode;
    float physGamma = mix(1.0, uGamma, uOpticalMode);
    float D = 1.0 / max(1e-5, physGamma * (1.0 - physBeta * cosThetaPrime));

    // =========================================================================
    // EVALUATE THE 360° REST-FRAME WORLD (DAY-TWILIGHT SKY, CITY HORIZON & EARTH)
    // =========================================================================
    vec3 restWorldColor = vec3(0.0);
    float restElevation = restDir.y; // > 0 is Sky, < 0 is Earth Ground

    if (restElevation >= 0.0) {
      // SKY HEMISPHERE: Rich atmospheric gradient + sun glow + distant city skyline + stars
      float horizonGlow = exp(-restElevation * 4.5);
      vec3 zenithCol = vec3(0.04, 0.09, 0.22);
      vec3 horizonCol = vec3(0.20, 0.34, 0.56);
      restWorldColor = mix(zenithCol, horizonCol, horizonGlow);

      // Subtle atmospheric sun glow in the upper sky
      vec3 sunDir = normalize(vec3(0.52, 0.78, 0.34));
      float sunDot = max(0.0, dot(restDir, sunDir));
      restWorldColor += vec3(0.95, 0.85, 0.65) * pow(sunDot, 16.0) * 0.35;

      // Distant 360-degree city skyline silhouette along the horizon (0 < y < 0.09)
      float azimuth = atan(restDir.x, -restDir.z);
      float skylineHeight = 0.025 + 0.042 * hash31(vec3(floor(azimuth * 32.0), 1.0, 2.0));
      if (restElevation < skylineHeight) {
        restWorldColor = vec3(0.07, 0.10, 0.16);
        float winGrid = step(0.66, hash31(vec3(floor(azimuth * 190.0), floor(restElevation * 280.0), 3.0)));
        restWorldColor += vec3(0.90, 0.76, 0.40) * winGrid * 0.60;
      } else {
        // High-altitude stars visible toward the zenith
        float starMask = smoothstep(0.08, 0.35, restElevation);
        vec3 starCell = floor(restDir * 220.0);
        float starVal = hash31(starCell);
        if (starVal > 0.993) {
          float starBright = (starVal - 0.993) / 0.007;
          restWorldColor += vec3(0.95, 0.97, 1.0) * starBright * starMask * 1.4;
        }
      }
    } else {
      // EARTH GROUND HEMISPHERE (restElevation < 0):
      // Smoothly matches asphalt & urban ground tone; as beta -> 1, wraps into the Einstein-Penrose disk!
      float groundDepth = clamp(-restElevation, 0.001, 1.0);
      vec3 groundCol = mix(vec3(0.12, 0.15, 0.22), vec3(0.06, 0.08, 0.12), groundDepth);

      vec2 groundXZ = restDir.xz / max(0.025, -restDir.y) * 2.0;
      vec2 grid = abs(fract(groundXZ * 0.25 - 0.5) - 0.5);
      float gridLine = smoothstep(0.03, 0.0, min(grid.x, grid.y)) * exp(-groundDepth * 2.8);
      groundCol += vec3(0.14, 0.34, 0.54) * gridLine * 0.38;
      restWorldColor = groundCol;
    }

    // Educational angular coordinate rings at rest-frame theta = 90° (Side), 135° (Rear), 165° (Far Rear)
    float restAngleDeg = degrees(acos(cosThetaRest));
    float ring90 = exp(-pow((restAngleDeg - 90.0) / 1.1, 2.0));
    float ring135 = exp(-pow((restAngleDeg - 135.0) / 1.3, 2.0));
    float ring165 = exp(-pow((restAngleDeg - 165.0) / 1.3, 2.0));
    float showRings = smoothstep(0.15, 0.45, effBeta);

    // Apply Relativistic Doppler Shift & Beaming to the 360° World
    float luma = dot(restWorldColor, vec3(0.299, 0.587, 0.114));
    vec3 spectralDoppler = wavelengthToRGB(550.0 / max(0.05, D));
    float shiftAmt = clamp(abs(log(max(1e-4, D))) * 0.88, 0.0, 0.90);

    vec3 dopplerWorld = mix(restWorldColor, spectralDoppler * (0.24 + 1.40 * luma), shiftAmt);

    float beaming = (D >= 1.0)
      ? (1.0 + log(1.0 + pow(D - 1.0, 1.30)) * 0.82)
      : pow(max(0.001, D), 2.05);

    vec3 finalSky = dopplerWorld * mix(1.0, beaming, clamp(physBeta * 1.25, 0.0, 1.0));

    // Relativistic Doppler Rainbow Iris at the neutral Doppler ring (D == 1)
    if (physBeta > 0.65) {
      float iris = exp(-pow(log(max(0.05, D)) * 2.2, 2.0)) * smoothstep(0.65, 0.98, physBeta);
      vec3 rainbowCol = wavelengthToRGB(555.0 / max(0.1, D));
      finalSky += rainbowCol * iris * 0.52;
    }

    // Highlight the 90° (Tam Yanımız), 135° (Arkamız), and 165° (Tam Arkamız) rings
    finalSky += vec3(0.15, 0.85, 1.0) * ring90 * showRings * 0.38;
    finalSky += vec3(1.0, 0.55, 0.15) * ring135 * showRings * 0.32;
    finalSky += vec3(0.95, 0.20, 0.25) * ring165 * showRings * 0.28;

    // At the Photon Limit (beta -> 0.9999c), the central forward core glows brightly
    if (physBeta > 0.94) {
      float photonCore = exp(-pow(degrees(acos(clamp(cosThetaPrime, -1.0, 1.0))) / 4.2, 2.0));
      finalSky += vec3(0.85, 0.92, 1.0) * photonCore * smoothstep(0.94, 0.9999, physBeta) * 1.15;
    }

    finalSky = (finalSky * (2.51 * finalSky + 0.03)) / (finalSky * (2.43 * finalSky + 0.59) + 0.14);
    gl_FragColor = vec4(pow(clamp(finalSky, 0.0, 1.0), vec3(0.94)), 1.0);
  }
`;

export function createGlbRelativisticMaterial(
  sharedUniforms: RelativisticUniforms,
  map: THREE.Texture | null,
  baseColor: THREE.Color = new THREE.Color(1, 1, 1),
  emissiveHint = 0.0
): THREE.ShaderMaterial {
  if (map) {
    map.colorSpace = THREE.SRGBColorSpace;
    map.flipY = false;
    map.anisotropy = 8;
    map.needsUpdate = true;
  }

  return new THREE.ShaderMaterial({
    vertexShader: relativisticVertexShader,
    fragmentShader: relativisticFragmentShader,
    uniforms: {
      uBeta: sharedUniforms.uBeta,
      uGamma: sharedUniforms.uGamma,
      uCameraPos: sharedUniforms.uCameraPos,
      uTime: sharedUniforms.uTime,
      uProperTime: sharedUniforms.uProperTime,
      uOpticalMode: sharedUniforms.uOpticalMode,
      uMap: { value: map },
      uHasMap: { value: map ? 1.0 : 0.0 },
      uBaseColor: { value: baseColor },
      uEmissiveHint: { value: emissiveHint },
    },
    side: THREE.DoubleSide,
  });
}
