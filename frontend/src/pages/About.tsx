import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import PageHeader from "../components/site/PageHeader";
import SiteFooter from "../components/site/SiteFooter";
import { ABOUT_INTRO, CREDITS, LIMITATIONS, MODELS, PIPELINE, TECH_STACK, WHY_TABPFN } from "../data/about";

const EASE = [0.25, 0.1, 0.25, 1] as const;

/* Page CONTENT lives in src/data/about.ts — edit there. */

function Card({ title, children, index = 0 }: { title: string; children: React.ReactNode; index?: number }) {
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

export default function About() {
  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-5 pt-14 sm:px-8 sm:pt-20">
        <PageHeader
          eyebrow="Methodology"
          title="How Slope Stability AI works"
          subtitle="From site parameters to a DGMS-checked factor of safety."
          intro={ABOUT_INTRO}
        />

        <div className="mt-10 space-y-6">
          {/* pipeline diagram */}
          <Card title="The prediction pipeline">
            <ol className="mt-6 grid gap-3 md:grid-cols-5">
              {PIPELINE.map((step, i) => (
                <li key={step.title} className="relative">
                  <div className="h-full rounded-2xl border border-glass-border bg-white/[0.035] p-4">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold tabular-nums text-accent">
                      {i + 1}
                    </span>
                    <h3 className="mt-3 text-sm font-semibold text-primary">{step.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-tertiary">{step.body}</p>
                  </div>
                  {i < PIPELINE.length - 1 && (
                    <span
                      aria-hidden
                      className="absolute -right-2.5 top-1/2 z-10 hidden -translate-y-1/2 text-accent md:block"
                    >
                      →
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </Card>

          {/* models */}
          <Card title="The four models" index={1}>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr>
                    {["Mechanism", "Predicts", "Training data", "Cases", "Held-out (5-fold CV)"].map((c) => (
                      <th
                        key={c}
                        scope="col"
                        className="border-b border-glass-border px-3 py-2 text-xs font-semibold uppercase tracking-[0.06em] text-tertiary"
                      >
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MODELS.map((m) => (
                    <tr key={m.mechanism}>
                      <th scope="row" className="border-b border-glass-border/50 px-3 py-3 font-medium text-primary">
                        {m.mechanism}
                      </th>
                      <td className="border-b border-glass-border/50 px-3 py-3 text-secondary">{m.output}</td>
                      <td className="border-b border-glass-border/50 px-3 py-3 text-secondary">{m.data}</td>
                      <td className="border-b border-glass-border/50 px-3 py-3 tabular-nums text-secondary">{m.cases}</td>
                      <td className="border-b border-glass-border/50 px-3 py-3 tabular-nums text-primary">{m.heldOut}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="Why TabPFN" index={2}>
            <p className="mt-3 text-base leading-relaxed text-secondary">{WHY_TABPFN}</p>
            <Link to="/validation" className="mt-4 inline-block text-sm font-medium text-accent hover:text-accent-hover">
              See the full comparison →
            </Link>
          </Card>

          <Card title="Limitations" index={3}>
            <ul className="mt-4 space-y-3">
              {LIMITATIONS.map((l) => (
                <li key={l} className="flex gap-3 text-base leading-relaxed text-secondary">
                  <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-warning" aria-hidden />
                  <span>{l}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Built with" index={4}>
            <dl className="mt-4 divide-y divide-glass-border/60">
              {TECH_STACK.map((t) => (
                <div key={t.area} className="grid gap-1 py-3 sm:grid-cols-[140px_1fr]">
                  <dt className="text-sm font-medium text-tertiary">{t.area}</dt>
                  <dd className="text-sm text-secondary">{t.items}</dd>
                </div>
              ))}
            </dl>
          </Card>

          {CREDITS.length > 0 && (
            <Card title="Credits" index={5}>
              <ul className="mt-4 space-y-1.5">
                {CREDITS.map((c) => (
                  <li key={c} className="text-base text-secondary">
                    {c}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
