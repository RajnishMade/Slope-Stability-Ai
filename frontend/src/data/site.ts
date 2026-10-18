/* ============================================================================
 *  SITE-WIDE SETTINGS — header navigation, footer links, project metadata.
 *  Edit here; the header and footer components read from this file.
 * ========================================================================== */

export const SITE_NAME = "Slope Stability AI";
export const SITE_TAGLINE = "Slope failure prediction for opencast mines, powered by TabPFN.";
export const REPO_URL = "https://github.com/RajnishMade/Slope-Stability-Ai";

export interface NavItem {
  label: string;
  to: string;
  /** extra path prefixes that should also mark this item active */
  alsoActiveFor?: string[];
}

/** Top navigation, in display order. */
export const NAV: NavItem[] = [
  { label: "Analyse", to: "/", alsoActiveFor: ["/analysis"] },
  { label: "Validation", to: "/validation" },
  { label: "DGMS Guidelines", to: "/dgms" },
  { label: "About", to: "/about" },
];

export interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

/** Primary sources cited across the site (footer "Sources" column). */
export const FOOTER_SOURCES: FooterLink[] = [
  { label: "DGMS (Tech) Circular No. 03 of 2020", href: "/dgms" },
  { label: "DGMS (Tech) Circular No. 02 of 2020", href: "/dgms" },
  { label: "CMR 2017, Regulation 106", href: "https://indiankanoon.org/doc/186023800/", external: true },
  { label: "TabPFN (Prior Labs)", href: "https://github.com/PriorLabs/TabPFN", external: true },
];

export const FOOTER_DISCLAIMER =
  "For engineering screening only. Predictions are model-generated and must be verified by a " +
  "competent person against site-specific data and the applicable DGMS regulations.";
