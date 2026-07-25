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
 */
export const ANALYSIS_CONFIG: Record<ModeId, SectionConfig[]> = {
  circular: [
    {
      title: "Slope geometry",
      fields: [
        { key: "beta", label: "Slope angle (β)", unit: "°", def: 35, min: 10, max: 80 },
        { key: "H", label: "Slope height (H)", unit: "m", def: 40, min: 5, max: 300 },
      ],
    },
    {
      title: "Material properties",
      fields: [
        { key: "gamma", label: "Unit weight (γ)", unit: "kN/m³", def: 21, min: 12, max: 32, step: 0.5 },
        { key: "c", label: "Cohesion (c)", unit: "kPa", def: 30, min: 0, max: 200 },
        { key: "phi", label: "Friction angle (φ)", unit: "°", def: 32, min: 0, max: 55 },
      ],
    },
    {
      title: "Groundwater",
      fields: [
        { key: "r_u", label: "Pore pressure ratio (rᵤ)", unit: "–", def: 0.2, min: 0, max: 0.7, step: 0.05 },
      ],
    },
  ],

  planar: [
    {
      title: "Slope geometry",
      fields: [
        { key: "slope_af", label: "Slope face angle (ψf)", unit: "°", def: 60, min: 20, max: 90 },
        { key: "plane_dip", label: "Failure plane dip (ψp)", unit: "°", def: 35, min: 5, max: 85 },
        { key: "upper_slope", label: "Upper slope angle (ψs)", unit: "°", def: 15, min: 0, max: 45 },
        { key: "H", label: "Slope height (H)", unit: "m", def: 40, min: 5, max: 300 },
      ],
    },
    {
      title: "Material properties",
      fields: [
        { key: "gamma", label: "Unit weight (γ)", unit: "kN/m³", def: 26, min: 15, max: 32, step: 0.5 },
        { key: "c", label: "Cohesion (c)", unit: "kPa", def: 40, min: 0, max: 200 },
        { key: "phi", label: "Friction angle (φ)", unit: "°", def: 30, min: 0, max: 55 },
      ],
    },
    {
      title: "Groundwater",
      fields: [
        { key: "water_level", label: "Water level", unit: "0–1", def: 0.5, min: 0, max: 1, step: 0.05 },
      ],
    },
    {
      title: "Loading",
      fields: [
        { key: "kh", label: "Seismic coefficient (kh)", unit: "g", def: 0, min: 0, max: 0.5, step: 0.01 },
      ],
    },
  ],

  wedge: [
    {
      title: "Slope geometry",
      fields: [
        { key: "dip_slope", label: "Slope face dip", unit: "°", def: 65, min: 0, max: 90 },
        { key: "dipdir_slope", label: "Slope dip direction", unit: "°", def: 134, min: 0, max: 360 },
        { key: "dip_upper", label: "Upper surface dip", unit: "°", def: 11, min: 0, max: 90 },
        { key: "dipdir_upper", label: "Upper dip direction", unit: "°", def: 122, min: 0, max: 360 },
        { key: "height_m", label: "Slope height", unit: "m", def: 30, min: 5, max: 200 },
      ],
    },
    {
      title: "Joint set 1",
      fields: [
        { key: "dip_j1", label: "Dip", unit: "°", def: 40, min: 0, max: 90 },
        { key: "dipdir_j1", label: "Dip direction", unit: "°", def: 165, min: 0, max: 360 },
        { key: "c1_kPa", label: "Cohesion (c₁)", unit: "kPa", def: 15, min: 0, max: 200 },
        { key: "phi1_deg", label: "Friction angle (φ₁)", unit: "°", def: 35, min: 0, max: 55 },
      ],
    },
    {
      title: "Joint set 2",
      fields: [
        { key: "dip_j2", label: "Dip", unit: "°", def: 70, min: 0, max: 90 },
        { key: "dipdir_j2", label: "Dip direction", unit: "°", def: 286, min: 0, max: 360 },
        { key: "c2_kPa", label: "Cohesion (c₂)", unit: "kPa", def: 5, min: 0, max: 200 },
        { key: "phi2_deg", label: "Friction angle (φ₂)", unit: "°", def: 20, min: 0, max: 55 },
      ],
    },
    {
      title: "Material properties",
      fields: [
        { key: "gamma_kN_m3", label: "Unit weight (γ)", unit: "kN/m³", def: 25, min: 15, max: 32, step: 0.5 },
      ],
    },
    {
      title: "Groundwater",
      fields: [
        { key: "w_pct", label: "Joint water fill", unit: "%", def: 30, min: 0, max: 100 },
      ],
    },
  ],

  toppling: [
    {
      title: "Slope geometry",
      fields: [
        { key: "slope_angle_deg", label: "Slope angle (ψf)", unit: "°", def: 45, min: 20, max: 85 },
        { key: "bedding_dip_deg", label: "Bedding dip (ψp)", unit: "°", def: 20, min: 0, max: 90 },
        { key: "slope_height_m", label: "Slope height", unit: "m", def: 30, min: 5, max: 200 },
        { key: "joint_spacing_m", label: "Joint spacing", unit: "m", def: 0.5, min: 0.05, max: 5, step: 0.05 },
      ],
    },
    {
      title: "Material properties",
      fields: [
        { key: "joint_friction_deg", label: "Joint friction (φj)", unit: "°", def: 35, min: 5, max: 60 },
        { key: "unit_weight_kNm3", label: "Unit weight (γ)", unit: "kN/m³", def: 26, min: 15, max: 32, step: 0.5 },
      ],
    },
    {
      title: "Groundwater",
      fields: [
        { key: "water_ratio", label: "Water ratio (rᵤ)", unit: "–", def: 0.2, min: 0, max: 1, step: 0.05 },
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
