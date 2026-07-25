/**
 * Tiny isometric SVG toolkit for the mode-card previews.
 * World axes: x = right-depth, y = up, z = front-depth.
 * True 2:1 isometric projection (30°).
 */
import type { ReactNode } from "react";
import type { Transition } from "framer-motion";

const KX = 0.866; // cos 30
const KY = 0.5; // sin 30

export function project(x: number, y: number, z: number): [number, number] {
  return [(x - z) * KX, (x + z) * KY - y];
}

function poly(list: [number, number, number][]): string {
  return list.map(([x, y, z]) => project(x, y, z).join(",")).join(" ");
}

export interface BoxColors {
  top: string;
  left: string;
  right: string;
}

export const ROCK: BoxColors = { top: "#3b3f47", left: "#2b2e35", right: "#212429" };
export const MASS: BoxColors = { top: "#565b65", left: "#41454e", right: "#33373e" };
export const BLUE: BoxColors = { top: "#4a97ff", left: "#2f6fe6", right: "#2059c6" };

const EDGE = "#0d0f13";

/** A solid isometric box (top + two visible side faces). */
export function IsoBox({
  x,
  y,
  z,
  w,
  h,
  d,
  colors,
  sw = 0.05,
  opacity = 1,
}: {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  colors: BoxColors;
  sw?: number;
  opacity?: number;
}) {
  const x0 = x,
    x1 = x + w,
    y0 = y,
    y1 = y + h,
    z0 = z,
    z1 = z + d;
  const top = poly([
    [x0, y1, z0],
    [x1, y1, z0],
    [x1, y1, z1],
    [x0, y1, z1],
  ]);
  const right = poly([
    [x1, y0, z0],
    [x1, y1, z0],
    [x1, y1, z1],
    [x1, y0, z1],
  ]);
  const left = poly([
    [x0, y0, z1],
    [x1, y0, z1],
    [x1, y1, z1],
    [x0, y1, z1],
  ]);
  return (
    <g opacity={opacity}>
      <polygon points={right} fill={colors.right} stroke={EDGE} strokeWidth={sw} strokeLinejoin="round" />
      <polygon points={left} fill={colors.left} stroke={EDGE} strokeWidth={sw} strokeLinejoin="round" />
      <polygon points={top} fill={colors.top} stroke={EDGE} strokeWidth={sw} strokeLinejoin="round" />
    </g>
  );
}

/** An arbitrary isometric polygon face (for slip planes, wedges, triangles). */
export function Face({
  points,
  fill,
  opacity = 1,
  stroke = EDGE,
  sw = 0.05,
}: {
  points: [number, number, number][];
  fill: string;
  opacity?: number;
  stroke?: string;
  sw?: number;
}) {
  return (
    <polygon
      points={poly(points)}
      fill={fill}
      opacity={opacity}
      stroke={stroke}
      strokeWidth={sw}
      strokeLinejoin="round"
    />
  );
}

/** Soft contact shadow on the ground plane (y = 0) under a moving mass. */
export function Shadow({
  x,
  z,
  rx = 1,
  opacity = 0.3,
}: {
  x: number;
  z: number;
  rx?: number;
  opacity?: number;
}) {
  const [sx, sy] = project(x, 0, z);
  return <ellipse cx={sx} cy={sy} rx={rx} ry={rx * 0.5} fill="#000" opacity={opacity} />;
}

/** SVG shell with the isometric camera centred. */
export function IsoScene({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 140 140" width="100%" height="100%" style={{ overflow: "visible" }}>
      <g transform="translate(70 82) scale(15)">{children}</g>
    </svg>
  );
}

/** Standard 2.5 s loop timing: still → detach/move → hold → reset. */
export const LOOP: Transition = {
  duration: 2.3,
  times: [0, 0.26, 0.68, 0.82, 1],
  repeat: Infinity,
  repeatDelay: 0.35,
  ease: "easeInOut",
};
