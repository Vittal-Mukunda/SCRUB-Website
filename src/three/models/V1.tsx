import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { M } from "../mat";
import { Bx, Cyl, Part, TSlot } from "../parts";
import type { ModelProps, RunRef } from "../types";
import { BELT_ANG, BELT_LEN, BELT_TOP, BELT_W } from "../v1Belt";

/**
 * SCRUB V1, built from the Fusion CAD views: two wide stadium-shaped pontoons (blue, with a grey rim
 * and a shallow blue well), two black T-slot cross-beams tying them together, a perforated dark-mesh
 * basket on T-slot corner posts at the stern, and a broad green belt conveyor between the pontoons that
 * rises from the water at the bow into the basket, flanked by silver side plates and carried on two
 * black brackets. Bow is +X.
 */
const HL = 1.04; // pontoon length
const HW = 0.36; // pontoon width
const HH = 0.22; // pontoon height
const HZ = 0.6; // pontoon centre offset
const HB = -0.1; // pontoon bottom
const HT = HB + HH; // pontoon top
const WALL = 0.016;

const BEAM_X = [-0.45, -0.15];
const BEAM_Y = HT + 0.02;
const BASKET_FLOOR = HT + 0.055;
const BASKET_TOP = 0.43;
const BASKET_CX = -0.3;
const BASKET_W = 0.68;

/** Conveyor: belt surface runs from T (top, at the basket) down to the water at the bow (see v1Belt.ts). */
const T = BELT_TOP;
const ANG = BELT_ANG;
const LB = BELT_LEN;
const PLATE_Z = BELT_W / 2 + 0.015;

const PITCH = 0.012; // perforation pitch

/** Stadium (two semicircular ends), drawn along X in shape space. */
function stadium(L: number, W: number, path: THREE.Path) {
  const r = W / 2;
  const h = L / 2 - r;
  path.moveTo(-h, -r);
  path.lineTo(h, -r);
  path.absarc(h, 0, r, -Math.PI / 2, Math.PI / 2, false);
  path.lineTo(-h, r);
  path.absarc(-h, 0, r, Math.PI / 2, Math.PI * 1.5, false);
  path.closePath();
  return path;
}

function ring(L: number, W: number, inset: number, depth: number) {
  const s = stadium(L, W, new THREE.Shape()) as THREE.Shape;
  s.holes.push(stadium(L - inset * 2, W - inset * 2, new THREE.Path()));
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 48 });
  g.rotateX(-Math.PI / 2); // shape y -> -z, extrusion -> +y
  return g;
}

/** Open-top pontoon: blue outer wall, dark rim lip, pale inner liner and a lighter blue floor. */
function Tub({ z, geo }: { z: number; geo: { wall: THREE.BufferGeometry; liner: THREE.BufferGeometry; floor: THREE.BufferGeometry } }) {
  return (
    <group position={[0, 0, z]}>
      <mesh geometry={geo.wall} position={[0, HB, 0]} material={[M.tubLip, M.cadBlueDeep]} />
      <mesh geometry={geo.liner} position={[0, HT - 0.045, 0]} material={[M.tubLiner, M.tubLiner]} />
      <mesh geometry={geo.floor} position={[0, HT - 0.05, 0]} material={M.cadBlueFloor} />
    </group>
  );
}

function perfAlpha() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  g.fillStyle = "#fff";
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = "#000";
  g.beginPath();
  g.arc(32, 32, 19, 0, Math.PI * 2);
  g.fill();
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

