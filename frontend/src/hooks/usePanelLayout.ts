import { useCallback, useEffect, useState } from "react";
import type { ModeId } from "../data/modes";

/** Which panel is minimised to just its title bar. Mutually exclusive by design —
 *  collapsing both would leave the right column empty. */
export type Collapsed = "none" | "viz" | "results";

export interface PanelLayout {
  /** Share of the right column's height given to the visualisation (0–1). */
  vizFrac: number;
  /** Width of the left input column, in px. */
  inputW: number;
  collapsed: Collapsed;
}

/**
 * Results gets the larger default share: the 3D view re-fits its camera to
 * whatever height it is given, whereas the results content has a natural
 * height and would otherwise scroll internally.
 */
export const LAYOUT_DEFAULTS: PanelLayout = { vizFrac: 0.26, inputW: 380, collapsed: "none" };

/** Neither panel may be dragged below this height. */
export const MIN_PANEL_PX = 150;
export const MIN_INPUT_W = 300;
export const MAX_INPUT_W = 560;
export const HANDLE_PX = 10;

const key = (mode: string) => `ssai.layout.${mode}`;

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

function load(mode: ModeId): PanelLayout {
  try {
    const raw = localStorage.getItem(key(mode));
    if (!raw) return LAYOUT_DEFAULTS;
    const p = JSON.parse(raw) as Partial<PanelLayout>;
    return {
      vizFrac:
        typeof p.vizFrac === "number" && Number.isFinite(p.vizFrac)
          ? clamp(p.vizFrac, 0.12, 0.88)
          : LAYOUT_DEFAULTS.vizFrac,
      inputW:
        typeof p.inputW === "number" && Number.isFinite(p.inputW)
          ? clamp(p.inputW, MIN_INPUT_W, MAX_INPUT_W)
          : LAYOUT_DEFAULTS.inputW,
      collapsed: p.collapsed === "viz" || p.collapsed === "results" ? p.collapsed : "none",
    };
  } catch {
    return LAYOUT_DEFAULTS;
  }
}

/**
 * Split-layout state for one failure mode, persisted to localStorage so
 * returning to that mode restores the user's preferred split.
 */
export function usePanelLayout(mode: ModeId) {
  const [layout, setLayout] = useState<PanelLayout>(() => load(mode));

  // swap in the stored layout when the mode changes
  useEffect(() => {
    setLayout(load(mode));
  }, [mode]);

  const persist = useCallback(
    (next: PanelLayout) => {
      setLayout(next);
      try {
        localStorage.setItem(key(mode), JSON.stringify(next));
      } catch {
        /* storage unavailable (private mode / quota) — layout stays in memory */
      }
    },
    [mode]
  );

  const setVizFrac = useCallback(
    (f: number) => persist({ ...layout, vizFrac: clamp(f, 0.12, 0.88) }),
    [layout, persist]
  );

  const setInputW = useCallback(
    (w: number) => persist({ ...layout, inputW: clamp(w, MIN_INPUT_W, MAX_INPUT_W) }),
    [layout, persist]
  );

  /** Toggling one panel always un-collapses the other. */
  const toggleCollapse = useCallback(
    (which: "viz" | "results") =>
      persist({ ...layout, collapsed: layout.collapsed === which ? "none" : which }),
    [layout, persist]
  );

  const resetSplit = useCallback(
    () => persist({ ...layout, vizFrac: LAYOUT_DEFAULTS.vizFrac, collapsed: "none" }),
    [layout, persist]
  );

  return { layout, setVizFrac, setInputW, toggleCollapse, resetSplit };
}

/**
 * Matches a CSS media query.
 *
 * Listens to BOTH the MediaQueryList `change` event and window `resize`: the
 * change event alone can be missed when the viewport is resized
 * programmatically, which would leave the JS layout out of sync with the CSS
 * breakpoint (drag handles left active on a stacked layout).
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false
  );

  useEffect(() => {
    const mq = window.matchMedia(query);
    const sync = () => setMatches((prev) => (prev === mq.matches ? prev : mq.matches));
    sync();
    mq.addEventListener("change", sync);
    window.addEventListener("resize", sync);
    return () => {
      mq.removeEventListener("change", sync);
      window.removeEventListener("resize", sync);
    };
  }, [query]);

  return matches;
}
