import { useLayoutEffect, useMemo } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import { EffectComposer, Bloom, DepthOfField, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import { makeRockMaterial } from "../three/rockMaterial";
import MineLife from "./mineLife";
import {
  BENCH_COUNT,
  BENCH_HEIGHT,
  FLOOR_RADIUS,
  FLOOR_Y,
  PHI_SEG,
  RADIUS_STEP,
  THETA_SEG,
  TOP_RADIUS,
} from "../three/pitGeometry";

/** Dusk gradient dome — warm amber near the horizon, deep slate-blue overhead. */
function GradientSky() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          topColor: { value: new THREE.Color("#0c0907") },
          midColor: { value: new THREE.Color("#2a1a11") },
          horizonColor: { value: new THREE.Color("#96591f") },
        },
        vertexShader: /* glsl */ `
          varying vec3 vPos;
          void main() {
            vPos = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          varying vec3 vPos;
          uniform vec3 topColor; uniform vec3 midColor; uniform vec3 horizonColor;
          void main() {
            float h = normalize(vPos).y;
            vec3 col = mix(horizonColor, midColor, smoothstep(-0.08, 0.32, h));
            col = mix(col, topColor, smoothstep(0.22, 0.85, h));
            gl_FragColor = vec4(col, 1.0);
          }`,
      }),
    []
  );
  return (
    <mesh scale={60} material={mat}>
      <sphereGeometry args={[1, 32, 16]} />
    </mesh>
  );
}

/** Soft additive halo texture, tinted per-instance via the sprite colour. */
function useGlowTexture() {
  return useMemo(() => {
    const size = 256;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d")!;
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, "rgba(255,255,255,0.95)");
    g.addColorStop(0.28, "rgba(255,255,255,0.32)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
}

function Glow({
  color,
  position,
  scale,
  opacity,
}: {
  color: string;
  position: [number, number, number];
  scale: number;
  opacity: number;
}) {
  const tex = useGlowTexture();
  return (
    <sprite position={position} scale={[scale, scale, 1]}>
      <spriteMaterial
        map={tex}
        color={color}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        opacity={opacity}
        toneMapped={false}
      />
    </sprite>
  );
}

/** Terraced opencast pit — benches of faceted rock, plus all the mine life.
    The pit itself is completely static; only the machinery and crew move. */
function Pit() {
  const rock = useMemo(() => makeRockMaterial(), []);

  const benches = useMemo(() => {
    const items: { outer: number; inner: number; y: number }[] = [];
    for (let i = 0; i < BENCH_COUNT; i++) {
      const outer = TOP_RADIUS - i * RADIUS_STEP;
      items.push({ outer, inner: outer - RADIUS_STEP, y: -i * BENCH_HEIGHT });
    }
    return items;
  }, []);

  return (
    <group position={[0, 0.4, 0]}>
      {benches.map((b, i) => (
        <group key={i}>
          {/* flat bench top */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, b.y, 0]} material={rock}>
            <ringGeometry args={[b.inner, b.outer, THETA_SEG, PHI_SEG]} />
          </mesh>
          {/* bench wall down to the next level */}
          <mesh position={[0, b.y - BENCH_HEIGHT / 2, 0]} material={rock}>
            <cylinderGeometry args={[b.inner, b.inner, BENCH_HEIGHT, THETA_SEG, 3, true]} />
          </mesh>
          {/* warm rim-light along the bench crest — keeps the terracing legible.
              Falls off fast with depth so the lower benches stay dark. */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, b.y + 0.006, 0]}>
            <ringGeometry args={[b.outer - 0.05, b.outer, THETA_SEG, 1]} />
            <meshBasicMaterial
              color="#ff9d55"
              transparent
              opacity={Math.max(0.24 - i * 0.035, 0.012)}
              toneMapped={false}
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_Y, 0]} material={rock}>
        <circleGeometry args={[FLOOR_RADIUS, THETA_SEG]} />
      </mesh>

      {/* faint neutral dust settled on the pit floor — dark, not glowing */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_Y + 0.08, 0]}>
        <circleGeometry args={[FLOOR_RADIUS * 1.25, 48]} />
        <meshBasicMaterial color="#6a6058" transparent opacity={0.09} depthWrite={false} />
      </mesh>

      {/* haul trucks, shovels and the crest treeline ride with the pit */}
      <MineLife />
    </group>
  );
}

