import { Link } from "react-router-dom";
import {
  FOOTER_DISCLAIMER,
  FOOTER_SOURCES,
  NAV,
  REPO_URL,
  SITE_TAGLINE,
} from "../../data/site";
import type { FooterLink } from "../../data/site";
import Logo from "./Logo";

function FLink({ link }: { link: FooterLink }) {
  const cls = "text-sm text-secondary transition-colors hover:text-primary";
  return link.external ? (
    <a href={link.href} target="_blank" rel="noreferrer" className={cls}>
      {link.label} <span aria-hidden className="text-tertiary">↗</span>
    </a>
  ) : (
    <Link to={link.href} className={cls}>
      {link.label}
    </Link>
  );
}

function Column({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-tertiary">{title}</h2>
      <ul className="space-y-2.5">{children}</ul>
    </div>
  );
}

/** Site footer for the scrolling content pages (not the full-height analysis app). */
export default function SiteFooter() {
  return (
    <footer className="relative z-10 mt-20 border-t border-glass-border bg-[rgba(11,13,17,0.82)] backdrop-blur-xl">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-8 md:grid-cols-[1.4fr_1fr_1.4fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-secondary">{SITE_TAGLINE}</p>
        </div>

        <Column title="Explore">
          {NAV.map((n) => (
            <li key={n.to}>
              <FLink link={{ label: n.label, href: n.to }} />
            </li>
          ))}
        </Column>

        <Column title="Sources">
          {FOOTER_SOURCES.map((s) => (
            <li key={s.label}>
              <FLink link={s} />
            </li>
          ))}
        </Column>

        <Column title="Project">
          <li>
            <FLink link={{ label: "Source code", href: REPO_URL, external: true }} />
          </li>
          <li>
            <FLink link={{ label: "Methodology", href: "/about" }} />
          </li>
        </Column>
      </div>

      <div className="border-t border-glass-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-6 text-xs leading-relaxed text-tertiary sm:px-8 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} Slope Stability AI</p>
          <p className="max-w-3xl md:text-right">{FOOTER_DISCLAIMER}</p>
        </div>
      </div>
    </footer>
  );
}
