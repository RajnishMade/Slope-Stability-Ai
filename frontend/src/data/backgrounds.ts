/**
 * Background photo pool, served from `frontend/public/backgrounds/`.
 *
 * Edit this array to change the rotation — nothing else needs touching. Source
 * files live in the project root; the served copies are resized to 2000px wide
 * and re-encoded (see the optimise step in scripts, or just drop a new
 * bg-N.jpg in and add it here).
 */
export const BACKGROUNDS = [
  "/backgrounds/bg-1.jpg", // bucket-wheel excavator, hazy overburden
  "/backgrounds/bg-2.jpg", // aerial pit at sunset
  "/backgrounds/bg-3.jpg", // blue-hour pit with mast lighting
  "/backgrounds/bg-4.jpg", // aerial pit, cool teal
  "/backgrounds/bg-5.jpg", // dusk pit, warm work lights
  "/backgrounds/bg-6.jpg", // benched rock face, close in
] as const;

/** How long each photo holds before cross-fading (ms, randomised in range). */
export const ROTATE_MIN_MS = 8000;
export const ROTATE_MAX_MS = 12000;

/** Cross-fade duration (ms). */
export const FADE_MS = 2200;

/** Pick an index different from `avoid` so the same photo never repeats. */
export function nextIndex(avoid: number, len = BACKGROUNDS.length): number {
  if (len <= 1) return 0;
  let i = Math.floor(Math.random() * (len - 1));
  if (i >= avoid) i += 1; // skip `avoid` without looping
  return i;
}

export function randomIndex(len = BACKGROUNDS.length): number {
  return Math.floor(Math.random() * len);
}
