import type { ComponentType } from "react";
import CircularPreview from "../components/previews/CircularPreview";
import PlanarPreview from "../components/previews/PlanarPreview";
import WedgePreview from "../components/previews/WedgePreview";
import TopplingPreview from "../components/previews/TopplingPreview";

export type ModeId = "circular" | "planar" | "wedge" | "toppling";

export interface FailureMode {
  id: ModeId;
  title: string;
  description: string;
  Preview: ComponentType<{ active: boolean }>;
}

export function getMode(id: string): FailureMode | undefined {
  return FAILURE_MODES.find((m) => m.id === id);
}

export const FAILURE_MODES: FailureMode[] = [
  {
    id: "circular",
    title: "Circular",
    description: "Dump & overburden slopes",
    Preview: CircularPreview,
  },
  {
    id: "planar",
    title: "Planar",
    description: "Single discontinuity sliding",
    Preview: PlanarPreview,
  },
  {
    id: "wedge",
    title: "Wedge",
    description: "Two-plane intersection",
    Preview: WedgePreview,
  },
  {
    id: "toppling",
    title: "Toppling",
    description: "Column rotation about base",
    Preview: TopplingPreview,
  },
];
