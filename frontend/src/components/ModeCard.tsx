import { useRef, useState } from "react";
import type { MouseEvent } from "react";
import { motion } from "framer-motion";
import type { FailureMode } from "../data/modes";

export type CardPhase = "idle" | "punch" | "selected" | "fading";

interface ModeCardProps {
  mode: FailureMode;
  phase: CardPhase;
  delay: number;
  onSelect: () => void;
}

const EASE = [0.25, 0.1, 0.25, 1] as const;

export default function ModeCard({ mode, phase, delay, onSelect }: ModeCardProps) {
  const cardRef = useRef<HTMLButtonElement>(null);
  const [hovered, setHovered] = useState(false);

  function handleMouseMove(e: MouseEvent<HTMLButtonElement>) {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${((e.clientX - rect.left) / rect.width) * 100}%`);
    el.style.setProperty("--my", `${((e.clientY - rect.top) / rect.height) * 100}%`);
  }

  const interactive = phase === "idle";
  const animateTarget =
    phase === "selected"
      ? { opacity: 1, scale: 8 }
      : phase === "fading"
        ? { opacity: 0, scale: 0.92 }
        : phase === "punch"
          ? { opacity: 1, scale: 0.92 }
          : { opacity: 1, scale: 1 };

  return (
    <motion.button
      ref={cardRef}
      layout
      type="button"
      onMouseMove={handleMouseMove}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onClick={interactive ? onSelect : undefined}
      disabled={!interactive}
      aria-label={`${mode.title} failure — ${mode.description}. ${mode.meta}. Start analysis`}
      className={[
        "glass-surface group relative isolate flex w-full flex-col items-center overflow-hidden",
        "rounded-[22px] px-5 pt-6 pb-6 text-center",
        interactive ? "cursor-pointer" : "cursor-default",
        "transition-[border-color,box-shadow,background] duration-[400ms]",
        hovered
          ? "!border-[color:var(--color-glass-border-hover)] !bg-[color:var(--color-glass-hover)] shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_8px_32px_rgba(0,0,0,0.45),0_0_46px_var(--color-accent-glow)]"
          : "",
      ].join(" ")}
      style={{ transitionTimingFunction: "var(--ease-apple)" }}
      initial={{ opacity: 0, y: 28, scale: 0.94 }}
      animate={animateTarget}
      whileHover={interactive ? { y: -8, scale: 1.02 } : undefined}
      whileTap={interactive ? { scale: 0.97 } : undefined}
      transition={{
        layout: { duration: 0.65, ease: EASE },
        default:
          phase === "idle" && delay > 0
            ? { type: "spring", stiffness: 260, damping: 24, delay }
            : { duration: phase === "selected" ? 0.65 : 0.4, ease: EASE },
      }}
    >
      {/* cursor-following light on the glass */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(220px circle at var(--mx,50%) var(--my,50%), var(--color-accent-soft), transparent 65%)",
        }}
      />
      <span className="pointer-events-none mb-4 block h-[96px] w-[96px] sm:h-[120px] sm:w-[120px]">
        <mode.Preview active={hovered} />
      </span>
      <span className="mb-1 text-lg font-semibold tracking-[-0.01em] text-primary">{mode.title}</span>
      <span className="text-sm leading-snug text-secondary">{mode.description}</span>
      <span className="mt-3 rounded-full border border-glass-border bg-white/[0.04] px-2.5 py-1 text-xs text-tertiary">
        {mode.meta}
      </span>
      <span
        className={`mt-4 text-sm font-medium transition-colors duration-300 ${
          hovered ? "text-accent" : "text-secondary"
        }`}
      >
        Analyse <span aria-hidden>→</span>
      </span>
    </motion.button>
  );
}
