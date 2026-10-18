import type { ModeId } from "./modes";

export interface FieldConfig {
  /** Matches the backend request field name exactly, so payloads map 1:1. */
  key: string;
  label: string;
  unit: string;
  def: number;
  min: number;
  max: number;
  step?: number;
}

export interface SectionConfig {
  title: string;
  fields: FieldConfig[];
}

/**
 * Per-mode input schema. Layout code reads this — adding or changing a
 * parameter never requires touching the panel components.
 *
 * Field keys mirror the FastAPI request models in backend/schemas.py.
 *
 * RANGES & DEFAULTS are aligned to each model's TRAINING ENVELOPE (the min/max
 * of the data it actually learned from — see backend/model_metrics.json →
 * dataset.ranges). A value outside that envelope is an extrapolation the model
 * cannot be trusted on, so the sliders bracket the trained range and the
 * defaults sit inside it. The input panel additionally flags, live, any value
 * that leaves the trained range. Keep new defaults inside the trained range.
 */
export const ANALYSIS_CONFIG: Record<ModeId, SectionConfig[]> = {
  // trained: β 10–59 · H 3.7–565 · γ 12–31 · c 0–300 · φ 0–49.5 · r_u 0–0.75
  circular: [
    {
      title: "Slope geometry",
      fields: [
        { key: "beta", label: "Slope angle (β)", unit: "°", def: 35, min: 10, max: 60 },
        { key: "H", label: "Slope height (H)", unit: "m", def: 40, min: 5, max: 300 },
      ],
    },
    {
      title: "Material properties",
      fields: [
        { key: "gamma", label: "Unit weight (γ)", unit: "kN/m³", def: 21, min: 12, max: 32, step: 0.5 },
        { key: "c", label: "Cohesion (c)", unit: "kPa", def: 30, min: 0, max: 300 },
        { key: "phi", label: "Friction angle (φ)", unit: "°", def: 32, min: 0, max: 50 },
      ],
    },
    {
      title: "Groundwater",
      fields: [
        { key: "r_u", label: "Pore pressure ratio (rᵤ)", unit: "–", def: 0.2, min: 0, max: 0.75, step: 0.05 },
      ],
    },
  ],

  // trained: ψf 48–86 · ψp 21–69 · ψs 0–30 · H 1–252 · γ 24–28.4 · φ 13.5–45.7
  //          · c 5–188 · kh 0–0.15 · water 0–0.9
  planar: [
    {
      title: "Slope geometry",
      fields: [
        { key: "slope_af", label: "Slope face angle (ψf)", unit: "°", def: 58, min: 45, max: 88 },
        { key: "plane_dip", label: "Failure plane dip (ψp)", unit: "°", def: 46, min: 20, max: 72 },
        { key: "upper_slope", label: "Upper slope angle (ψs)", unit: "°", def: 12, min: 0, max: 32 },
        { key: "H", label: "Slope height (H)", unit: "m", def: 40, min: 5, max: 260 },
      ],
    },
    {
      title: "Material properties",
      fields: [
        { key: "gamma", label: "Unit weight (γ)", unit: "kN/m³", def: 26.5, min: 23, max: 29, step: 0.5 },
        { key: "c", label: "Cohesion (c)", unit: "kPa", def: 50, min: 5, max: 190 },
        { key: "phi", label: "Friction angle (φ)", unit: "°", def: 32, min: 12, max: 48 },
      ],
    },
    {
      title: "Groundwater",
      fields: [
        { key: "water_level", label: "Water level", unit: "0–1", def: 0.4, min: 0, max: 1, step: 0.05 },
      ],
    },
    {
      title: "Loading",
      fields: [
        // trained only up to kh = 0.15 — beyond that the model over-predicts FoS (unconservative).
        { key: "kh", label: "Seismic coefficient (kh)", unit: "g", def: 0, min: 0, max: 0.15, step: 0.01 },
      ],
    },
  ],

  // trained: dip_slope 45–75 · dip_upper 0–20 · H 8–40 · dip_j1/j2 31–75
  //          · c1/c2 0–50 · φ1/φ2 25–40 · γ 22–27 · w 0–38 · dip-dirs 0–360
  wedge: [
    {
      title: "Slope geometry",
      fields: [
        { key: "dip_slope", label: "Slope face dip", unit: "°", def: 65, min: 40, max: 80 },
        { key: "dipdir_slope", label: "Slope dip direction", unit: "°", def: 134, min: 0, max: 360 },
        { key: "dip_upper", label: "Upper surface dip", unit: "°", def: 11, min: 0, max: 25 },
        { key: "dipdir_upper", label: "Upper dip direction", unit: "°", def: 122, min: 0, max: 360 },
        { key: "height_m", label: "Slope height", unit: "m", def: 30, min: 8, max: 45 },
      ],
    },
    {
      title: "Joint set 1",
      fields: [
        { key: "dip_j1", label: "Dip", unit: "°", def: 45, min: 30, max: 80 },
        { key: "dipdir_j1", label: "Dip direction", unit: "°", def: 165, min: 0, max: 360 },
        { key: "c1_kPa", label: "Cohesion (c₁)", unit: "kPa", def: 15, min: 0, max: 50 },
        { key: "phi1_deg", label: "Friction angle (φ₁)", unit: "°", def: 35, min: 25, max: 42 },
      ],
    },
    {
      title: "Joint set 2",
      fields: [
        { key: "dip_j2", label: "Dip", unit: "°", def: 60, min: 30, max: 80 },
        { key: "dipdir_j2", label: "Dip direction", unit: "°", def: 286, min: 0, max: 360 },
        { key: "c2_kPa", label: "Cohesion (c₂)", unit: "kPa", def: 10, min: 0, max: 50 },
        { key: "phi2_deg", label: "Friction angle (φ₂)", unit: "°", def: 30, min: 25, max: 42 },
      ],
    },
    {
      title: "Material properties",
      fields: [
        { key: "gamma_kN_m3", label: "Unit weight (γ)", unit: "kN/m³", def: 25, min: 22, max: 28, step: 0.5 },
      ],
    },
    {
      title: "Groundwater",
      fields: [
        { key: "w_pct", label: "Joint water fill", unit: "%", def: 20, min: 0, max: 45 },
      ],
    },
  ],

  // trained: slope 44–80 · bedding_dip 55–75 · spacing 1.1–12 · H 5–60
  //          · φj 22–45 · γ 23–27 · water 0–0.7
  toppling: [
    {
      title: "Slope geometry",
      fields: [
        { key: "slope_angle_deg", label: "Slope angle (ψf)", unit: "°", def: 60, min: 40, max: 82 },
        { key: "bedding_dip_deg", label: "Bedding dip (ψp)", unit: "°", def: 68, min: 50, max: 80 },
        { key: "slope_height_m", label: "Slope height", unit: "m", def: 30, min: 5, max: 62 },
        { key: "joint_spacing_m", label: "Joint spacing", unit: "m", def: 7.5, min: 1, max: 12, step: 0.5 },
      ],
    },
    {
      title: "Material properties",
      fields: [
        { key: "joint_friction_deg", label: "Joint friction (φj)", unit: "°", def: 33, min: 20, max: 48 },
        { key: "unit_weight_kNm3", label: "Unit weight (γ)", unit: "kN/m³", def: 25, min: 22, max: 28, step: 0.5 },
      ],
    },
    {
      title: "Groundwater",
      fields: [
        { key: "water_ratio", label: "Water ratio (rᵤ)", unit: "–", def: 0.3, min: 0, max: 0.7, step: 0.05 },
      ],
    },
  ],
};

/** Flat list of every field for a mode. */
export function fieldsFor(mode: ModeId): FieldConfig[] {
  return ANALYSIS_CONFIG[mode].flatMap((s) => s.fields);
}

/** Validation message for one value, or null when valid. */
export function fieldError(f: FieldConfig, raw: string): string | null {
  if (raw.trim() === "") return "Required";
  const n = Number(raw);
  if (!Number.isFinite(n)) return "Must be a number";
  if (n < f.min || n > f.max) return `Must be between ${f.min} and ${f.max}`;
  return null;
}
