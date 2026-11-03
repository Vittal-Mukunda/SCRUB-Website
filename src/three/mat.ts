import * as THREE from "three";
import { noiseMap, speckleColor } from "./textures";

type P = THREE.MeshPhysicalMaterialParameters;
const phys = (color: string, o: P = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.5, metalness: 0, ...o });

/* shared data maps */
const scuff = noiseMap({ cells: 5, octaves: 5, seed: 3, lo: 150, hi: 255, scratches: 70, repeat: 2 }); // roughness variation (marks, scuffs)
const grain = noiseMap({ size: 256, cells: 48, octaves: 3, seed: 8, lo: 90, hi: 170, repeat: 6 }); // fine plastic grain (bump)
const sandMap = speckleColor([202, 189, 160], 34, 512, 5, 11);
const concreteMap = speckleColor([158, 158, 150], 22, 512, 4, 17);
const rough = noiseMap({ cells: 9, octaves: 5, seed: 29, lo: 100, hi: 255, repeat: 3 });

/**
 * Shared material palette. Colours are real-world albedos (metals: their reflectance colour), matched to
 * the SCRUB photos; plastics are single-layer satin like real PVC/ABS (no car-paint clearcoat) unless they
 * are genuinely glossy.
 */
export const M = {
  pvcGrey: phys("#9c9e9a", { roughness: 0.4 }),
  pvcWhite: phys("#dcdcd5", { roughness: 0.42 }),
  black: phys("#1c1e20", { roughness: 0.5 }),
  blackGloss: phys("#121416", { roughness: 0.22, clearcoat: 0.7, clearcoatRoughness: 0.08 }),
  rubber: phys("#1d1e20", { roughness: 0.82, specularIntensity: 0.5, sheen: 0.5, sheenColor: new THREE.Color("#5a5c60"), sheenRoughness: 0.75 }),
  alu: phys("#e4e7ea", { metalness: 1, roughness: 0.34 }),
  steelDark: phys("#8f969a", { metalness: 1, roughness: 0.42 }),
  postGrey: phys("#b3b8ba", { metalness: 1, roughness: 0.36 }),
  stainless: phys("#c5c8ca", { metalness: 1, roughness: 0.27 }),
  pontoon: phys("#b9bdc0", { metalness: 1, roughness: 0.33 }),
  /** grey PVC drain pipe (V1 hulls) and its lighter moulded end caps */
  pvcPipeGrey: phys("#a3a5a1", { roughness: 0.36 }),
  pvcCap: phys("#c5c7c4", { roughness: 0.3 }),
  /** white PVC pipe (V2 hulls) */
  pvcCream: phys("#e2e1db", { roughness: 0.3 }),
  polythene: phys("#eef3ff", { roughness: 0.42, transmission: 0.55, thickness: 0.02, ior: 1.3, attenuationColor: new THREE.Color("#dbe6ff"), attenuationDistance: 0.6 }),
  binPlastic: phys("#c4d0ff", { roughness: 0.1, transparent: true, opacity: 0.32, clearcoat: 1, clearcoatRoughness: 0.05, side: THREE.DoubleSide, depthWrite: false }),
  cableBlue: phys("#2f62e6", { roughness: 0.38, clearcoat: 0.3, clearcoatRoughness: 0.3 }),
  cableRed: phys("#d8352a", { roughness: 0.38, clearcoat: 0.3, clearcoatRoughness: 0.3 }),
  pcbBlue: phys("#1f4fb5", { roughness: 0.45, clearcoat: 0.5 }),
  rollerBrown: phys("#5b4030", { roughness: 0.8, bumpMap: grain, bumpScale: 1.2 }),
  orangeTape: phys("#f08a2c", { roughness: 0.55, roughnessMap: scuff }),
  redLabel: phys("#d6253a", { roughness: 0.5, clearcoat: 0.3 }),
  yellowFace: phys("#e6ae00", { roughness: 0.4, clearcoat: 0.3, clearcoatRoughness: 0.2 }),
  orange: phys("#e8632b", { roughness: 0.4, clearcoat: 0.5, clearcoatRoughness: 0.2 }),
  yellow: phys("#dba21c", { roughness: 0.38, clearcoat: 0.3, clearcoatRoughness: 0.2 }),
  boardWhite: phys("#d9d9d4", { roughness: 0.6 }),
  deckWhite: phys("#d8d7d2", { roughness: 0.45 }),
  plateWarm: phys("#d9d5cd", { roughness: 0.42 }),
  sand: phys("#ffffff", { map: sandMap, roughness: 1, roughnessMap: rough, bumpMap: rough, bumpScale: 2 }),
  concrete: phys("#ffffff", { map: concreteMap, roughness: 0.95, roughnessMap: rough, bumpMap: rough, bumpScale: 1.2 }),
  tankDark: phys("#363c3f", { roughness: 0.55 }),
  roofMetal: phys("#c3c6c6", { metalness: 1, roughness: 0.42, side: THREE.DoubleSide }),
  clear: phys("#ffffff", { roughness: 0.04, transmission: 1, thickness: 0.03, ior: 1.49, transparent: false, attenuationColor: new THREE.Color("#e6f3ff"), attenuationDistance: 1.2 }),
  lavender: phys("#ffffff", { roughness: 0.05, transmission: 0.92, thickness: 0.04, ior: 1.49, attenuationColor: new THREE.Color("#b9a6ff"), attenuationDistance: 0.35 }),
  ledGreen: new THREE.MeshStandardMaterial({ color: "#38ff7a", emissive: new THREE.Color("#38ff7a"), emissiveIntensity: 2.2, toneMapped: false }),
  ledRed: new THREE.MeshStandardMaterial({ color: "#ff4a3a", emissive: new THREE.Color("#ff4a3a"), emissiveIntensity: 2, toneMapped: false }),
  screen: phys("#04140b", { emissive: new THREE.Color("#2dff86"), emissiveIntensity: 0.55, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.02 }),
  debrisWhite: phys("#ecebe6", { roughness: 0.35 }),
  debrisGreen: phys("#5d8f2a", { roughness: 0.9, bumpMap: grain, bumpScale: 1 }),
  debrisBrown: phys("#7c5a35", { roughness: 0.9, bumpMap: grain, bumpScale: 1 }),
  debrisBlue: phys("#3f79c9", { roughness: 0.32, clearcoat: 0.4 }),
};

