import { motion } from "framer-motion";
import PageHeader from "../components/site/PageHeader";
import SiteFooter from "../components/site/SiteFooter";
import {
  CV_METRICS,
  COMPARISON,
  CONFUSION,
  SENSITIVITY_SUMMARY,
  VALIDATION_TAKEAWAYS,
} from "../data/validation";
import type { ConfusionRow } from "../data/validation";

const EASE = [0.25, 0.1, 0.25, 1] as const;

/* Page CONTENT (numbers) lives in src/data/validation.ts — edit there. */

function Card({ title, children, index }: { title: string; children: React.ReactNode; index: number }) {
  return (
    <motion.section
      className="glass-surface rounded-3xl p-6 sm:p-8"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, ease: EASE, delay: Math.min(index * 0.04, 0.2) }}
    >
      <h2 className="text-2xl font-semibold tracking-[-0.01em] text-primary">{title}</h2>
      {children}
    </motion.section>
  );
}

const SERIES: { key: "tabpfn" | "rf" | "xgb"; name: string; color: string }[] = [
  { key: "tabpfn", name: "TabPFN", color: "var(--color-series-1)" },
  { key: "rf", name: "RandomForest", color: "var(--color-series-2)" },
  { key: "xgb", name: "XGBoost", color: "var(--color-series-3)" },
];

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th scope="col" className="border-b border-glass-border px-3 py-2 text-xs font-semibold uppercase tracking-[0.06em] text-tertiary">
      {children}
    </th>
  );
}

/** One 2×2 confusion matrix. Positive class = UNSTABLE; the FN cell is the dangerous miss. */
function Matrix({ r }: { r: ConfusionRow }) {
  const cell = (n: number, label: string, kind: "ok" | "fp" | "fn") => (
    <div
      className={[
        "flex flex-col items-center justify-center rounded-lg px-2 py-3",
        kind === "ok" ? "bg-white/[0.06]" : kind === "fn" ? "bg-critical/15 ring-1 ring-critical/40" : "bg-warning/10",
      ].join(" ")}
    >
      <span
        className={`text-xl font-semibold tabular-nums ${kind === "fn" ? "text-critical-fg" : kind === "fp" ? "text-warning-fg" : "text-primary"}`}
      >
        {n}
      </span>
      <span className="mt-0.5 text-xs text-tertiary">{label}</span>
    </div>
  );
  return (
    <figure className="rounded-2xl border border-glass-border bg-white/[0.03] p-4">
      <figcaption className="flex items-baseline justify-between">
        <span className="text-base font-semibold text-primary">{r.model}</span>
        <span className="text-xs text-tertiary">{r.accuracyPct}% accurate</span>
      </figcaption>
      <div className="mt-3 grid grid-cols-[auto_1fr_1fr] items-center gap-1.5 text-xs text-tertiary">
        <span />
        <span className="text-center">Pred. stable</span>
        <span className="text-center">Pred. unstable</span>
        <span className="pr-1 text-right">Stable</span>
        {cell(r.tn, "TN", "ok")}
        {cell(r.fp, "FP", "fp")}
        <span className="pr-1 text-right">Unstable</span>
        {cell(r.fn, "FN ⚠", "fn")}
        {cell(r.tp, "TP", "ok")}
      </div>
      <p className="mt-3 text-sm text-secondary">
        Missed failures: <span className="font-semibold tabular-nums text-critical-fg">{r.fnRatePct}%</span>
      </p>
    </figure>
  );
}

export default function ModelValidation() {
  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-5 pt-14 sm:px-8 sm:pt-20">
        <PageHeader
          eyebrow="Validation"
          title="Model & validation"
          subtitle="How the four models were tested, and how they hold up — all on held-out data."
          intro="Every number here comes from 5-fold cross-validation (seed 42): each case is scored by a model that never saw it during training. Nothing is measured on the data a model learned from."
        />

        <div className="mt-10 space-y-6">
          {/* held-out metrics */}
          <Card title="Held-out accuracy (5-fold CV)" index={0}>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr>
                    <Th>Model</Th>
                    <Th>Type</Th>
                    <Th>Headline</Th>
                    <Th>Detail</Th>
                  </tr>
                </thead>
                <tbody>
                  {CV_METRICS.map((r) => (
                    <tr key={r.model}>
                      <th scope="row" className="border-b border-glass-border/50 px-3 py-3 font-medium text-primary">
                        {r.model}
                      </th>
                      <td className="border-b border-glass-border/50 px-3 py-3 text-secondary">{r.task}</td>
                      <td className="border-b border-glass-border/50 px-3 py-3 tabular-nums text-primary">{r.primary}</td>
                      <td className="border-b border-glass-border/50 px-3 py-3 tabular-nums text-secondary">{r.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* comparison */}
          <Card title="TabPFN vs RandomForest vs XGBoost" index={1}>
            <p className="mt-3 text-base leading-relaxed text-secondary">
              All three models trained and scored on the same folds and the same features. Higher is better.
            </p>
            <div className="mt-5 flex flex-wrap gap-4" aria-hidden>
              {SERIES.map((s) => (
                <span key={s.key} className="flex items-center gap-2 text-sm text-secondary">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                  {s.name}
                </span>
              ))}
            </div>
            <div className="mt-5 space-y-5">
              {COMPARISON.map((r) => {
                const best = Math.max(r.tabpfn, r.rf, r.xgb);
                return (
                  <div key={r.dataset}>
                    <div className="mb-1.5 flex items-baseline justify-between">
                      <span className="text-sm font-medium text-primary">{r.dataset}</span>
                      <span className="text-xs text-tertiary">{r.metric}</span>
                    </div>
                    <div className="space-y-1.5">
                      {SERIES.map((s) => {
                        const v = r[s.key];
                        return (
                          <div key={s.key} className="flex items-center gap-3">
                            <span className="w-28 shrink-0 text-sm text-secondary">{s.name}</span>
                            <div
                              className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/8"
                              role="img"
                              aria-label={`${s.name} ${r.metric} ${v.toFixed(3)} on ${r.dataset}`}
                            >
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${Math.round(v * 100)}%`, background: s.color, opacity: v === best ? 1 : 0.55 }}
                              />
                            </div>
                            <span
                              className={`w-12 shrink-0 text-right text-sm tabular-nums ${v === best ? "font-semibold text-primary" : "text-secondary"}`}
                            >
                              {v.toFixed(3)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* confusion matrices */}
          <Card title="Confusion matrices (stable vs unstable)" index={2}>
            <p className="mt-3 text-base leading-relaxed text-secondary">
              Held-out predictions split at the failure boundary (FoS &lt; 1.0 = unstable; circular uses its native
              label). The red <span className="text-critical-fg">FN</span> cell — a truly unstable slope called safe —
              is the dangerous error.
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {CONFUSION.map((r) => (
                <Matrix key={r.model} r={r} />
              ))}
            </div>
          </Card>

          {/* sensitivity */}
          <Card title="Physics sensitivity check" index={3}>
            <p className="mt-3 text-base leading-relaxed text-secondary">{SENSITIVITY_SUMMARY}</p>
          </Card>

          {/* takeaways */}
          <Card title="What this means" index={4}>
            <ul className="mt-4 space-y-3">
              {VALIDATION_TAKEAWAYS.map((t, i) => (
                <li key={i} className="flex gap-3 text-base leading-relaxed text-secondary">
                  <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
