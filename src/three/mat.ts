import * as THREE from "three";
import { noiseMap } from "./textures";

type P = THREE.MeshPhysicalMaterialParameters;
const phys = (color: string, o: P = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.5, metalness: 0, ...o });

/* shared data maps */

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
  steelDark: phys("#8f969a", { metalness: 1, roughness: 0.42 }),
  postGrey: phys("#b3b8ba", { metalness: 1, roughness: 0.36 }),
  stainless: phys("#c5c8ca", { metalness: 1, roughness: 0.27 }),
  /** grey PVC drain pipe (V1 hulls) and its lighter moulded end caps */
  /** white PVC pipe (V2 hulls) */
  binPlastic: phys("#c4d0ff", { roughness: 0.1, transparent: true, opacity: 0.32, clearcoat: 1, clearcoatRoughness: 0.05, side: THREE.DoubleSide, depthWrite: false }),
  deckWhite: phys("#d8d7d2", { roughness: 0.45 }),
  plateWarm: phys("#d9d5cd", { roughness: 0.42 }),
  /** CAD-render palette (V2, V4): clean flat colours, no weathering */
  cadBlue: phys("#1768ac", { roughness: 0.36, clearcoat: 0.3, clearcoatRoughness: 0.25 }),
  cadBlueDeep: phys("#124f88", { roughness: 0.4, clearcoat: 0.25, clearcoatRoughness: 0.3 }),
  cadBlueFloor: phys("#1c74bf", { roughness: 0.55 }),
  hullTeal: phys("#15506f", { roughness: 0.5, clearcoat: 0.15, clearcoatRoughness: 0.4 }),
  binGrey: phys("#767a7e", { metalness: 0.6, roughness: 0.5 }),
  roofGrey: phys("#d5d7d7", { roughness: 0.5 }),
  sheetSilver: phys("#d9dcde", { metalness: 0.55, roughness: 0.38 }),
  bandDark: phys("#2a2c2e", { roughness: 0.5 }),
  tubLip: phys("#3b3f43", { roughness: 0.5 }),
  tubLiner: phys("#c4c8cb", { roughness: 0.5 }),
  beltGreen: phys("#3c7c40", { roughness: 0.72 }),
  anodBlack: phys("#2a2c2f", { metalness: 0.85, roughness: 0.42 }),
  zinc: phys("#d3d6d8", { metalness: 1, roughness: 0.42 }),
  tankDark: phys("#363c3f", { roughness: 0.55 }),
};

/** Clear materials must not cast opaque shadows. */
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
applyPBR(M.pvcGrey, "plastic_white", { tile: 0.45, detail: 1, nScale: 0.5, rDetail: 3, grime: 0.7, dirt: WATER_STAIN, dirtAmt: 0.4 });

// white sheet plastics and enclosures: clean-ish, light dust
applyPBR(M.pvcWhite, "plastic_white", { tile: 0.35, detail: 1, nScale: 0.6, rDetail: 2, grime: 0.45, dirt: DUST, dirtAmt: 0.2 });
applyPBR(M.deckWhite, "plastic_white", { tile: 0.5, detail: 1, nScale: 0.5, rDetail: 2, grime: 0.4, dirt: DUST, dirtAmt: 0.15 });
applyPBR(M.plateWarm, "plastic_white", { tile: 0.5, detail: 1, nScale: 0.5, rDetail: 2, grime: 0.35, dirt: DUST, dirtAmt: 0.12 });

// black ABS / nylon: fine grain and pale scuffs, not blotches
applyPBR(M.black, "plastic_black", { tile: 0.3, detail: 0.3, nScale: 0.35, rDetail: 1.5, grime: 0.3, dirt: "#3a3a38", dirtAmt: 0.2 });
applyPBR(M.blackGloss, "plastic_gloss", { tile: 0.25, detail: 0, nScale: 0.3, rDetail: 2, grime: 0.55 });
applyPBR(M.tankDark, "plastic_dark", { tile: 0.5, detail: 0.5, nScale: 0.7, rDetail: 2, grime: 0.7, dirt: "#4a4438", dirtAmt: 0.3 });