/** Clear materials must not cast opaque shadows. */
M.clear.userData.noShadow = true;
M.lavender.userData.noShadow = true;
M.binPlastic.userData.noShadow = true;

/* ---------- photographic PBR textures, projected at true scale ----------
 * Photo-scanned CC0 materials from ambientCG (https://ambientcg.com) in /public/textures.
 * They are projected "triplanar" in the part's own space, so the grain keeps the same real-world size
 * on a 2 m hull pipe and a 5 cm clamp alike (no UV stretching).
 *
 * The photo only supplies *relative* detail: each map is divided by its own average, so the material's
 * colour and roughness stay exactly what is set above and `detail` dials how strongly the scan's grain,
 * scratches and brushing show through. On top sits a weathering layer built from two scales of grime:
 * uneven roughness (smudges, also on the clearcoat), slightly darker patches, and sharper-edged stains
 * tinted with `dirt` (brown water marks on hulls, grey dust elsewhere). Until a texture arrives the
 * material simply keeps its plain colour. */
const loader = new THREE.TextureLoader();
const scans = new Map<string, Promise<THREE.Texture>>();
/** Every scan that has arrived, so the showroom can upload them to the GPU before it is revealed. */
export const loadedScans: THREE.Texture[] = [];

/**
 * One texture per file, shared by every material that uses it (one download, one GPU upload).
 * The image is decoded off the main thread before it is handed over, so uploading it later is quick.
 */
