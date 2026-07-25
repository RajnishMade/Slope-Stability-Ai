import { motion, useReducedMotion } from "framer-motion";
import { IsoScene, IsoBox, Face, project, ROCK, MASS, BLUE, LOOP } from "./iso";

const H = 1.6;
const W = 2.4;
const D = 2.2;

// down-dip slide (world) → screen delta
const SLIDE: [number, number, number] = [W * 1.35, -H * 1.35, 0];
const [dx, dy] = project(SLIDE[0], SLIDE[1], SLIDE[2]);

/** Planar failure: a block slides straight down-dip along one flat blue surface. */
export default function PlanarPreview({ active }: { active: boolean }) {
  const reduce = useReducedMotion();
  const play = active && !reduce;

  return (
    <IsoScene>
      {/* grounding plinth */}
      <IsoBox x={-0.3} y={-0.5} z={-0.3} w={W + 0.6} h={0.5} d={D + 0.6} colors={ROCK} />
      {/* dark slope body (front triangle) */}
      <Face points={[[0, 0, D], [W, 0, D], [0, H, D]]} fill={ROCK.left} />
      {/* blue slip surface (the discontinuity) */}
      <Face points={[[0, H, 0], [W, 0, 0], [W, 0, D], [0, H, D]]} fill={BLUE.top} opacity={0.55} />

      {/* sliding block */}
      <motion.g
        initial={false}
        animate={play ? { x: [0, 0, dx, dx, 0], y: [0, 0, dy, dy, 0] } : { x: 0, y: 0 }}
        transition={play ? LOOP : { duration: 0.3 }}
      >
        <ellipse cx={project(0.65, 1.0, 1.05)[0]} cy={project(0.65, 1.0, 1.05)[1]} rx={0.9} ry={0.42} fill="#000" opacity={0.28} />
        <IsoBox x={0.1} y={1.0} z={0.45} w={1.1} h={0.46} d={1.25} colors={MASS} />
      </motion.g>
    </IsoScene>
  );
}
