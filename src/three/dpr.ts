export const MIN_DPR = 0.75;

/** Sharpest pixel ratio worth drawing at on this screen, capped at `max`. */
export function topDpr(max: number) {
  return Math.min(max, typeof window === "undefined" ? 1 : window.devicePixelRatio || 1);
}
