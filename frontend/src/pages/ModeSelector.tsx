import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import ModeCard from "../components/ModeCard";
import type { CardPhase } from "../components/ModeCard";
import { FAILURE_MODES } from "../data/modes";

const EASE = [0.25, 0.1, 0.25, 1] as const;

export default function ModeSelector() {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  function handleSelect(id: string) {
    if (selectedId) return;
    setSelectedId(id);
    // brief punch, then the grid fades while the chosen card expands forward,
    // and we hand off to the analysis route as that settles.
    window.setTimeout(() => setExpanded(true), 160);
    window.setTimeout(() => navigate(`/analysis/${id}`), 620);
  }

  function phaseFor(id: string): CardPhase {
    if (!selectedId) return "idle";
    if (id !== selectedId) return expanded ? "fading" : "idle";
    return expanded ? "selected" : "punch";
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      <motion.div
        className="relative z-10 flex min-h-full flex-col items-center justify-center px-6 py-16"
        animate={{ opacity: expanded ? 0 : 1 }}
        transition={{ duration: 0.4, ease: EASE }}
      >
        <motion.p
          className="mb-5 text-[13px] font-semibold uppercase tracking-[0.32em] text-white/45"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          Slope Stability AI
        </motion.p>

        <motion.h1
          className="text-center font-semibold tracking-[-0.02em] text-primary"
          style={{ fontSize: "clamp(48px, 7vw, 80px)", lineHeight: 1.03 }}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: EASE, delay: 0.06 }}
        >
          Which Failure Mode?
        </motion.h1>

        <motion.p
          className="mt-4 text-center text-[19px] text-secondary"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: EASE, delay: 0.12 }}
        >
          Select A Slope Failure Mechanism To Begin Prediction
        </motion.p>

        <div className="mt-14 flex flex-wrap items-stretch justify-center gap-6">
          {FAILURE_MODES.map((mode, i) => (
            <ModeCard
              key={mode.id}
              mode={mode}
              phase={phaseFor(mode.id)}
              delay={0.22 + i * 0.08}
              onSelect={() => handleSelect(mode.id)}
            />
          ))}
        </div>
      </motion.div>

      <motion.p
        className="pointer-events-none absolute bottom-6 left-1/2 z-10 -translate-x-1/2 text-[12px] tracking-[0.02em] text-tertiary sm:left-8 sm:translate-x-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: expanded ? 0 : 1 }}
        transition={{ duration: 0.4, ease: EASE, delay: expanded ? 0 : 0.4 }}
      >
        DGMS-compliant · FoS ≥ 1.2 rock · ≥ 1.3 dump
      </motion.p>
    </div>
  );
}
