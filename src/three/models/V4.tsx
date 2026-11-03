import { useMemo } from "react";
import * as THREE from "three";
import { M } from "../mat";
import { alignY, Bx, Cable, Cyl, Motor, Part, Plate, Prop, Rod, roundedPolygon } from "../parts";
import type { ModelProps, Vec3 } from "../types";

/**
 * SCRUB V4: compact, agile, modular sensing platform. Matches the pitch-deck render:
 * two segmented grey pontoons with black bulbous end fairings, a flat beige deck with two
 * thruster cut-outs and black corner clamps, a raised rounded-triangle top plate on three
 * flat posts carrying a slim black control box, and two ribbed motors with long angled
 * shafts and fat three-blade propellers.
 */
const ZP = 0.38; // pontoon offset
const R = 0.105; // pontoon radius
const BODY = 1.2; // cylindrical pontoon body length
const FAIR = 0.25; // fairing length
const DECK_Y = 0.185;
const PLATE_Y = 0.64;
const HOLE_X = -0.42;
const HOLE_Z = 0.2;

/** Black bulbous end fairing, base at the origin, pointing +Y. */
function useFairing(blunt: boolean) {
  return useMemo(() => {
    const pts: [number, number][] = blunt
      ? [[R, 0], [R * 1.12, 0.03], [R * 1.16, 0.08], [R * 1.1, 0.15], [R * 0.9, 0.21], [R * 0.62, FAIR - 0.01], [0.0005, FAIR]]
      : [[R, 0], [R * 1.1, 0.03], [R * 1.12, 0.08], [R * 0.98, 0.15], [R * 0.72, 0.21], [R * 0.36, FAIR - 0.005], [0.0005, FAIR]];
    const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 28);
    g.computeVertexNormals();
    return g;
  }, [blunt]);
}

