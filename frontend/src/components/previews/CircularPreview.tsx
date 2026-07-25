import { motion, useReducedMotion } from "framer-motion";
import { IsoScene, IsoBox, Face, project, ROCK, MASS, BLUE, LOOP } from "./iso";

const H = 1.6;
const W = 2.6;
const D = 2.2;
const ZC = D / 2;

const crest = project(0, H, ZC);
const toe = project(W, 0, ZC);
const ARC = `M ${crest[0]} ${crest[1]} Q -0.2 0.95 ${toe[0]} ${toe[1]}`;

// slump translation (world) → screen delta
const [dx, dy] = project(1.2, -1.0, 0);

/** Circular failure: crest mass rotates and slumps down a curved arc slip surface. */
export default function CircularPreview({ active }: { active: boolean }) {
  const reduce = useReducedMotion();
  const play = active && !reduce;

  return (
    <IsoScene>
      <IsoBox x={-0.3} y={-0.5} z={-0.3} w={W + 0.6} h={0.5} d={D + 0.6} colors={ROCK} />
      {/* dump slope body */}
      <Face points={[[0, 0, D], [W, 0, D], [0, H, D]]} fill={ROCK.left} />
      <Face points={[[0, H, 0], [W, 0, 0], [W, 0, D], [0, H, D]]} fill={ROCK.top} />

      {/* circular slip surface — draws itself in as the mass moves */}
      <motion.path
        d={ARC}
        fill="none"
        stroke={BLUE.top}
        strokeWidth={2.4}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        initial={false}
        animate={play ? { pathLength: [0, 0, 1, 1, 0], opacity: [0.5, 0.5, 1, 1, 0.5] } : { pathLength: 1, opacity: 0.6 }}
        transition={play ? LOOP : { duration: 0.3 }}
      />

      {/* slumping crest mass */}
      <motion.g
        initial={false}
        style={{ originX: "50%", originY: "100%" }}
        animate={play ? { x: [0, 0, dx, dx, 0], y: [0, 0, dy, dy, 0], rotate: [0, 0, -14, -14, 0] } : { x: 0, y: 0, rotate: 0 }}
        transition={play ? LOOP : { duration: 0.3 }}
      >
        <ellipse cx={project(0.35, 1.15, 1.1)[0]} cy={project(0.35, 1.15, 1.1)[1]} rx={0.85} ry={0.4} fill="#000" opacity={0.26} />
        <IsoBox x={-0.15} y={1.12} z={0.5} w={1.0} h={0.5} d={1.2} colors={MASS} />
      </motion.g>
    </IsoScene>
  );
}
