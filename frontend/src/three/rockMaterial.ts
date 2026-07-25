import * as THREE from "three";

/* Simplex 3D noise — Ian McEwan / Ashima Arts (MIT). Injected into the
   standard material so we keep full PBR lighting while adding organic
   rock displacement and geological strata banding. */
const SIMPLEX_3D = /* glsl */ `
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + 1.0 * C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
  i = mod(i, 289.0);
  vec4 p = permute( permute( permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 1.0/7.0;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
`;

/**
 * Faceted slate-rock material for the pit benches.
 * flatShading + vertex displacement => crisp low-poly facets whose normals
 * are derived per-face automatically, so lighting stays correct.
 */
export function makeRockMaterial(): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.96,
    metalness: 0.04,
    flatShading: true,
    side: THREE.DoubleSide,
  });

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uNoiseAmp = { value: 0.06 };
    shader.uniforms.uNoiseFreq = { value: 0.55 };

    // ---- vertex: displace along normal, pass world position down ----
    shader.vertexShader =
      `uniform float uNoiseAmp;\nuniform float uNoiseFreq;\nvarying vec3 vWorldPos;\nvarying vec3 vWorldNormal;\n${SIMPLEX_3D}\n` +
      shader.vertexShader;

    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      /* glsl */ `#include <begin_vertex>
        float rockN = snoise(position * uNoiseFreq)
                    + 0.5 * snoise(position * uNoiseFreq * 2.7);
        transformed += normal * rockN * uNoiseAmp;
        vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);`
    );

    // ---- fragment: warm-to-cool depth ramp + strata + terracing separation ----
    shader.fragmentShader =
      `varying vec3 vWorldPos;\nvarying vec3 vWorldNormal;\n${SIMPLEX_3D}\n` + shader.fragmentShader;

    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <color_fragment>",
      /* glsl */ `#include <color_fragment>
        // 0 at the crest, 1 at the pit floor
        float d = clamp((0.4 - vWorldPos.y) / 3.7, 0.0, 1.0);

        // depth ramp: sunlit copper -> dusty ochre -> brown-grey -> near-black
        vec3 cCopper = vec3(0.520, 0.268, 0.108);
        vec3 cOchre  = vec3(0.352, 0.252, 0.140);
        vec3 cBrown  = vec3(0.152, 0.138, 0.126);
        vec3 cFloor  = vec3(0.040, 0.044, 0.053);
        vec3 rock = mix(cCopper, cOchre, smoothstep(0.0, 0.38, d));
        rock = mix(rock, cBrown, smoothstep(0.34, 0.72, d));
        rock = mix(rock, cFloor, smoothstep(0.70, 1.0, d));

        // geological strata banding modulates the ramp
        float band  = sin(vWorldPos.y * 5.2 + snoise(vWorldPos * 0.55) * 1.5) * 0.5 + 0.5;
        float band2 = sin(vWorldPos.y * 13.0 + snoise(vWorldPos * 1.1) * 2.0) * 0.5 + 0.5;
        rock *= 0.86 + 0.28 * band;
        rock *= 0.94 + 0.12 * band2;

        // fine grit + crevice darkening
        rock += snoise(vWorldPos * 7.5) * 0.022;
        rock *= 0.78 + 0.22 * smoothstep(-0.6, 0.6, snoise(vWorldPos * 3.0));

        // terracing: lift the lit bench tops, sink the shadowed bench faces
        float up = clamp(vWorldNormal.y, 0.0, 1.0);
        rock *= mix(0.52, 1.22, up);
        // warm low-sun kiss on the upper bench tops only
        rock += vec3(0.055, 0.030, 0.011) * up * (1.0 - d);

        // depth haze: dusty WARM grey, thickening toward the pit bottom
        vec3 haze = vec3(0.250, 0.215, 0.185);
        rock = mix(rock, haze, d * d * 0.32);

        diffuseColor.rgb = rock;`
    );
  };

  // Keep a stable cache key so all benches share one compiled program.
  mat.customProgramCacheKey = () => "slate-rock";
  return mat;
}
