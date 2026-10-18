import { motion } from "framer-motion";
import PageHeader from "../components/site/PageHeader";
import SiteFooter from "../components/site/SiteFooter";
import {
  DGMS_TITLE,
  DGMS_SUBTITLE,
  DGMS_INTRO,
  DGMS_VERIFIED,
  DGMS_DISCLAIMER,
  DGMS_SECTIONS,
  DGMS_REFERENCES,
  type GuidelineSection,
  type GuidelineTable,
} from "../data/dgmsGuidelines";

const EASE = [0.25, 0.1, 0.25, 1] as const;

/* All page CONTENT lives in src/data/dgmsGuidelines.ts — edit there, not here. */

function VerifyChip() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-warning/40 bg-warning/10 px-2.5 py-0.5 text-xs font-medium text-warning-fg">
      Verify against source
    </span>
  );
}

function VerifiedChip() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-safe/40 bg-safe/10 px-2.5 py-0.5 text-xs font-medium text-safe-fg">
      ✓ Verified — primary source
    </span>
  );
}

function Table({ table }: { table: GuidelineTable }) {
  return (
    <div className="mt-5 overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr>
            {table.columns.map((c) => (
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
          {table.rows.map((row, i) => (
            <tr key={i} className="align-top">
              {row.map((cell, j) => (
                <td
                  key={j}
                  className={`border-b border-glass-border/50 px-3 py-3 ${
                    j === 0 ? "font-medium text-primary" : "text-secondary"
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {table.note && <p className="mt-3 text-sm leading-relaxed text-tertiary">{table.note}</p>}
    </div>
  );
}

function SectionCard({ section, index }: { section: GuidelineSection; index: number }) {
  return (
    <motion.section
      id={section.id}
      className="glass-surface scroll-mt-6 rounded-3xl p-6 sm:p-8"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, ease: EASE, delay: Math.min(index * 0.04, 0.2) }}
    >
      <div className="flex flex-wrap items-center gap-3">
        {section.glyph && (
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft text-lg text-accent" aria-hidden>
            {section.glyph}
          </span>
        )}
        <h2 className="text-2xl font-semibold tracking-[-0.01em] text-primary">{section.heading}</h2>
        {section.verified && <VerifiedChip />}
        {section.verify && <VerifyChip />}
      </div>

      {section.body.map((para, i) => (
        <p key={i} className="mt-4 text-base leading-relaxed text-secondary">
          {para}
        </p>
      ))}

      {section.bullets && (
        <ul className="mt-4 space-y-2.5">
          {section.bullets.map((b, i) => (
            <li key={i} className="flex gap-3 text-base leading-relaxed text-secondary">
              <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}

      {section.table && <Table table={section.table} />}

      {section.citation && (
        <p className="mt-5 border-t border-glass-border/60 pt-3 text-sm italic text-tertiary">Source: {section.citation}</p>
      )}
    </motion.section>
  );
}

export default function DgmsGuidelines() {
  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-5 pt-14 sm:px-8 sm:pt-20">
        <PageHeader eyebrow="Regulation" title={DGMS_TITLE} subtitle={DGMS_SUBTITLE} intro={DGMS_INTRO} />

        {/* on-page contents */}
        <nav aria-label="On this page" className="mt-8 flex flex-wrap gap-2">
          {DGMS_SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="rounded-full border border-glass-border bg-glass px-3 py-1.5 text-sm text-secondary transition-colors hover:border-glass-border-hover hover:text-primary"
            >
              {s.heading}
            </a>
          ))}
        </nav>

        {/* verified-sources banner */}
        <div className="mt-8 flex gap-3 rounded-2xl border border-safe/30 bg-safe/10 p-4">
          <span className="mt-0.5 shrink-0 text-base text-safe-fg" aria-hidden>
            ✓
          </span>
          <p className="text-sm leading-relaxed text-primary/85">
            <strong className="text-safe-fg">Verified against primary sources.</strong> {DGMS_VERIFIED}
          </p>
        </div>

        {/* disclaimer banner */}
        <div className="mt-4 flex gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-4">
          <span className="mt-0.5 shrink-0 text-base text-warning-fg" aria-hidden>
            ⚠
          </span>
          <p className="text-sm leading-relaxed text-primary/85">{DGMS_DISCLAIMER}</p>
        </div>

        {/* sections */}
        <div className="mt-8 space-y-6">
          {DGMS_SECTIONS.map((s, i) => (
            <SectionCard key={s.id} section={s} index={i} />
          ))}
        </div>

        {/* references */}
        <section className="mt-10 rounded-2xl border border-glass-border bg-glass p-6">
          <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-tertiary">References</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5">
            {DGMS_REFERENCES.map((r, i) => (
              <li key={i} className="text-sm leading-relaxed text-secondary">
                {r}
              </li>
            ))}
          </ol>
        </section>
      </div>
      <SiteFooter />
    </div>
  );
}
