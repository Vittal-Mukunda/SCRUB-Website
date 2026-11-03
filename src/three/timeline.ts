/**
 * The journey slide turning into leaves that V1 then sweeps up, on one clock `u` driven by scrolling:
 * 0 = the journey slide on screen, 1 = V1 settled on a clear lake. Four motions, one after the other, each
 * taking a quarter of the scroll; scrolling back plays them backwards. Plain numbers only (no three.js), so the home page can import it
 * without pulling the 3D code in.
 */
export const TL = {
  /** 1: the words have turned into leaves, hanging in the air where the text was */
  leaves: 0.25,
  /** 2: the leaves have fallen and lie on the water */
  landed: 0.5,
  /** 3: V1 swims in, through the leaves */
  botIn: 0.5,
  /** ...and every leaf is in its bin */
  sweepEnd: 0.75,
  /** 4: V1 has glided back to the centre */
  botBack: 1,
};

export const clamp = (x: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));

export const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;

/**
 * The journey slide's text as ink: every pixel of every letter (and dot), found by drawing the slide's text
 * into an offscreen canvas. Each leaf is born on one of these pixels, so the words themselves become leaves.
 */
export interface LeafSources {
  /** stage size when measured, in CSS px */
  w: number;
  h: number;
  /** bumped on every new measurement so the scene knows to re-lay the leaves */
  version: number;
  /** x, y (CSS px relative to the stage) then r, g, b (0..255) for each ink pixel, in reading order */
  pts: Float32Array;
  count: number;
  /** ink area in CSS px squared */
  ink: number;
}
