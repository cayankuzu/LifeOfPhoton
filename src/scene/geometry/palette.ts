/**
 * What the colours of the model kit's palette stand for.
 *
 * The models are textured with palette atlases: every face takes one flat swatch.
 * Two kinds of swatch mark faces that are light sources in the real object, and
 * the renderer treats exactly those faces of the models as emitters — nothing is
 * added to the models for it:
 *
 *   glass       the blue window panes of the buildings; a share of them is lit;
 *   lamp light  the warm orange underside of the street luminaire's head.
 *
 * Colours are encoded sRGB components in [0, 1], as read from the texture.
 */

/** Glass in the building palette is the only blue: blue clearly above red, green not below red. */
export function isGlass(encoded: readonly number[]): boolean {
  const [r, g, b] = encoded;
  return b - r >= 0.15 && b >= g + 0.04 && g > r - 0.08 && b > 0.5;
}

/**
 * The lamp-light swatch of the roads palette, (241, 151, 108): a bright, saturated
 * orange. Every other colour of the luminaire is a near-neutral grey.
 */
export function isLampLight(encoded: readonly number[]): boolean {
  const [r, g, b] = encoded;
  return r > 0.85 && r - g >= 0.2 && g - b >= 0.08 && r - b >= 0.35;
}
