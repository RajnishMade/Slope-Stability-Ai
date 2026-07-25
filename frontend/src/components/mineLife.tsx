import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { benchRoadRadius, benchInner, benchTopY } from "../three/pitGeometry";

/** Shared soft radial sprite texture for dust puffs and light pools. */
let _softTex: THREE.CanvasTexture | null = null;
function softTexture() {
  if (_softTex) return _softTex;
  const s = 128;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, "rgba(255,255,255,0.9)");
  g.addColorStop(0.4, "rgba(255,255,255,0.22)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  _softTex = new THREE.CanvasTexture(c);
  _softTex.colorSpace = THREE.SRGBColorSpace;
  return _softTex;
}

/** Warm pool of work light cast on a bench surface. */
function LightPool({ radius, opacity = 0.3, color = "#ffab5e" }: { radius: number; opacity?: number; color?: string }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
      <circleGeometry args={[radius, 24]} />
      <meshBasicMaterial
        map={softTexture()}
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  );
}

/** A small haul truck (dumper) modelled facing local +x. */
function TruckModel() {
  const tex = softTexture();
  return (
    <group>
      <mesh position={[0.02, 0.014, 0]}>
        <boxGeometry args={[0.12, 0.022, 0.09]} />
        <meshStandardMaterial color="#17150f" roughness={0.9} flatShading />
      </mesh>
      <mesh position={[-0.02, 0.036, 0]}>
        <boxGeometry args={[0.12, 0.032, 0.075]} />
        <meshStandardMaterial color="#bf9a41" roughness={0.65} metalness={0.25} flatShading />
      </mesh>
      <mesh position={[-0.045, 0.066, 0]} rotation={[0, 0, 0.08]}>
        <boxGeometry args={[0.08, 0.03, 0.082]} />
        <meshStandardMaterial color="#463d31" roughness={0.9} flatShading />
      </mesh>
      <mesh position={[0.05, 0.058, 0]}>
        <boxGeometry args={[0.028, 0.03, 0.06]} />
        <meshStandardMaterial color="#d0a94e" roughness={0.6} flatShading />
      </mesh>
      {/* headlights */}
      <mesh position={[0.076, 0.04, 0.028]}>
        <sphereGeometry args={[0.011, 8, 8]} />
        <meshBasicMaterial color="#fff1d2" toneMapped={false} />
      </mesh>
      <mesh position={[0.076, 0.04, -0.028]}>
        <sphereGeometry args={[0.011, 8, 8]} />
        <meshBasicMaterial color="#fff1d2" toneMapped={false} />
      </mesh>
      {/* taillights */}
      <mesh position={[-0.084, 0.046, 0.024]}>
        <sphereGeometry args={[0.009, 8, 8]} />
        <meshBasicMaterial color="#ff4a2c" toneMapped={false} />
      </mesh>
      <mesh position={[-0.084, 0.046, -0.024]}>
        <sphereGeometry args={[0.009, 8, 8]} />
        <meshBasicMaterial color="#ff4a2c" toneMapped={false} />
      </mesh>
      {/* fading dust trail */}
      <sprite position={[-0.13, 0.05, 0]} scale={[0.17, 0.17, 1]}>
        <spriteMaterial map={tex} color="#cdbb9e" transparent opacity={0.16} depthWrite={false} />
      </sprite>
      <sprite position={[-0.24, 0.06, 0]} scale={[0.28, 0.28, 1]}>
        <spriteMaterial map={tex} color="#c7b596" transparent opacity={0.075} depthWrite={false} />
      </sprite>
    </group>
  );
}

/** One truck crawling its bench road on a continuous loop. */
function Truck({ radius, y, period, dir, phase }: { radius: number; y: number; period: number; dir: 1 | -1; phase: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    const ang = phase + (state.clock.elapsedTime / period) * Math.PI * 2 * dir;
    const g = ref.current;
    if (!g) return;
    g.position.set(Math.cos(ang) * radius, y, Math.sin(ang) * radius);
    g.rotation.y = -ang + (dir > 0 ? -Math.PI / 2 : Math.PI / 2);
  });
  return (
    <group ref={ref}>
      <group scale={1.6}>
        <TruckModel />
      </group>
    </group>
  );
}

const TRUCKS: { bench: number; period: number; dir: 1 | -1; phase: number }[] = [
  { bench: 1, period: 52, dir: 1, phase: 0.4 },
  { bench: 1, period: 61, dir: -1, phase: 3.5 },
  { bench: 2, period: 58, dir: -1, phase: 2.2 },
  { bench: 2, period: 47, dir: 1, phase: 4.1 },
  { bench: 3, period: 56, dir: 1, phase: 1.1 },
  { bench: 3, period: 50, dir: -1, phase: 5.9 },
  { bench: 4, period: 49, dir: -1, phase: 5.3 },
  { bench: 5, period: 62, dir: 1, phase: 3.0 },
];