function scanTexture(url: string, srgb: boolean) {
  let p = scans.get(url);
  if (!p) {
    p = loader.loadAsync(url).then(async (t) => {
      await (t.image as HTMLImageElement).decode?.().catch(() => {});
      t.wrapS = t.wrapT = THREE.RepeatWrapping; // ambientCG maps tile seamlessly; mirroring would create symmetric "star" patterns
      t.anisotropy = 8;
      if (srgb) t.colorSpace = THREE.SRGBColorSpace;
      loadedScans.push(t);
      return t;
    });
    scans.set(url, p);
  }
  return p;
}
const grunge = noiseMap({ size: 256, cells: 3, octaves: 6, seed: 77, lo: 30, hi: 255, scratches: 40 });
const flatTex = (r: number, g: number, b: number) => {
  const t = new THREE.DataTexture(new Uint8Array([r, g, b, 255]), 1, 1);
  t.needsUpdate = true;
  return t;
};
const WHITE = flatTex(255, 255, 255);
const FLAT_NORMAL = flatTex(128, 128, 255);

/** Average colour (linear-ish 0..1 of the sRGB file) and average roughness of each scan. */
const SCAN: Record<string, { c: [number, number, number]; r: number }> = {
  plastic_white: { c: [0.932, 0.917, 0.913], r: 0.4 },
  plastic_black: { c: [0.172, 0.161, 0.155], r: 0.453 },
  plastic_dark: { c: [0.196, 0.199, 0.207], r: 0.366 },
  plastic_gloss: { c: [0.169, 0.605, 0.883], r: 0.292 },
  metal_brushed: { c: [0.537, 0.541, 0.549], r: 0.43 },
  metal_grey: { c: [0.623, 0.63, 0.628], r: 0.536 },
  galvanized: { c: [0.603, 0.61, 0.606], r: 0.406 },
  concrete: { c: [0.723, 0.723, 0.723], r: 0.516 },
  sand: { c: [0.725, 0.67, 0.596], r: 0.518 },
  rubber: { c: [0.167, 0.169, 0.194], r: 0.591 },
};

const TRI_HEAD = /* glsl */ `
uniform sampler2D triMap;
uniform sampler2D triNormal;
uniform sampler2D triRough;
uniform sampler2D triGrunge;
uniform float triScale;
uniform float triNormalScale;
uniform float triUseMap;
uniform float triUseNormal;
uniform float triUseRough;
uniform vec3 triMean;
uniform float triDetail;
uniform float triRoughMean;
uniform float triRoughDetail;
uniform float triGrime;
uniform vec3 triDirt;
uniform float triDirtAmt;
uniform mat3 normalMatrix;
varying vec3 vTriPos;
varying vec3 vTriNrm;
vec3 triWeights(vec3 n) { vec3 w = pow(abs(n), vec3(6.0)); return w / (w.x + w.y + w.z + 1e-4); }
vec4 triSample(sampler2D t, vec3 p, vec3 w, float s) {
  return texture2D(t, p.zy * s) * w.x + texture2D(t, p.xz * s) * w.y + texture2D(t, p.xy * s) * w.z;
}
`;

const TRI_COLOR = /* glsl */ `
vec3 triWt = triWeights(normalize(vTriNrm));
vec3 triC = triSample(triMap, vTriPos, triWt, triScale).rgb;
// clamped: on near-black scans a pale scratch is many times the average and would read as white speckle
diffuseColor.rgb *= mix(vec3(1.0), clamp(triC / max(triMean, vec3(0.01)), 0.45, 1.7), triUseMap * triDetail);
// two scales of grime, offset so their repeats never line up
float triG = triSample(triGrunge, vTriPos, triWt, triScale * 0.33).r * 0.65
           + triSample(triGrunge, vTriPos * 1.71 + 0.37, triWt, triScale * 0.13).r * 0.35;
float triStain = smoothstep(0.5, 0.22, triG) * triDirtAmt;
diffuseColor.rgb *= mix(1.0, 0.84 + 0.24 * triG, triGrime);
diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * triDirt, triStain);
diffuseColor.rgb = min(diffuseColor.rgb, vec3(1.0));
`;

