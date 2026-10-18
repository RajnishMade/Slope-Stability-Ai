import { useState } from "react";
import { HERO_IMAGE } from "../data/backgrounds";

/**
 * Full-bleed photographic background shared by every route — one curated
 * image (see data/backgrounds.ts), never rotated.
 *
 * `variant`:
 *   "hero"    — landing page. The photo stays legible but is graded down with
 *               a top-to-bottom scrim so the headline and cards read cleanly,
 *               plus a faint warm glow that echoes the amber brand colour.
 *   "ambient" — every other page. Heavily blurred and dimmed: a quiet backdrop
 *               behind the glass panels that never competes with content.
 *
 * Honours prefers-reduced-motion (no Ken Burns drift).
 */
export default function PhotoBackground({ variant = "hero" }: { variant?: "hero" | "ambient" }) {
  const [failed, setFailed] = useState(false);
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const hero = variant === "hero";

  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-ink" aria-hidden>
      {!failed && (
        <img
          src={HERO_IMAGE}
          alt=""
          onError={() => setFailed(true)}
          className={`absolute inset-0 h-full w-full object-cover object-center transition-[filter] duration-700 ${
            hero && !reduced ? "ken-burns" : ""
          }`}
          style={{
            filter: hero
              ? "saturate(0.92) brightness(0.86) contrast(1.04)"
              : "saturate(0.7) brightness(0.5) blur(22px)",
            // blur samples past the edges; scale up so no soft border shows
            ...(hero ? null : { transform: "scale(1.1)" }),
          }}
        />
      )}

      {hero ? (
        <>
          {/* top-to-bottom grade: readable headline at top, dark base under the cards */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(8,9,12,0.78) 0%, rgba(8,9,12,0.52) 32%, rgba(8,9,12,0.58) 62%, rgba(8,9,12,0.9) 100%)",
            }}
          />
          {/* faint warm glow behind the hero, in the brand colour */}
          <div
            className="absolute inset-0 mix-blend-screen"
            style={{
              background:
                "radial-gradient(ellipse 50% 30% at 50% 22%, rgba(255,157,85,0.10) 0%, transparent 72%)",
            }}
          />
          {/* vignette */}
          <div
            className="absolute inset-0"
            style={{ background: "radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(0,0,0,0.42) 100%)" }}
          />
        </>
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(8,9,12,0.62) 0%, rgba(8,9,12,0.5) 45%, rgba(8,9,12,0.7) 100%)",
          }}
        />
      )}
    </div>
  );
}
