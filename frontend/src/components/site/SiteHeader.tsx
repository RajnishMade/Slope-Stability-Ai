import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { NAV, REPO_URL } from "../../data/site";
import type { NavItem } from "../../data/site";
import Logo from "./Logo";

function isActive(item: NavItem, pathname: string): boolean {
  if (item.to === "/") {
    return pathname === "/" || (item.alsoActiveFor ?? []).some((p) => pathname.startsWith(p));
  }
  return pathname.startsWith(item.to) || (item.alsoActiveFor ?? []).some((p) => pathname.startsWith(p));
}

function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" aria-hidden fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8a8 8 0 0 0 5.47 7.59c.4.07.55-.17.55-.38v-1.33c-2.23.48-2.7-1.07-2.7-1.07-.36-.92-.89-1.17-.89-1.17-.73-.5.06-.49.06-.49.8.06 1.23.83 1.23.83.72 1.22 1.88.87 2.34.66.07-.52.28-.87.5-1.07-1.78-.2-3.65-.89-3.65-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82A7.6 7.6 0 0 1 8 3.87c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48v2.2c0 .21.15.46.55.38A8 8 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

/**
 * One header on every route: brand on the left, primary navigation on the
 * right with a clear active state. Collapses to a menu button below `md`.
 */
export default function SiteHeader() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  // close the mobile menu whenever the route changes
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="relative z-30 shrink-0 border-b border-glass-border bg-[rgba(11,13,17,0.72)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-5 sm:px-8">
        <Link to="/" aria-label="Slope Stability AI — home" className="rounded-lg">
          <Logo />
        </Link>

        {/* desktop nav */}
        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => {
            const active = isActive(item, pathname);
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={active ? "page" : undefined}
                className={[
                  "rounded-lg px-3.5 py-2 text-sm font-medium transition-colors duration-200",
                  active
                    ? "bg-accent-soft text-accent"
                    : "text-secondary hover:bg-glass-hover hover:text-primary",
                ].join(" ")}
              >
                {item.label}
              </Link>
            );
          })}
          <span className="mx-2 h-5 w-px bg-glass-border" aria-hidden />
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="Source code on GitHub"
            className="rounded-lg p-2 text-secondary transition-colors hover:bg-glass-hover hover:text-primary"
          >
            <GitHubIcon />
          </a>
        </nav>

        {/* mobile menu button */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-secondary hover:bg-glass-hover hover:text-primary md:hidden"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            {open ? <path d="M5 5l10 10M15 5L5 15" /> : <path d="M3 6h14M3 10h14M3 14h14" />}
          </svg>
        </button>
      </div>

      {/* mobile dropdown */}
      {open && (
        <nav
          id="mobile-nav"
          aria-label="Primary"
          className="border-t border-glass-border bg-[rgba(11,13,17,0.94)] px-5 pb-4 pt-2 md:hidden"
        >
          {NAV.map((item) => {
            const active = isActive(item, pathname);
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={active ? "page" : undefined}
                className={[
                  "block rounded-lg px-3 py-3 text-base font-medium",
                  active ? "bg-accent-soft text-accent" : "text-secondary hover:text-primary",
                ].join(" ")}
              >
                {item.label}
              </Link>
            );
          })}
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-1 flex items-center gap-2 rounded-lg px-3 py-3 text-base font-medium text-secondary hover:text-primary"
          >
            <GitHubIcon /> GitHub
          </a>
        </nav>
      )}
    </header>
  );
}