/** Faint transverse ribs on the belt; the texture scrolls while the robot runs. */
function beltTexture() {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const g = c.getContext("2d")!;
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = "rgba(0,0,0,0.07)";
  g.fillRect(0, 0, 6, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(LB / 0.16, 1);
  t.anisotropy = 8;
  return t;
}

function Conveyor({ run }: { run: RunRef }) {
  const tex = useMemo(() => beltTexture(), []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#3c7c40", map: tex, roughness: 0.72 }), [tex]);
  useFrame((_, dt) => {
    if (run.current) tex.offset.x += dt * 0.55;
  });
  return (
    <group position={[T[0], T[1], 0]} rotation={[0, 0, -ANG]}>
      {/* belt: thin slab with the ribbed running surface on top */}
      <Bx size={[LB, 0.012, BELT_W]} pos={[LB / 2, -0.006, 0]} mat={M.beltGreen} r={0.002} />
      <mesh position={[LB / 2, 0.0012, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mat}>
        <planeGeometry args={[LB, BELT_W]} />
      </mesh>
      {/* rollers at both ends */}
      <Cyl r={0.036} h={BELT_W + 0.02} pos={[0, -0.022, 0]} rot={[Math.PI / 2, 0, 0]} mat={M.zinc} seg={36} />
      <Cyl r={0.03} h={BELT_W + 0.02} pos={[LB, -0.02, 0]} rot={[Math.PI / 2, 0, 0]} mat={M.zinc} seg={36} />
      {/* silver side plates standing above and hanging below the belt */}
      {[PLATE_Z, -PLATE_Z].map((z) => (
        <Bx key={z} size={[LB + 0.06, 0.1, 0.012]} pos={[LB / 2, 0, z]} mat={M.sheetSilver} r={0.003} />
      ))}
      {/* black rail with a row of rivets along the top of the far plate */}
      <Bx size={[LB + 0.02, 0.014, 0.034]} pos={[LB / 2, 0.056, -PLATE_Z]} mat={M.black} r={0.004} />
      {Array.from({ length: 34 }, (_, i) => (
        <mesh key={i} position={[0.03 + (i * (LB - 0.06)) / 33, 0.064, -PLATE_Z]} material={M.stainless}>
          <sphereGeometry args={[0.0042, 8, 6]} />
        </mesh>
      ))}
    </group>
  );
}

export default function V1({ ex, run }: ModelProps) {
  const geo = useMemo(
    () => ({
      wall: ring(HL, HW, WALL, HH),
      liner: ring(HL - WALL * 2, HW - WALL * 2, 0.006, 0.045),
      floor: (() => {
        const g = new THREE.ExtrudeGeometry(stadium(HL - WALL * 2, HW - WALL * 2, new THREE.Shape()) as THREE.Shape, { depth: 0.006, bevelEnabled: false, curveSegments: 48 });
        g.rotateX(-Math.PI / 2);
        return g;
      })(),
    }),
    [],
  );

  // perforated panels: round holes cut by an alpha map, repeated to the real panel size
  const panels = useMemo(() => {
    const base = perfAlpha();
    const mk = (w: number, h: number, color: string, metalness: number) => {
      const t = base.clone();
      t.repeat.set(w / PITCH, h / PITCH);
      t.needsUpdate = true;
      return new THREE.MeshStandardMaterial({ color, metalness, roughness: 0.5, alphaMap: t, alphaTest: 0.5, side: THREE.DoubleSide });
    };
    const wallH = BASKET_TOP - BASKET_FLOOR;
    return {
      wallH,
      long: mk(0.3, wallH, "#2b2e31", 0.6),
      short: mk(BASKET_W, wallH, "#2b2e31", 0.6),
      floor: mk(0.3, BASKET_W, "#c9ccce", 0.9),
    };
  }, []);

  const postZ = BASKET_W / 2 + 0.01;

  return (
    <group>
      {/* pontoons */}
      <Part ex={ex} offset={[0, -0.3, 0]}>
        <Tub z={HZ} geo={geo} />
        <Tub z={-HZ} geo={geo} />
      </Part>

      {/* T-slot cross-beams and the black brackets that carry the conveyor */}
      <Part ex={ex} offset={[0, 0.12, 0]}>
        {BEAM_X.map((x) => (
          <TSlot key={x} length={HZ * 2 + HW - 0.08} size={0.04} pos={[x, BEAM_Y, 0]} rot={[0, Math.PI / 2, 0]} mat={M.anodBlack} />
        ))}
        {[0.4, -0.4].map((z) => (
          <group key={z}>
            <Bx size={[0.014, 0.17, 0.03]} pos={[0.03, HT + 0.085, z]} mat={M.black} r={0.004} />
            <Bx size={[0.04, 0.01, 0.09]} pos={[0.03, HT + 0.17, z * 0.93]} mat={M.black} r={0.003} />
          </group>
        ))}
      </Part>

      {/* basket: T-slot posts and rails, perforated walls and floor */}
      <Part ex={ex} offset={[0, 0.55, 0]}>
        {BEAM_X.flatMap((x) =>
          [postZ, -postZ].map((z) => (
            <TSlot key={`p${x}${z}`} length={BASKET_TOP - BEAM_Y + 0.02} size={0.04} pos={[x, (BASKET_TOP + BEAM_Y) / 2, z]} rot={[0, 0, Math.PI / 2]} mat={M.anodBlack} />
          )),
        )}
        {[postZ, -postZ].map((z) => (
          <group key={`rail${z}`}>
            <TSlot length={0.3} size={0.034} pos={[BASKET_CX, BASKET_TOP, z]} mat={M.anodBlack} />
            <TSlot length={0.3} size={0.034} pos={[BASKET_CX, BASKET_FLOOR - 0.03, z]} mat={M.anodBlack} />
          </group>
        ))}
        {BEAM_X.map((x) => (
          <TSlot key={`top${x}`} length={BASKET_W + 0.1} size={0.034} pos={[x, BASKET_TOP, 0]} rot={[0, Math.PI / 2, 0]} mat={M.anodBlack} />
        ))}
        {[postZ - 0.01, -postZ + 0.01].map((z) => (
          <mesh key={`lw${z}`} position={[BASKET_CX, BASKET_FLOOR + panels.wallH / 2, z]} material={panels.long}>
            <planeGeometry args={[0.3, panels.wallH]} />
          </mesh>
        ))}
        {BEAM_X.map((x) => (
          <mesh key={`sw${x}`} position={[x, BASKET_FLOOR + panels.wallH / 2, 0]} rotation={[0, Math.PI / 2, 0]} material={panels.short}>
            <planeGeometry args={[BASKET_W, panels.wallH]} />
          </mesh>
        ))}
        <mesh position={[BASKET_CX, BASKET_FLOOR, 0]} rotation={[-Math.PI / 2, 0, 0]} material={panels.floor}>
          <planeGeometry args={[0.3, BASKET_W]} />
        </mesh>
      </Part>

      {/* conveyor */}
      <Part ex={ex} offset={[0.5, 0.35, 0]}>
        <Conveyor run={run} />
      </Part>
    </group>
  );
}
