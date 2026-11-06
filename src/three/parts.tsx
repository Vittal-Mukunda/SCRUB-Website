import { useMemo, useRef } from "react";
import type { ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { toCreasedNormals } from "three-stdlib";
import type { ExplodeRef, RunRef, Vec3 } from "./types";

/* ---------- shared rounded-box geometry ---------- */

const roundedBoxes = new Map<string, THREE.BufferGeometry>();

/**
 * The same geometry drei's <RoundedBox> builds (an extruded rounded rectangle with creased normals),
 * made once per size and shared. Building it per box cost the most time when the robots load, and the
 * 360° viewer rebuilt every one again.
 */
function roundedBox(w: number, h: number, d: number, radius: number, smoothness: number) {
  const key = `${w}|${h}|${d}|${radius}|${smoothness}`;
  let g = roundedBoxes.get(key);
  if (!g) {
    const eps = 0.00001;
    const r = radius - eps;
    const shape = new THREE.Shape();
    shape.absarc(eps, eps, eps, -Math.PI / 2, -Math.PI, true);
    shape.absarc(eps, h - r * 2, eps, Math.PI, Math.PI / 2, true);
    shape.absarc(w - r * 2, h - r * 2, eps, Math.PI / 2, 0, true);
    shape.absarc(w - r * 2, eps, eps, 0, -Math.PI / 2, true);
    const extruded = new THREE.ExtrudeGeometry(shape, {
      depth: d - radius * 2,
      bevelEnabled: true,
      bevelSegments: 8,
      steps: 1,
      bevelSize: radius - eps,
      bevelThickness: radius,
      curveSegments: smoothness,
    });
    extruded.center();
    g = toCreasedNormals(extruded, 0.4);
    roundedBoxes.set(key, g);
  }
  return g;
}

/* ---------- explode wrapper ---------- */

interface PartProps {
  ex: ExplodeRef;
  /** where this part travels (model space) when fully exploded */
  offset?: Vec3;
  position?: Vec3;
  children: ReactNode;
}

/** Group that slides along `offset` as the explode amount rises. */
export function Part({ ex, offset = [0, 0, 0], position = [0, 0, 0], children }: PartProps) {
  const g = useRef<THREE.Group>(null);
  useFrame(() => {
    const k = ex.current;
    g.current?.position.set(position[0] + offset[0] * k, position[1] + offset[1] * k, position[2] + offset[2] * k);
  });
  return <group ref={g} position={position}>{children}</group>;
}

/* ---------- primitives ---------- */

interface Common {
  pos?: Vec3;
  rot?: Vec3;
  mat: THREE.Material;
}

/** Box with softened edges (real parts are never razor-sharp). */
export function Bx({ size, pos = [0, 0, 0], rot = [0, 0, 0], mat, r }: Common & { size: Vec3; r?: number }) {
  const minDim = Math.min(...size);
  const radius = Math.min(r ?? Math.max(0.0025, minDim * 0.12), minDim * 0.45);
  return <mesh geometry={roundedBox(size[0], size[1], size[2], radius, 3)} position={pos} rotation={rot} material={mat} />;
}

export function Cyl({ r, h, pos = [0, 0, 0], rot = [0, 0, 0], mat, seg = 32 }: Common & { r: number; h: number; seg?: number }) {
  return (
    <mesh position={pos} rotation={rot} material={mat}>
      <cylinderGeometry args={[r, r, h, seg]} />
    </mesh>
  );
}

/** Thin tube joining two points. */
export function Rod({ a, b, r = 0.015, mat }: { a: Vec3; b: Vec3; r?: number; mat: THREE.Material }) {
  const { mid, len, q } = useMemo(() => {
    const va = new THREE.Vector3(...a);
    const vb = new THREE.Vector3(...b);
    const dir = vb.clone().sub(va);
    return {
      mid: va.clone().add(vb).multiplyScalar(0.5).toArray() as Vec3,
      len: dir.length(),
      q: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()),
    };
  }, [a, b]);
  return (
    <mesh position={mid} quaternion={q} material={mat}>
      <cylinderGeometry args={[r, r, len, 20]} />
    </mesh>
  );
}

/** Cable run through the given points. */
export function Cable({ points, r = 0.006, mat }: { points: Vec3[]; r?: number; mat: THREE.Material }) {
  const geo = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, "catmullrom", 0.4), 48, r, 10, false), [points, r]);
  return <mesh geometry={geo} material={mat} />;
}

/** Aluminium T-slot extrusion along X. */
function slotProfile(size: number) {
  const h = size / 2;
  const sw = size * 0.17;
  const sd = size * 0.24;
  const s = new THREE.Shape();
  const pts: [number, number][] = [
    [-h, -h], [-sw, -h], [-sw, -h + sd], [sw, -h + sd], [sw, -h],
    [h, -h], [h, -sw], [h - sd, -sw], [h - sd, sw], [h, sw],
    [h, h], [sw, h], [sw, h - sd], [-sw, h - sd], [-sw, h],
    [-h, h], [-h, sw], [-h + sd, sw], [-h + sd, -sw], [-h, -sw],
  ];
  s.moveTo(...pts[0]);
  for (let i = 1; i < pts.length; i++) s.lineTo(...pts[i]);
  s.closePath();
  const hole = new THREE.Path();
  hole.absarc(0, 0, size * 0.11, 0, Math.PI * 2, true);
  s.holes.push(hole);
  return s;
}