// metals: brushed stainless / aluminium frames, satin anodised pontoon tubes, galvanised posts and sheet
applyPBR(M.stainless, "metal_brushed", { tile: 0.3, detail: 0.45, nScale: 0.6, rDetail: 3, grime: 0.4, dirt: DUST, dirtAmt: 0.15 });
applyPBR(M.postGrey, "metal_brushed", { tile: 0.3, detail: 0.15, nScale: 0.4, rDetail: 2, grime: 0.18 });
applyPBR(M.steelDark, "metal_grey", { tile: 0.35, detail: 0.4, nScale: 0.6, rDetail: 2, grime: 0.5, dirt: "#6e655a", dirtAmt: 0.25 });

// CAD-model plastics and metals (V1, V2, V4): new and clean, so little colour variation and barely any grime, but
// the scans' fine surface relief and roughness variation (orange-peel on moulded plastic, brushing on sheet metal)
// are what make a render read as a real object instead of flat shading
const CLEAN = { grime: 0.06, dirt: DUST, dirtAmt: 0 };
for (const m of [M.cadBlue, M.cadBlueDeep, M.cadBlueFloor]) applyPBR(m, "plastic_gloss", { tile: 0.3, detail: 0, nScale: 0.22, rDetail: 1.4, ...CLEAN });
applyPBR(M.hullTeal, "plastic_dark", { tile: 0.4, detail: 0, nScale: 0.18, rDetail: 0.8, ...CLEAN });
applyPBR(M.bandDark, "plastic_black", { tile: 0.3, detail: 0.15, nScale: 0.3, rDetail: 1.4, ...CLEAN });
applyPBR(M.tubLip, "plastic_black", { tile: 0.3, detail: 0.15, nScale: 0.3, rDetail: 1.4, ...CLEAN });
applyPBR(M.tubLiner, "plastic_white", { tile: 0.4, detail: 0.5, nScale: 0.35, rDetail: 1.6, ...CLEAN });
applyPBR(M.roofGrey, "plastic_white", { tile: 0.45, detail: 0.5, nScale: 0.3, rDetail: 1.6, ...CLEAN });
applyPBR(M.beltGreen, "rubber", { tile: 0.2, detail: 0.35, nScale: 0.9, rDetail: 1, ...CLEAN });
applyPBR(M.binGrey, "metal_grey", { tile: 0.3, detail: 0.08, nScale: 0.3, rDetail: 1.1, ...CLEAN });
applyPBR(M.sheetSilver, "metal_brushed", { tile: 0.3, detail: 0.08, nScale: 0.3, rDetail: 1.4, ...CLEAN });
applyPBR(M.zinc, "metal_brushed", { tile: 0.3, detail: 0.08, nScale: 0.3, rDetail: 1.4, ...CLEAN });
applyPBR(M.anodBlack, "metal_brushed", { tile: 0.3, detail: 0.04, nScale: 0.45, rDetail: 2.2, ...CLEAN });



/** Black solar glass in a 4 x 2 grid of cells split by pale bus-bar lines (the V4 canopy panel). */
export function solarTexture() {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 512;
  const g = c.getContext("2d")!;
  g.fillStyle = "#04060a";
  g.fillRect(0, 0, 1024, 512);
  // faint sky reflection across the cells
  const sheen = g.createLinearGradient(0, 0, 1024, 512);
  sheen.addColorStop(0, "rgba(40,52,76,0.0)");
  sheen.addColorStop(0.5, "rgba(46,58,84,0.55)");
  sheen.addColorStop(1, "rgba(20,26,40,0.0)");
  g.fillStyle = sheen;
  g.fillRect(0, 0, 1024, 512);
  g.fillStyle = "#b7bcc2";
  for (const x of [0, 256, 512, 768, 1018]) g.fillRect(x - 5, 0, 10, 512);
  for (const y of [0, 256, 506]) g.fillRect(0, y - 5, 1024, 10);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

