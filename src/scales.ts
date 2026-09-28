/**
 * The default scales a page inherits if nobody intervenes.
 *
 * This is the whole idea of the detector, and the first version got it
 * wrong. That version asked "does this value VARY?" - but Tailwind ships
 * tracking, radius and size utilities, so a page using them varies plenty
 * while having chosen nothing. shadcn.com scored as hand-tuned on exactly
 * that mistake.
 *
 * The right question is "is this value ON the default scale, or off it?"
 * -0.025em is `tracking-tight`, straight from the box. -0.038em is someone
 * looking at a headline and nudging it. Same with 14px versus 13.5px, and
 * 600 versus 590. Off-scale values are the fingerprint of a human eye,
 * because no generator produces them.
 */

export const TW_FONT_SIZES_PX = [12, 14, 16, 18, 20, 24, 30, 36, 48, 60, 72, 96, 128];
export const TW_TRACKING_EM = [-0.05, -0.025, 0, 0.025, 0.05, 0.1];
export const TW_RADII_PX = [0, 2, 4, 6, 8, 12, 16, 20, 24, 9999];

export const near = (v: number, scale: number[], tol = 0.15) =>
  scale.some((s) => Math.abs(v - s) <= tol);

/** letter-spacing arrives in px; only em is comparable across sizes. */
export const toEm = (spacingPx: number, fontSizePx: number) =>
  fontSizePx ? spacingPx / fontSizePx : 0;

/**
 * A radius like "8px 8px 0px 0px" is one decision, not four. Reduce any
 * shorthand to its distinct corner values so a rounded-top card does not
 * read as four separate choices - the bug that made every site look
 * hand-varied.
 */
export function radiusValues(decl: string): number[] {
  return decl
    .split('/')[0]
    .trim()
    .split(/\s+/)
    .map((v) => parseFloat(v))
    .filter((n) => !isNaN(n))
    // 9999px and the 3.35e7 that browsers report for `border-radius: 50%`
    // on a large box are both "fully round" - one intent, not a scale value.
    .map((n) => (n > 500 ? 9999 : n));
}
