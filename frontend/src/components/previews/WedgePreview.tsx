import { motion, useReducedMotion } from "framer-motion";
import { IsoScene, IsoBox, Face, project, ROCK, MASS, BLUE, LOOP } from "./iso";

// shared intersection edge
const A: [number, number, number] = [0, 1.5, 0];
const B: [number, number, number] = [1.0, 0, 1.0];

// wedge drops along the line of intersection → straight down on screen
const [dx, dy] = project(1.2, -1.92, 1.2);

/** Wedge failure: a tetrahedral block slides out along the intersection of two planes. */
export default function WedgePreview({ active }: { active: boolean }) {
  const reduce = useReducedMotion();
  const play = active && !reduce;

  const wa: [number, number, number] = [0.08, 1.16, 0.12];
  const wb: [number, number, number] = [0.9, 0.06, 0.9];
  const wl: [number, number, number] = [-0.12, 0.5, 0.78];
  const wr: [number, number, number] = [0.78, 0.5, 0.02];

  return (
    <IsoScene>
      <IsoBox x={-0.6} y={-0.5} z={-0.6} w={2.8} h={0.5} d={2.8} colors={ROCK} />

      {/* two blue intersecting discontinuity planes (stay put) */}
      <Face points={[A, [-1.3, 1.5, 1.3], [-0.2, 0, 2.2], B]} fill={BLUE.top} opacity={0.58} />
      <Face points={[A, [1.3, 1.5, -1.3], [2.2, 0, -0.2], B]} fill={BLUE.left} opacity={0.62} />

      {/* dark tetrahedral wedge */}
      <motion.g
        initial={false}
        animate={play ? { x: [0, 0, dx, dx, 0], y: [0, 0, dy, dy, 0] } : { x: 0, y: 0 }}
        transition={play ? LOOP : { duration: 0.3 }}
      >
        <ellipse cx={project(0.5, 0, 0.6)[0]} cy={project(0.5, 0, 0.6)[1]} rx={0.7} ry={0.34} fill="#000" opacity={0.26} />
        <Face points={[wa, wl, wb]} fill={MASS.left} />
        <Face points={[wa, wr, wb]} fill={MASS.right} />
        <Face points={[wl, wb, wr]} fill={MASS.top} />
      </motion.g>
    </IsoScene>
  );
}