function Pontoon({ z }: { z: number }) {
  const bow = useFairing(false);
  const stern = useFairing(true);
  return (
    <group position={[0, 0.02, z]}>
      {/* segmented grey body */}
      <mesh rotation={[0, 0, Math.PI / 2]} material={M.pontoon}>
        <cylinderGeometry args={[R, R, BODY, 56]} />
      </mesh>
      {[-0.4, -0.13, 0.14, 0.41].map((x) => (
        <mesh key={x} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={M.steelDark}>
          <cylinderGeometry args={[R * 1.012, R * 1.012, 0.008, 56]} />
        </mesh>
      ))}
      {/* black end fairings */}
      <mesh geometry={bow} position={[BODY / 2, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={M.blackGloss} />
      <mesh geometry={stern} position={[-BODY / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={M.blackGloss} />
      <mesh position={[BODY / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={M.rubber}>
        <cylinderGeometry args={[R * 1.02, R * 1.02, 0.012, 40]} />
      </mesh>
      <mesh position={[-BODY / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={M.rubber}>
        <cylinderGeometry args={[R * 1.02, R * 1.02, 0.012, 40]} />
      </mesh>
    </group>
  );
}

function Thruster({ z, run }: { z: number; run: ModelProps["run"] }) {
  const a: Vec3 = [HOLE_X, DECK_Y - 0.02, z];
  const b: Vec3 = [HOLE_X - 0.5, -0.2, z];
  const q = useMemo(() => alignY(a, b), []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <group>
      {/* grommet ring in the deck cut-out */}
      <mesh position={[HOLE_X, DECK_Y + 0.014, z]} rotation={[-Math.PI / 2, 0, 0]} material={M.stainless}>
        <torusGeometry args={[0.087, 0.006, 14, 48]} />
      </mesh>
      {/* ribbed motor can */}
      <Motor r={0.066} h={0.15} pos={[HOLE_X, DECK_Y + 0.04, z]} mat={M.blackGloss} fins={6} />
      <Cyl r={0.05} h={0.05} pos={[HOLE_X, DECK_Y - 0.07, z]} mat={M.black} />
      {/* shaft + prop */}
      <Rod a={a} b={b} r={0.0125} mat={M.stainless} />
      <Rod a={[a[0] - 0.03, a[1] - 0.04, a[2]]} b={[b[0] + 0.05, b[1] + 0.05, b[2]]} r={0.021} mat={M.steelDark} />
      <group position={b} quaternion={q}>
        <Prop run={run} blades={3} length={0.125} chordRoot={0.075} chordTip={0.05} pitchRoot={1.0} pitchTip={0.55} thick={0.011} hubR={0.026} speed={22} mat={M.blackGloss} hubMat={M.black} />
      </group>
    </group>
  );
}

export default function V4({ ex, run }: ModelProps) {
  const deck = useMemo(() => {
    const s = roundedPolygon(
      [
        [-0.8, -0.5],
        [0.76, -0.5],
        [0.76, 0.5],
        [-0.8, 0.5],
      ],
      0.05,
    );
    for (const z of [HOLE_Z, -HOLE_Z]) {
      const h = new THREE.Path();
      h.absarc(HOLE_X, z, 0.088, 0, Math.PI * 2, true);
      s.holes.push(h);
    }
    return s;
  }, []);

  const topPlate = useMemo(
    () =>
      roundedPolygon(
        [
          [0.66, 0.02],
          [-0.52, 0.56],
          [-0.52, -0.56],
        ],
        0.15,
      ),
    [],
  );

  const posts: [number, number][] = [
    [0.42, 0],
    [-0.36, 0.4],
    [-0.36, -0.4],
  ];

  return (
    <group>
      {/* pontoons */}
      <Part ex={ex} offset={[0, -0.3, 0]}>
        <Pontoon z={ZP} />
        <Pontoon z={-ZP} />
      </Part>

      {/* deck + black clamps */}
      <Part ex={ex} offset={[0, 0.15, 0]}>
        <Plate shape={deck} thick={0.022} pos={[0, DECK_Y, 0]} mat={M.deckWhite} bevel={0.004} />
        {[ZP, -ZP].flatMap((z) =>
          [-0.7, 0.66].map((x) => <Bx key={`${x}${z}`} size={[0.13, 0.034, 0.2]} pos={[x, DECK_Y + 0.03, z]} mat={M.black} r={0.008} />),
        )}
        {[ZP, -ZP].map((z) => (
          <Bx key={`u${z}`} size={[0.16, 0.05, 0.24]} pos={[0.0, DECK_Y - 0.035, z]} mat={M.black} r={0.01} />
        ))}
        <Bx size={[0.05, 0.02, 0.8]} pos={[0.5, DECK_Y + 0.02, 0]} mat={M.black} r={0.006} />
      </Part>

      {/* top plate + flat posts */}
      <Part ex={ex} offset={[0, 0.55, 0]}>
        {posts.map(([x, z]) => (
          <Bx key={`${x}${z}`} size={[0.04, PLATE_Y - DECK_Y - 0.02, 0.06]} pos={[x, (PLATE_Y + DECK_Y) / 2, z]} mat={M.postGrey} r={0.012} />
        ))}
        <Plate shape={topPlate} thick={0.02} pos={[0, PLATE_Y, 0]} mat={M.plateWarm} bevel={0.004} />
      </Part>

      {/* control box */}
      <Part ex={ex} offset={[0, 0.95, 0]}>
        <Bx size={[0.54, 0.072, 0.33]} pos={[-0.04, PLATE_Y + 0.065, 0.01]} mat={M.black} r={0.014} />
        <Bx size={[0.4, 0.004, 0.2]} pos={[-0.04, PLATE_Y + 0.102, 0.01]} mat={M.blackGloss} r={0.002} />
        {/* front-edge ports and status displays */}
        <Bx size={[0.12, 0.014, 0.004]} pos={[-0.15, PLATE_Y + 0.062, 0.178]} mat={M.screen} r={0.002} />
        <Bx size={[0.05, 0.014, 0.004]} pos={[0.07, PLATE_Y + 0.062, 0.178]} mat={M.ledRed} r={0.002} />
        <Bx size={[0.03, 0.01, 0.004]} pos={[0.14, PLATE_Y + 0.062, 0.178]} mat={M.ledGreen} r={0.002} />
        <Cable points={[[0.2, PLATE_Y + 0.05, -0.15], [0.3, PLATE_Y + 0.03, -0.22], [0.36, PLATE_Y + 0.012, -0.26]]} r={0.005} mat={M.rubber} />
      </Part>

      {/* thrusters */}
      <Part ex={ex} offset={[-0.7, -0.1, 0]}>
        <Thruster z={HOLE_Z} run={run} />
        <Thruster z={-HOLE_Z} run={run} />
      </Part>
    </group>
  );
}
