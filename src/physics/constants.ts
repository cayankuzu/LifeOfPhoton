/**
 * Physical constants and standard reference data.
 *
 * Every value states its provenance. "Exact" marks constants that define the SI
 * (SI Brochure, 9th edition, 2019) and therefore carry no uncertainty.
 */

/** Speed of light in vacuum, m/s. Exact — 17th CGPM (1983), retained by the 2019 SI. */
export const SPEED_OF_LIGHT = 299_792_458;

/** Planck constant, J·s. Exact (SI 2019). */
export const PLANCK_CONSTANT = 6.626_070_15e-34;

/** Boltzmann constant, J/K. Exact (SI 2019). */
export const BOLTZMANN_CONSTANT = 1.380_649e-23;

/** Second radiation constant c₂ = hc/k, m·K (≈ 1.438 776 877 × 10⁻² m·K). Exact by construction. */
export const SECOND_RADIATION_CONSTANT = (PLANCK_CONSTANT * SPEED_OF_LIGHT) / BOLTZMANN_CONSTANT;

/** First radiation constant for spectral radiance c₁L = 2hc², W·m²·sr⁻¹. Exact by construction. */
export const FIRST_RADIATION_CONSTANT_RADIANCE = 2 * PLANCK_CONSTANT * SPEED_OF_LIGHT ** 2;

/** Luminous efficacy of monochromatic 540 THz radiation, lm/W. Exact (SI 2019, definition of the candela). */
export const LUMINOUS_EFFICACY_KCD = 683;

/** Frequency that defines the candela, Hz. Exact. */
export const CANDELA_FREQUENCY_HZ = 540e12;

/** Vacuum wavelength of the candela frequency, nm (≈ 555.17 nm) — the peak of photopic vision. */
export const CANDELA_WAVELENGTH_NM = (SPEED_OF_LIGHT / CANDELA_FREQUENCY_HZ) * 1e9;

/** Standard acceleration of gravity, m/s². Conventional value, 3rd CGPM (1901). */
export const STANDARD_GRAVITY = 9.806_65;

/** Julian year, s (IAU). Exact by definition: 365.25 d × 86 400 s. */
export const JULIAN_YEAR_SECONDS = 31_557_600;

/** Light-year, m (IAU: distance light travels in one Julian year). */
export const LIGHT_YEAR_METRES = SPEED_OF_LIGHT * JULIAN_YEAR_SECONDS;

/** Astronomical unit, m. Exact — IAU 2012 Resolution B2. */
export const ASTRONOMICAL_UNIT_METRES = 149_597_870_700;

/** Nominal solar radius, m — IAU 2015 Resolution B3. */
export const NOMINAL_SOLAR_RADIUS_METRES = 6.957e8;

/** Nominal solar effective temperature, K — IAU 2015 Resolution B3. */
export const NOMINAL_SOLAR_TEMPERATURE_K = 5772;

/** Geometric dilution of sunlight at 1 au, (R☉ / 1 au)². */
export const SOLAR_DILUTION_AT_1AU = (NOMINAL_SOLAR_RADIUS_METRES / ASTRONOMICAL_UNIT_METRES) ** 2;

/** Cosmic microwave background monopole temperature, K — Fixsen (2009), ApJ 707, 916: 2.72548 ± 0.00057 K. */
export const CMB_TEMPERATURE_K = 2.72548;

/** Sea-level temperature of the International Standard Atmosphere, K (ISO 2533:1975) = 15 °C. */
export const STANDARD_ATMOSPHERE_TEMPERATURE_K = 288.15;

/** Colour temperature of CIE standard illuminant A (gas-filled tungsten lamp), K. */
export const ILLUMINANT_A_TEMPERATURE_K = 2856;

/** Proton rest energy, MeV (CODATA 2022: 938.272 089 43(29) MeV). */
export const PROTON_REST_ENERGY_MEV = 938.272_089_43;

/** Electron rest energy, MeV (CODATA 2022: 0.510 998 950 69(16) MeV). */
export const ELECTRON_REST_ENERGY_MEV = 0.510_998_950_69;

/** Muon rest energy, MeV (CODATA 2022: 105.658 3755(23) MeV). */
export const MUON_REST_ENERGY_MEV = 105.658_375_5;