/** A hydraulic shovel at a working face, with its own warm work light. */
function Excavator({ radius, angle, y }: { radius: number; angle: number; y: number }) {
  return (
    <group position={[Math.cos(angle) * radius, y, Math.sin(angle) * radius]} rotation={[0, -angle + Math.PI / 2, 0]}>
      <group scale={1.5}>
        <mesh position={[0, 0.016, 0]}>
          <boxGeometry args={[0.13, 0.028, 0.1]} />
          <meshStandardMaterial color="#1d1b16" roughness={0.9} flatShading />
        </mesh>
        <mesh position={[-0.02, 0.058, 0]}>
          <boxGeometry args={[0.08, 0.05, 0.075]} />
          <meshStandardMaterial color="#b8933f" roughness={0.7} flatShading />
        </mesh>
        <mesh position={[0.07, 0.085, 0]} rotation={[0, 0, -0.7]}>
          <boxGeometry args={[0.15, 0.02, 0.022]} />
          <meshStandardMaterial color="#9a7d38" roughness={0.7} flatShading />
        </mesh>
        <mesh position={[0.145, 0.03, 0]}>
          <boxGeometry args={[0.03, 0.04, 0.05]} />
          <meshStandardMaterial color="#3a3229" roughness={0.9} flatShading />
        </mesh>
        {/* cab work lamp */}
        <mesh position={[0.02, 0.088, 0.03]}>
          <sphereGeometry args={[0.012, 6, 6]} />
          <meshBasicMaterial color="#ffd9a0" toneMapped={false} />
        </mesh>
      </group>
      <LightPool radius={0.42} opacity={0.34} />
      <pointLight position={[0, 0.18, 0]} intensity={1.4} distance={1.3} color="#ffa855" />
    </group>
  );
}

/** Tall mast with a soft warm cone of light falling onto the bench. */
function LightMast({ radius, angle, y, height = 0.6 }: { radius: number; angle: number; y: number; height?: number }) {
  return (
    <group position={[Math.cos(angle) * radius, y, Math.sin(angle) * radius]}>
      <mesh position={[0, height / 2, 0]}>
        <cylinderGeometry args={[0.008, 0.014, height, 6]} />
        <meshStandardMaterial color="#2a2622" roughness={0.9} flatShading />
      </mesh>
      <mesh position={[0, height + 0.018, 0]}>
        <boxGeometry args={[0.055, 0.022, 0.032]} />
        <meshBasicMaterial color="#ffdca6" toneMapped={false} />
      </mesh>
      {/* soft downward cone (apex at the lamp, base on the bench) */}
      <mesh position={[0, height / 2, 0]}>
        <coneGeometry args={[0.3, height, 18, 1, true]} />
        <meshBasicMaterial
          color="#ffb066"
          transparent
          opacity={0.05}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <LightPool radius={0.34} opacity={0.3} />
    </group>
  );
}

/** A single hi-vis worker: tiny silhouette with a soft warm halo so it reads
    against the dark rock without looking like a floating dot. */
