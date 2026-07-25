import { motion, useReducedMotion } from "framer-motion";
import { IsoScene, IsoBox, Face, ROCK, MASS, BLUE, LOOP } from "./iso";

const N = 4;
const SX = 0.62; // column spacing along x
const BW = 0.44;
const BD = 0.72;
const BH = 1.5;
const ANG = 74; // topple angle (deg)

/** Toppling failure: columns rotate forward about their base edges in a domino cascade. */
export default function TopplingPreview({ active }: { active: boolean }) {
  const reduce = useReducedMotion();
  const play = active && !reduce;

  const x1 = (N - 1) * SX + BW;

  return (
    <IsoScene>
      {/* base + blue basal failure surface */}
      <IsoBox x={-0.3} y={-0.4} z={-0.25} w={x1 + 0.6} h={0.4} d={BD + 0.5} colors={ROCK} />
      <Face
        points={[[-0.3, 0.001, -0.25], [x1 + 0.3, 0.001, -0.25], [x1 + 0.3, 0.001, BD + 0.25], [-0.3, 0.001, BD + 0.25]]}
        fill={BLUE.top}
        opacity={0.4}
      />

      {Array.from({ length: N }).map((_, i) => {
        const s = 0.2 + i * 0.12;
        const e = s + 0.18;
        return (
          <motion.g
            key={i}
            initial={false}
            style={{ originX: "68%", originY: "94%" }}
            animate={play ? { rotate: [0, 0, ANG, ANG, 0] } : { rotate: 0 }}
            transition={play ? { ...LOOP, times: [0, s, e, 0.85, 1] } : { duration: 0.3 }}
          >
            <IsoBox x={i * SX} y={0} z={0} w={BW} h={BH} d={BD} colors={MASS} />
          </motion.g>
        );
      })}
    </IsoScene>
  );
}