const TRI_ROUGH = /* glsl */ `
float roughnessFactor = roughness;
float triR = triSample(triRough, vTriPos, triWt, triScale).g;
roughnessFactor *= mix(1.0, pow(max(triR, 0.01) / triRoughMean, triRoughDetail), triUseRough);
roughnessFactor = clamp(roughnessFactor + (1.0 - triG) * 0.2 * triGrime + triStain * 0.22, 0.04, 1.0);
`;

// smudges and fine wear on the clear top layer of glossy parts
const TRI_COAT = /* glsl */ `
#include <lights_physical_fragment>
#ifdef USE_CLEARCOAT
  material.clearcoatRoughness = clamp(material.clearcoatRoughness + (1.0 - triG) * 0.3 * triGrime, 0.0525, 1.0);
#endif
`;

const TRI_NORMAL = /* glsl */ `
if (triUseNormal > 0.5) {
  vec3 nO = normalize(vTriNrm);
  vec3 tx = texture2D(triNormal, vTriPos.zy * triScale).xyz * 2.0 - 1.0;
  vec3 ty = texture2D(triNormal, vTriPos.xz * triScale).xyz * 2.0 - 1.0;
  vec3 tz = texture2D(triNormal, vTriPos.xy * triScale).xyz * 2.0 - 1.0;
  tx.xy *= triNormalScale; ty.xy *= triNormalScale; tz.xy *= triNormalScale;
  tx = vec3(tx.xy + nO.zy, abs(tx.z) * nO.x);
  ty = vec3(ty.xy + nO.xz, abs(ty.z) * nO.y);
  tz = vec3(tz.xy + nO.xy, abs(tz.z) * nO.z);
  vec3 pn = normalize(tx.zyx * triWt.x + ty.xzy * triWt.y + tz.xyz * triWt.z);
  normal = normalize(normalMatrix * pn);
}
`;

interface TriOpts {
  /** real-world size (metres) of one texture tile */
  tile?: number;
  /** 0..1 how strongly the scan's colour variation shows (0 = keep the material colour, only surface relief) */
  detail?: number;
  normal?: boolean;
  /** contrast of the scan's roughness variation (0 = none, 1 = as scanned, >1 exaggerated); null = no roughness map */
  rDetail?: number | null;
  nScale?: number;
  /** 0..1 amount of weathering variation */
  grime?: number;
  /** stain tint and its 0..1 strength */
  dirt?: string;
  dirtAmt?: number;
}