function WorkerFigure() {
  return (
    <group>
      <sprite scale={[0.085, 0.085, 1]} position={[0, 0.022, 0]}>
        <spriteMaterial
          map={softTexture()}
          color="#ff9a3c"
          transparent
          opacity={0.4}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </sprite>
      {/* hi-vis torso */}
      <mesh position={[0, 0.018, 0]}>
        <boxGeometry args={[0.012, 0.026, 0.009]} />
        <meshBasicMaterial color="#ff8c2a" toneMapped={false} />
      </mesh>
      {/* helmet */}
      <mesh position={[0, 0.036, 0]}>
        <sphereGeometry args={[0.0062, 6, 6]} />
        <meshBasicMaterial color="#ffd79a" toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Two or three workers standing together beside equipment. */
function WorkerCluster({
  radius,
  angle,
  y,
  offsets,
}: {
  radius: number;
  angle: number;
  y: number;
  offsets: [number, number][];
}) {
  return (
    <group position={[Math.cos(angle) * radius, y, Math.sin(angle) * radius]}>
      {offsets.map((o, i) => (
        <group key={i} position={[o[0], 0, o[1]]}>
          <WorkerFigure />
        </group>
      ))}
    </group>
  );
}

/** A worker pacing slowly back and forth along a short stretch of bench. */
function WalkingWorker({
  radius,
  y,
  baseAngle,
  span = 0.055,
  period = 28,
  phase = 0,
}: {
  radius: number;
  y: number;
  baseAngle: number;
  span?: number;
  period?: number;
  phase?: number;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    const g = ref.current;
    if (!g) return;
    const w = (state.clock.elapsedTime / period) * Math.PI * 2 + phase;
    const a = baseAngle + Math.sin(w) * span;
    g.position.set(Math.cos(a) * radius, y, Math.sin(a) * radius);
    g.rotation.y = -a + (Math.cos(w) >= 0 ? -Math.PI / 2 : Math.PI / 2);
  });
  return (
    <group ref={ref}>
      <WorkerFigure />
    </group>
  );
}

/** Crusher / conveyor plant on an upper bench — silhouette interest. */
function CrusherPlant({ radius, angle, y }: { radius: number; angle: number; y: number }) {
  return (
    <group position={[Math.cos(angle) * radius, y, Math.sin(angle) * radius]} rotation={[0, -angle + Math.PI / 2, 0]}>
      <mesh position={[0, 0.16, 0]}>
        <boxGeometry args={[0.3, 0.32, 0.22]} />
        <meshStandardMaterial color="#2e2822" roughness={0.9} flatShading />
      </mesh>
      <mesh position={[0.21, 0.14, 0.05]}>
        <cylinderGeometry args={[0.06, 0.07, 0.28, 8]} />
        <meshStandardMaterial color="#332c25" roughness={0.9} flatShading />
      </mesh>
      {/* inclined conveyor */}
      <mesh position={[-0.3, 0.17, 0]} rotation={[0, 0, 0.45]}>
        <boxGeometry args={[0.46, 0.028, 0.07]} />
        <meshStandardMaterial color="#272220" roughness={0.9} flatShading />
      </mesh>
      <mesh position={[-0.46, 0.05, 0]}>
        <boxGeometry args={[0.022, 0.11, 0.022]} />
        <meshStandardMaterial color="#221e1a" roughness={0.9} flatShading />
      </mesh>
      {/* plant lights */}
      <mesh position={[0.05, 0.335, 0.1]}>
        <sphereGeometry args={[0.013, 6, 6]} />
        <meshBasicMaterial color="#ffd39a" toneMapped={false} />
      </mesh>
      <mesh position={[-0.1, 0.335, -0.08]}>
        <sphereGeometry args={[0.011, 6, 6]} />
        <meshBasicMaterial color="#ffc98a" toneMapped={false} />
      </mesh>
      <LightPool radius={0.5} opacity={0.22} />
    </group>
  );
}

/** All mine activity; mount inside the rotating pit group. */
export default function MineLife() {
  return (
    <>
      {TRUCKS.map((t, i) => (
        <Truck key={i} radius={benchRoadRadius(t.bench)} y={benchTopY(t.bench)} period={t.period} dir={t.dir} phase={t.phase} />
      ))}

      {/* working faces on the lower benches */}
      <Excavator radius={benchInner(4) + 0.2} angle={-0.6} y={benchTopY(4)} />
      <Excavator radius={benchInner(5) + 0.18} angle={2.4} y={benchTopY(5)} />
      <Excavator radius={benchInner(6) + 0.16} angle={4.3} y={benchTopY(6)} />

      {/* crew clustered around the shovels at the working faces */}
      <WorkerCluster
        radius={benchInner(4) + 0.36}
        angle={-0.5}
        y={benchTopY(4)}
        offsets={[
          [0, 0],
          [0.055, 0.035],
          [-0.03, 0.06],
        ]}
      />
      <WorkerCluster
        radius={benchInner(5) + 0.33}
        angle={2.52}
        y={benchTopY(5)}
        offsets={[
          [0, 0],
          [0.05, -0.04],
        ]}
      />
      <WorkerCluster
        radius={benchInner(6) + 0.3}
        angle={4.18}
        y={benchTopY(6)}
        offsets={[
          [0, 0],
          [-0.045, 0.04],
          [0.04, 0.07],
        ]}
      />

      {/* crew on the wider upper benches, near the plant and the masts */}
      <WorkerCluster
        radius={benchRoadRadius(1)}
        angle={-1.74}
        y={benchTopY(1)}
        offsets={[
          [0, 0],
          [0.06, 0.04],
        ]}
      />
      <WorkerCluster
        radius={benchRoadRadius(2)}
        angle={3.72}
        y={benchTopY(2)}
        offsets={[
          [0, 0],
          [-0.05, 0.045],
          [0.045, 0.06],
        ]}
      />

      {/* a few pacing slowly along the benches */}
      <WalkingWorker radius={benchRoadRadius(1)} y={benchTopY(1)} baseAngle={0.9} phase={0.6} />
      <WalkingWorker radius={benchRoadRadius(2)} y={benchTopY(2)} baseAngle={2.1} period={33} phase={2.4} />
      <WalkingWorker radius={benchRoadRadius(3)} y={benchTopY(3)} baseAngle={5.3} period={25} phase={4.1} />

      {/* light masts on the wider upper benches */}
      <LightMast radius={benchRoadRadius(1)} angle={1.1} y={benchTopY(1)} />
      <LightMast radius={benchRoadRadius(2)} angle={3.6} y={benchTopY(2)} />
      <LightMast radius={benchRoadRadius(3)} angle={5.5} y={benchTopY(3)} height={0.52} />

      <CrusherPlant radius={benchRoadRadius(1)} angle={-1.9} y={benchTopY(1)} />
    </>
  );
}
