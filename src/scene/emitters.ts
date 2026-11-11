/**
 * Kinds of light source a surface can be, as stored per vertex in `aSurface.y`.
 *
 * The codes are shared by the layout (which places emitting panels), the geometry
 * builder (which lights windows) and the fragment shader (which turns the code into
 * a spectrum), so they live in one place.
 */
export const EMITTER = {
  /** An ordinary surface: it only reflects and emits thermally. */
  none: 0,
  /** A lit window: a black body at the colour temperature of interior lighting. */
  window: 1,
  /** The face of a street luminaire: the phosphor-converted LED spectrum. */
  luminaire: 2,
  /** Signal lenses: quasi-monochromatic lines. */
  signalRed: 3,
  signalAmber: 4,
  signalGreen: 5,
} as const;

export type EmitterCode = (typeof EMITTER)[keyof typeof EMITTER];