function applyPBR(mat: THREE.MeshPhysicalMaterial, name: string, o: TriOpts = {}) {
  const { tile = 0.5, detail = 0.6, normal = true, rDetail = 2, nScale = 0.8, grime = 0.5, dirt = "#8a8a86", dirtAmt = 0 } = o;
  const scan = SCAN[name];
  const u = {
    triMap: { value: WHITE as THREE.Texture },
    triNormal: { value: FLAT_NORMAL as THREE.Texture },
    triRough: { value: WHITE as THREE.Texture },
    triGrunge: { value: grunge as THREE.Texture },
    triScale: { value: 1 / tile },
    triNormalScale: { value: nScale },
    triUseMap: { value: 0 },
    triUseNormal: { value: 0 },
    triUseRough: { value: 0 },
    triMean: { value: new THREE.Vector3(...scan.c) },
    triDetail: { value: detail },
    triRoughMean: { value: scan.r },
    triRoughDetail: { value: rDetail ?? 0 },
    triGrime: { value: grime },
    triDirt: { value: new THREE.Color(dirt) },
    triDirtAmt: { value: dirtAmt },
  };
  // the old UV-based maps are replaced by the triplanar ones
  mat.roughnessMap = null;
  mat.bumpMap = null;
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vTriPos;\nvarying vec3 vTriNrm;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvTriPos = position;\nvTriNrm = normal;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\n" + TRI_HEAD)
      .replace("#include <map_fragment>", TRI_COLOR)
      .replace("#include <roughnessmap_fragment>", TRI_ROUGH)
      .replace("#include <normal_fragment_maps>", "#include <normal_fragment_maps>\n" + TRI_NORMAL)
      .replace("#include <lights_physical_fragment>", TRI_COAT);
  };
  mat.customProgramCacheKey = () => "tri-v2";

  const load = (suffix: string, srgb: boolean, apply: (t: THREE.Texture) => void) =>
    scanTexture(`/textures/${name}_${suffix}.webp`, srgb)
      .then((t) => {
        apply(t);
        (mat as unknown as { uniformsNeedUpdate: boolean }).uniformsNeedUpdate = true;
      })
      .catch(() => {}); // the material keeps its plain colour
  if (detail > 0)
    load("c", true, (t) => {
      u.triMap.value = t;
      u.triUseMap.value = 1;
    });
  if (normal)
    load("n", false, (t) => {
      u.triNormal.value = t;
      u.triUseNormal.value = 1;
    });
  if (rDetail !== null)
    load("r", false, (t) => {
      u.triRough.value = t;
      u.triUseRough.value = 1;
    });
}

// sRGB file average -> linear, so the scan's mean matches what the shader samples
for (const s of Object.values(SCAN)) s.c = s.c.map((v) => new THREE.Color(v, v, v).convertSRGBToLinear().r) as [number, number, number];

const WATER_STAIN = "#9a8466"; // tea-brown lake residue
const DUST = "#9c9b97";

// PVC pipes: satin, lengthwise extrusion sheen, scuffs and brown water stains like the Madiwala hulls
applyPBR(M.pvcPipeGrey, "plastic_white", { tile: 0.45, detail: 1, nScale: 0.5, rDetail: 3, grime: 0.8, dirt: WATER_STAIN, dirtAmt: 0.4 });
applyPBR(M.pvcCap, "plastic_white", { tile: 0.3, detail: 1, nScale: 0.4, rDetail: 2, grime: 0.5, dirt: WATER_STAIN, dirtAmt: 0.3 });
applyPBR(M.pvcCream, "plastic_white", { tile: 0.45, detail: 1, nScale: 0.5, rDetail: 3, grime: 0.6, dirt: WATER_STAIN, dirtAmt: 0.35 });
applyPBR(M.pvcGrey, "plastic_white", { tile: 0.45, detail: 1, nScale: 0.5, rDetail: 3, grime: 0.7, dirt: WATER_STAIN, dirtAmt: 0.4 });

// white sheet plastics and enclosures: clean-ish, light dust
applyPBR(M.pvcWhite, "plastic_white", { tile: 0.35, detail: 1, nScale: 0.6, rDetail: 2, grime: 0.45, dirt: DUST, dirtAmt: 0.2 });
applyPBR(M.boardWhite, "plastic_white", { tile: 0.5, detail: 1, nScale: 0.6, rDetail: 2, grime: 0.55, dirt: DUST, dirtAmt: 0.25 });
applyPBR(M.deckWhite, "plastic_white", { tile: 0.5, detail: 1, nScale: 0.5, rDetail: 2, grime: 0.4, dirt: DUST, dirtAmt: 0.15 });
applyPBR(M.plateWarm, "plastic_white", { tile: 0.5, detail: 1, nScale: 0.5, rDetail: 2, grime: 0.35, dirt: DUST, dirtAmt: 0.12 });

