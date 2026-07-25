import { useEffect, useRef, useState } from "react";
import {
  BACKGROUNDS,
  FADE_MS,
  ROTATE_MAX_MS,
  ROTATE_MIN_MS,
  nextIndex,
  randomIndex,
} from "../data/backgrounds";

/**
 * Full-bleed photographic mine background, shared by every route.
 *
 * Two stacked <img> layers cross-fade between photos so swaps are smooth rather
 * than hard cuts. A random photo is chosen per page load, and the next pick is
 * never the one already showing.
 *
 * `variant`:
 *   "hero"    — landing page. Natural colour, localized scrims only behind the
 *               heading and card row so the photo reads as a real, lit mine.
 *   "ambient" — analysis view. Heavily blurred and dimmed so it's a backdrop
 *               behind the glass panels, never competing detail. Rotation is
 *               paused here to avoid movement while the user is working.
 *
 * Honours prefers-reduced-motion: holds one static photo, no rotation, no
 * Ken Burns.
 */
export default function PhotoBackground({ variant = "hero" }: { variant?: "hero" | "ambient" }) {
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // which pool entry each layer holds, and which layer is currently on top
  const [idx, setIdx] = useState(() => randomIndex());
  const [prevIdx, setPrevIdx] = useState<number | null>(null);
  const [failed, setFailed] = useState<Set<number>>(new Set());
  const timer = useRef<number | null>(null);

  const rotate = variant === "hero" && !reduced && BACKGROUNDS.length > 1;

  // Preload the pool after first paint so later swaps never flash. Staggered so
  // it doesn't compete with the first image for bandwidth.
  useEffect(() => {
    const t = window.setTimeout(() => {
      BACKGROUNDS.forEach((src, i) => {
        if (i === idx) return;
        const img = new Image();
        img.src = src;
      });
    }, 1200);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // rotation loop
  useEffect(() => {
    if (!rotate) return;
    const hold = ROTATE_MIN_MS + Math.random() * (ROTATE_MAX_MS - ROTATE_MIN_MS);
    timer.current = window.setTimeout(() => {
      setIdx((cur) => {
        setPrevIdx(cur);
        return nextIndex(cur);
      });
    }, hold);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [idx, rotate]);

  // drop the outgoing layer once the cross-fade has finished
  useEffect(() => {
    if (prevIdx === null) return;
    const t = window.setTimeout(() => setPrevIdx(null), FADE_MS);
    return () => window.clearTimeout(t);
  }, [prevIdx]);

  const allFailed = failed.size >= BACKGROUNDS.length;

  const grade =
    variant === "hero"
      ? "saturate(0.94) brightness(0.94) contrast(1.02)"
      : // ambient: pushed right back so panels read cleanly on top
        "saturate(0.80) brightness(0.62) contrast(1.02) blur(20px)";

  function layer(i: number, on: boolean) {
    if (failed.has(i)) return null;
    return (
      <img
        key={BACKGROUNDS[i]}
        src={BACKGROUNDS[i]}
        alt=""
        aria-hidden
        onError={() => setFailed((s) => new Set(s).add(i))}
        className={`absolute inset-0 h-full w-full object-cover object-center ${
          variant === "hero" && !reduced ? "ken-burns" : ""
        }`}
        style={{
          filter: grade,
          opacity: on ? 1 : 0,
          transition: `opacity ${FADE_MS}ms ease-in-out`,
          // blur samples past the edges; scale up so no soft border shows
          ...(variant === "ambient" ? { transform: "scale(1.08)" } : null),
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-[#0a0a0d]">
      {/* outgoing photo underneath, incoming on top, both fading */}
      {prevIdx !== null && layer(prevIdx, false)}
      {layer(idx, true)}

      {variant === "hero" ? (
        <>
          {/* light cool tint for cohesion with the blue UI (no desaturation) */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: "#22344f", mixBlendMode: "soft-light", opacity: 0.22 }}
          />

          {/* localized scrim behind heading + subheading */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 56% 25% at 50% 32%, rgba(6,8,14,0.70) 0%, rgba(6,8,14,0.44) 55%, transparent 84%)",
            }}
          />

          {/* localized scrim behind the card row */}
          <div
            className="pointer-events-none absolute inset-x-0"
            style={{
              top: "42%",
              bottom: "0%",
              background:
                "linear-gradient(180deg, transparent 0%, rgba(6,8,14,0.44) 22%, rgba(6,8,14,0.58) 55%, rgba(6,8,14,0.42) 100%)",
            }}
          />

          {/* very light edge softening, top and bottom only */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(6,8,14,0.42) 0%, transparent 14%, transparent 88%, rgba(6,8,14,0.46) 100%)",
            }}
          />

          {/* blue halo behind the heading, in the UI accent */}
          <div
            className="pointer-events-none absolute inset-0 mix-blend-screen"
            style={{
              background:
                "radial-gradient(ellipse 38% 20% at 50% 30%, rgba(0,113,227,0.18) 0%, rgba(0,113,227,0.07) 50%, transparent 76%)",
            }}
          />

          {/* vignette, kept very light */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 50% 48%, transparent 0%, transparent 62%, rgba(0,0,0,0.30) 100%)",
            }}
          />
        </>
      ) : (
        <>
          {/* ambient: uniform dark scrim + a cool cast so the glass panels pop */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(8,10,16,0.62) 0%, rgba(8,10,16,0.48) 45%, rgba(8,10,16,0.66) 100%)",
            }}
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: "#1a2740", mixBlendMode: "soft-light", opacity: 0.32 }}
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 50% 40%, transparent 0%, transparent 55%, rgba(0,0,0,0.45) 100%)",
            }}
          />
        </>
      )}

      {allFailed && (
        <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 px-8 text-center">
          <p className="text-[13px] text-white/35">
            No background photos found — expected files in{" "}
            <code className="text-white/55">frontend/public/backgrounds/</code>
          </p>
        </div>
      )}
    </div>
  );
}
