import { motion } from "framer-motion";

const EASE = [0.25, 0.1, 0.25, 1] as const;

/** Shared title block for the content pages (About, Validation, DGMS). */
export default function PageHeader({
  eyebrow,
  title,
  subtitle,
  intro,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  intro?: string;
}) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: EASE }}
    >
      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-accent">{eyebrow}</p>
      <h1
        className="mt-4 font-semibold tracking-[-0.03em] text-primary"
        style={{ fontSize: "clamp(36px, 5.4vw, 56px)", lineHeight: 1.06 }}
      >
        {title}
      </h1>
      {subtitle && <p className="mt-4 text-lg leading-relaxed text-secondary">{subtitle}</p>}
      {intro && <p className="mt-6 max-w-3xl text-base leading-relaxed text-secondary">{intro}</p>}
    </motion.header>
  );
}
