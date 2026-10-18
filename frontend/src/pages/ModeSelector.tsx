import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import ModeCard from "../components/ModeCard";
import type { CardPhase } from "../components/ModeCard";
import SiteFooter from "../components/site/SiteFooter";
import { FAILURE_MODES } from "../data/modes";

const EASE = [0.25, 0.1, 0.25, 1] as const;

/* Headline numbers — all from held-out validation (see /validation). */
const STATS: { value: string; label: string }[] = [
  { value: "1,213", label: "training cases across four datasets" },
  { value: "4", label: "failure mechanisms, one model each" },
  { value: "0.86–0.96", label: "held-out R² on FoS (5-fold CV)" },
  { value: "≥ 1.30", label: "DGMS working-slope FoS check" },
];

const STEPS: { n: string; title: string; body: string }[] = [
  {
    n: "01",
    title: "Choose a mechanism",
    body: "Circular, planar, wedge or toppling — each has its own trained model and inputs.",
  },
  {
    n: "02",
    title: "Enter site parameters",
    body: "Geometry, shear strength, groundwater and seismic loading, with live checks against the training range.",
  },
  {
    n: "03",
    title: "Read the verdict",
    body: "Factor of safety with a 95% band, checked against DGMS Circular 03/2020, plus a 3D view of the failure.",
  },
];

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

  const fade = { animate: { opacity: expanded ? 0 : 1 }, transition: { duration: 0.4, ease: EASE } };

  return (
    <div className="h-full w-full overflow-y-auto overflow-x-hidden">
      {/* ---------------- hero ---------------- */}
      <motion.section className="mx-auto max-w-7xl px-5 pt-16 sm:px-8 sm:pt-24" {...fade}>
        <motion.div
          className="mx-auto max-w-3xl text-center"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: EASE }}
        >
          <Link
            to="/dgms"
            className="inline-flex items-center gap-2 rounded-full border border-accent-border bg-accent-soft px-3.5 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/20"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
            Aligned with DGMS Circular 03/2020
            <span aria-hidden>→</span>
          </Link>

          <h1
            className="mt-7 font-semibold tracking-[-0.03em] text-primary"
            style={{ fontSize: "clamp(40px, 6.2vw, 72px)", lineHeight: 1.04 }}
          >
            Slope failure prediction
            <span className="block text-secondary">for opencast mines</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-secondary">
            Estimate the factor of safety for circular, planar, wedge and toppling failure in seconds —
            checked against DGMS thresholds and validated on held-out data.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() =>
                document.getElementById("mechanisms")?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
              className="rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-accent-ink shadow-[0_8px_28px_var(--color-accent-glow)] transition-colors hover:bg-accent-hover"
            >
              Start an analysis
            </button>
            <Link
              to="/validation"
              className="rounded-xl border border-glass-border bg-glass px-5 py-3 text-sm font-semibold text-primary backdrop-blur transition-colors hover:border-glass-border-hover hover:bg-glass-hover"
            >
              See how it's validated
            </Link>
          </div>
        </motion.div>

        {/* trust strip */}
        <motion.dl
          className="glass-surface mx-auto mt-16 grid max-w-5xl grid-cols-2 overflow-hidden rounded-2xl md:grid-cols-4"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: EASE, delay: 0.12 }}
        >
          {STATS.map((s, i) => (
            <div
              key={s.label}
              className={[
                "px-5 py-6 text-center",
                i % 2 === 1 ? "border-l border-glass-border" : "",
                i >= 2 ? "border-t border-glass-border md:border-t-0" : "",
                i === 2 ? "md:border-l" : "",
              ].join(" ")}
            >
              <dt className="sr-only">{s.label}</dt>
              <dd className="text-2xl font-semibold tracking-[-0.02em] text-primary tabular-nums sm:text-3xl">
                {s.value}
              </dd>
              <dd className="mt-1.5 text-sm leading-snug text-tertiary">{s.label}</dd>
            </div>
          ))}
        </motion.dl>
      </motion.section>

      {/* ---------------- mechanisms ---------------- */}
      <section id="mechanisms" className="mx-auto max-w-7xl scroll-mt-6 px-5 pt-24 sm:px-8">
        <motion.div className="mb-10 text-center" {...fade}>
          <h2 className="text-3xl font-semibold tracking-[-0.02em] text-primary">Choose a failure mechanism</h2>
          <p className="mt-3 text-base text-secondary">
            Each mechanism has its own model, input set and 3D visualisation.
          </p>
        </motion.div>

        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
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
      </section>

      {/* ---------------- how it works ---------------- */}
      <motion.section className="mx-auto max-w-7xl px-5 pt-24 sm:px-8" {...fade}>
        <h2 className="text-center text-3xl font-semibold tracking-[-0.02em] text-primary">How it works</h2>
        <ol className="mx-auto mt-10 grid max-w-5xl gap-4 md:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n} className="glass-surface rounded-2xl p-6">
              <span className="text-sm font-semibold tabular-nums text-accent">{s.n}</span>
              <h3 className="mt-3 text-lg font-semibold text-primary">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-secondary">{s.body}</p>
            </li>
          ))}
        </ol>
        <p className="mt-8 text-center text-sm text-tertiary">
          Want the details?{" "}
          <Link to="/about" className="font-medium text-accent hover:text-accent-hover">
            Read the methodology →
          </Link>
        </p>
      </motion.section>

      <SiteFooter />
    </div>
  );
}
