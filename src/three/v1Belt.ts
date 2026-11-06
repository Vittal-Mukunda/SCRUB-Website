/**
 * Conveyor of the V1 model, in model space (bow +X, water at y = 0). Shared by the model and by the
 * leaf sweep on the home page, so the leaves ride the real belt.
 */
/** top end of the running surface, where it tips into the basket */
export const BELT_TOP: [number, number] = [-0.12, 0.46];
/** rise and horizontal run from the top end down to the water */
export const BELT_RISE = 0.54;
export const BELT_PLAN = 0.9;
export const BELT_ANG = Math.atan2(BELT_RISE, BELT_PLAN);
export const BELT_LEN = Math.hypot(BELT_RISE, BELT_PLAN);
export const BELT_W = 0.66;
/** low end of the running surface, where waste is picked up */
export const BELT_LOW: [number, number] = [BELT_TOP[0] + BELT_PLAN, BELT_TOP[1] - BELT_RISE];