export function TSlot({ length, size = 0.04, pos = [0, 0, 0], rot = [0, 0, 0], mat }: Common & { length: number; size?: number }) {
  const geo = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(slotProfile(size), { depth: length, bevelEnabled: false, curveSegments: 12 });
    g.translate(0, 0, -length / 2);
    g.rotateY(Math.PI / 2); // extrusion axis Z -> X
    return g;
  }, [length, size]);
  return <mesh geometry={geo} position={pos} rotation={rot} material={mat} />;
}

/* ---------- propellers ---------- */

interface BladeSpec {
  length: number;
  chordRoot: number;
  chordTip: number;
  pitchRoot: number;
  pitchTip: number;
  thick: number;
}

/** Lofted, twisted, tapered airfoil blade. Span along +X, chord along Z, thickness along Y. */
function bladeGeometry({ length, chordRoot, chordTip, pitchRoot, pitchTip, thick }: BladeSpec) {
  const NS = 16;
  const NC = 14;
  const sect: [number, number][] = [];
  const half = (x: number) => thick * 0.5 * Math.sin(Math.PI * Math.pow(Math.min(1, Math.max(0, x)), 0.75)) + 0.0004;
  for (let i = 0; i <= NC; i++) sect.push([i / NC, half(i / NC)]);
  for (let i = NC - 1; i >= 1; i--) sect.push([i / NC, -half(i / NC)]);
  const M = sect.length;
  const pos: number[] = [];
  for (let s = 0; s <= NS; s++) {
    const u = s / NS;
    const chord = chordRoot + (chordTip - chordRoot) * u * (1 - 0.15 * Math.sin(u * Math.PI));
    const pitch = pitchRoot + (pitchTip - pitchRoot) * u;
    const taper = u > 0.94 ? Math.sqrt(Math.max(0, 1 - (u - 0.94) / 0.06)) * 0.6 + 0.4 : 1;
    for (const [x, y] of sect) {
      const cx = (x - 0.3) * chord * taper;
      const cy = y * taper;
      pos.push(u * length, cx * Math.sin(pitch) + cy * Math.cos(pitch), cx * Math.cos(pitch) - cy * Math.sin(pitch));
    }
  }
  const idx: number[] = [];
  for (let s = 0; s < NS; s++) {
    for (let m = 0; m < M; m++) {
      const a = s * M + m;
      const b = s * M + ((m + 1) % M);
      const c = (s + 1) * M + m;
      const d = (s + 1) * M + ((m + 1) % M);
      idx.push(a, b, c, b, d, c);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

interface PropProps {
  run: RunRef;
  blades?: number;
  length?: number;
  chordRoot?: number;
  chordTip?: number;
  pitchRoot?: number;
  pitchTip?: number;
  thick?: number;
  hubR?: number;
  speed?: number;
  mat: THREE.Material;
  hubMat: THREE.Material;
}

/** Marine propeller (spins about local Y while running). */
export function Prop({ run, blades = 3, length = 0.12, chordRoot = 0.05, chordTip = 0.03, pitchRoot = 1.0, pitchTip = 0.55, thick = 0.009, hubR = 0.024, speed = 24, mat, hubMat }: PropProps) {
  const g = useRef<THREE.Group>(null);
  const geo = useMemo(() => bladeGeometry({ length, chordRoot, chordTip, pitchRoot, pitchTip, thick }), [length, chordRoot, chordTip, pitchRoot, pitchTip, thick]);
  useFrame((_, dt) => {
    if (g.current && run.current) g.current.rotation.y += speed * dt;
  });
  return (
    <group ref={g}>
      <mesh material={hubMat}>
        <cylinderGeometry args={[hubR, hubR * 1.1, hubR * 2.6, 28]} />
      </mesh>
      <mesh position={[0, -hubR * 2.1, 0]} rotation={[Math.PI, 0, 0]} material={hubMat}>
        <coneGeometry args={[hubR * 0.95, hubR * 1.6, 28]} />
      </mesh>
      {Array.from({ length: blades }, (_, i) => (
        <group key={i} rotation={[0, (i / blades) * Math.PI * 2, 0]}>
          <mesh geometry={geo} position={[hubR * 0.85, 0, 0]} material={mat} />
        </group>
      ))}
    </group>
  );
}

/* ---------- shapes ---------- */

/** Polygon outline with rounded corners (corner radius ~ fraction `k` of each edge). */
export function roundedPolygon(points: [number, number][], k = 0.2) {
  const s = new THREE.Shape();
  const n = points.length;
  points.forEach((p, i) => {
    const prev = points[(i + n - 1) % n];
    const next = points[(i + 1) % n];
    const a: [number, number] = [p[0] + (prev[0] - p[0]) * k, p[1] + (prev[1] - p[1]) * k];
    const b: [number, number] = [p[0] + (next[0] - p[0]) * k, p[1] + (next[1] - p[1]) * k];
    if (i === 0) s.moveTo(a[0], a[1]);
    else s.lineTo(a[0], a[1]);
    s.quadraticCurveTo(p[0], p[1], b[0], b[1]);
  });
  s.closePath();
  return s;
}

/** Flat plate (extruded shape lying in the XZ plane, thickness along Y) with a soft bevel. */
export function Plate({ shape, thick, pos = [0, 0, 0], mat, bevel = 0.004 }: { shape: THREE.Shape; thick: number; pos?: Vec3; mat: THREE.Material; bevel?: number }) {
  const geo = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 28 });
    g.rotateX(-Math.PI / 2); // shape y -> -z, extrusion z -> +y
    return g;
  }, [shape, thick, bevel]);
  return <mesh position={pos} geometry={geo} material={mat} />;
}

/** Quaternion rotating +Y onto the direction a -> b. */
export function alignY(a: Vec3, b: Vec3) {
  const d = new THREE.Vector3(...b).sub(new THREE.Vector3(...a)).normalize();
  return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
}