/** Camera is locked: fixed position, aimed once at the pit. No orbit or drift. */
function LockedCamera() {
  const { camera } = useThree();
  useLayoutEffect(() => {
    camera.position.set(0, 3.4, 10);
    camera.lookAt(0, -1.2, 0);
    camera.updateProjectionMatrix();
  }, [camera]);
  return null;
}

function Scene() {
  return (
    <>
      <color attach="background" args={["#0a0910"]} />
      <fog attach="fog" args={["#1a1109", 11, 30]} />

      {/* golden-hour: warm raking key, dim NEUTRAL fill on the shadow sides */}
      <ambientLight intensity={0.24} color="#5b4a38" />
      <directionalLight position={[9, 11, 3]} intensity={2.3} color="#ffb066" />
      <directionalLight position={[-7, 4, -5]} intensity={0.26} color="#7d8188" />
      {/* desaturated slate bounce, confined to the deepest benches only —
          short range so it never washes the mid-benches or bleeds up behind the UI */}
      <pointLight position={[0, FLOOR_Y + 0.7, 0]} intensity={1.3} distance={4.2} decay={2} color="#8fa0b4" />

      <GradientSky />
      <LockedCamera />
      <Pit />

      {/* warm sky brightness behind the far rim (no cool core glow — the pit floor stays dark) */}
      <Glow color="#ffab5e" position={[0, 5.4, -13]} scale={28} opacity={0.42} />

      {/* two dust layers: fine motes + a slower, broader drift */}
      <Sparkles count={80} scale={[18, 9, 18]} position={[0, -1, 0]} size={2.2} speed={0.24} opacity={0.45} color="#d8c3a0" />
      <Sparkles count={40} scale={[24, 6, 24]} position={[0, -1.8, 0]} size={4.5} speed={0.12} opacity={0.2} color="#c2ab88" />

      <EffectComposer>
        <Bloom intensity={0.95} luminanceThreshold={0.5} luminanceSmoothing={0.4} mipmapBlur radius={0.82} />
        <DepthOfField focusDistance={0.02} focalLength={0.035} bokehScale={1.5} height={460} />
        <Vignette offset={0.18} darkness={0.98} eskil={false} />
      </EffectComposer>
    </>
  );
}

export default function PitBackground() {
  return (
    <div className="fixed inset-0 z-0 bg-black">
      <Canvas
        dpr={[1, 1.8]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        camera={{ position: [0, 3.4, 10], fov: 40, near: 0.1, far: 80 }}
      >
        <Scene />
      </Canvas>

      {/* Horizontal scrim band behind the heading + card row: blurs and damps
          the background so text and card glass sit on a consistent base. */}
      <div
        className="pointer-events-none absolute inset-x-0"
        style={{
          top: "12%",
          bottom: "10%",
          backdropFilter: "blur(1.4px) saturate(0.86)",
          WebkitBackdropFilter: "blur(1.4px) saturate(0.86)",
          background:
            "linear-gradient(180deg, rgba(10,8,7,0) 0%, rgba(10,8,7,0.38) 16%, rgba(10,8,7,0.5) 50%, rgba(10,8,7,0.38) 84%, rgba(10,8,7,0) 100%)",
          maskImage: "linear-gradient(180deg, transparent 0%, black 13%, black 87%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(180deg, transparent 0%, black 13%, black 87%, transparent 100%)",
        }}
      />

      {/* outer vignette */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 40%, transparent 0%, transparent 46%, rgba(0,0,0,0.5) 100%), linear-gradient(180deg, rgba(0,0,0,0.45) 0%, transparent 24%, transparent 62%, rgba(8,7,10,0.88) 100%)",
        }}
      />
    </div>
  );
}