// black ABS / nylon: fine grain and pale scuffs, not blotches
applyPBR(M.black, "plastic_black", { tile: 0.3, detail: 0.3, nScale: 0.35, rDetail: 1.5, grime: 0.3, dirt: "#3a3a38", dirtAmt: 0.2 });
applyPBR(M.blackGloss, "plastic_gloss", { tile: 0.25, detail: 0, nScale: 0.3, rDetail: 2, grime: 0.55 });
applyPBR(M.rubber, "rubber", { tile: 0.25, detail: 0.5, nScale: 1.1, rDetail: 1, grime: 0.3 });
applyPBR(M.tankDark, "plastic_dark", { tile: 0.5, detail: 0.5, nScale: 0.7, rDetail: 2, grime: 0.7, dirt: "#4a4438", dirtAmt: 0.3 });

// metals: brushed stainless / aluminium frames, satin anodised pontoon tubes, galvanised posts and sheet
applyPBR(M.stainless, "metal_brushed", { tile: 0.3, detail: 0.45, nScale: 0.6, rDetail: 3, grime: 0.4, dirt: DUST, dirtAmt: 0.15 });
applyPBR(M.alu, "metal_brushed", { tile: 0.3, detail: 0.4, nScale: 0.6, rDetail: 3, grime: 0.4 });
applyPBR(M.pontoon, "metal_brushed", { tile: 0.6, detail: 0.12, nScale: 0.3, rDetail: 1.5, grime: 0.18 }); // V4 is new: clean satin
applyPBR(M.postGrey, "metal_brushed", { tile: 0.3, detail: 0.15, nScale: 0.4, rDetail: 2, grime: 0.18 });
applyPBR(M.steelDark, "metal_grey", { tile: 0.35, detail: 0.4, nScale: 0.6, rDetail: 2, grime: 0.5, dirt: "#6e655a", dirtAmt: 0.25 });
// the roof/wall sheets already have real corrugation in their geometry, so no normal map
applyPBR(M.roofMetal, "galvanized", { tile: 0.6, detail: 0.8, normal: false, rDetail: 1, grime: 0.8, dirt: "#8c8270", dirtAmt: 0.3 });

// V3 ground: smaller tile so the grains read as sand, not cork
applyPBR(M.concrete, "concrete", { tile: 1, detail: 1, nScale: 1, rDetail: 1, grime: 0.9, dirt: "#9a9384", dirtAmt: 0.3 });
M.concrete.color.set("#c4c2bc");
M.concrete.map = null;
applyPBR(M.sand, "sand", { tile: 0.45, detail: 1, nScale: 1.2, rDetail: 1, grime: 0.5 });
M.sand.color.set("#bab09e");
M.sand.map = null;
M.sand.roughness = 0.95;
M.concrete.roughness = 0.9;

// glossy coloured plastics keep their colour; they only take the scan's surface detail and a little wear
for (const m of [M.yellow, M.yellowFace, M.orange, M.debrisBlue, M.debrisWhite]) {
  applyPBR(m, "plastic_gloss", { tile: 0.3, detail: 0, nScale: 0.35, rDetail: 2, grime: 0.45, dirt: "#7d6f58", dirtAmt: 0.2 });
}

/** White plate with a black frame and bold text, like the "S.C.R.U.B." window on the control box. */
export function labelTexture(text: string) {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 512;
  const g = c.getContext("2d")!;
  g.fillStyle = "#f7f8f5";
  g.fillRect(0, 0, 1024, 512);
  g.strokeStyle = "#101214";
  g.lineWidth = 44;
  g.strokeRect(22, 22, 980, 468);
  g.fillStyle = "#101214";
  g.font = "600 170px 'Space Grotesk', Arial, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text, 512, 262);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Matte matt grey-black with printed text, for small decals. */
export function decalMaterial(text: string, fg = "#101214", bg = "rgba(0,0,0,0)") {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 128;
  const g = c.getContext("2d")!;
  g.fillStyle = bg;
  g.fillRect(0, 0, 512, 128);
  g.fillStyle = fg;
  g.font = "700 74px 'Space Grotesk', Arial, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text, 256, 66);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.6 });
}
