/**
 * How big each robot is next to V1, as the ratio of footprint diagonals (V1 = 1). V1 is the large-lake
 * workhorse, V2 the mid-size pond robot and V4 the compact survey boat. The showroom and the journey scale
 * every robot by this instead of fitting each to the same size. Adjust when real dimensions are known.
 */
export const REL_SIZE: Record<string, number> = { v1: 1, v2: 0.8, v4: 0.62 };
