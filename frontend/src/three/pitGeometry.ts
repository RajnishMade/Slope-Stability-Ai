/** Shared pit geometry — imported by both the scene and the mine-life props. */
export const BENCH_COUNT = 7;
export const TOP_RADIUS = 6.4;
export const RADIUS_STEP = 0.64;
export const BENCH_HEIGHT = 0.52;
export const THETA_SEG = 84;
export const PHI_SEG = 4;
export const FLOOR_RADIUS = TOP_RADIUS - BENCH_COUNT * RADIUS_STEP;
export const FLOOR_Y = -BENCH_COUNT * BENCH_HEIGHT;

/** Outer radius of bench i (i = 0 is the top/widest bench). */
export function benchOuter(i: number): number {
  return TOP_RADIUS - i * RADIUS_STEP;
}

/** Inner radius (the toe of the bench wall) of bench i. */
export function benchInner(i: number): number {
  return benchOuter(i) - RADIUS_STEP;
}

/** Radius of the haul road running along the middle of bench i's flat top. */
export function benchRoadRadius(i: number): number {
  return benchOuter(i) - RADIUS_STEP * 0.5;
}

/** Local Y of bench i's flat top surface (the group is offset +0.4 in world). */
export function benchTopY(i: number): number {
  return -i * BENCH_HEIGHT;
}
