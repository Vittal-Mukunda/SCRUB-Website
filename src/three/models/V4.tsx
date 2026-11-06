import { useMemo } from "react";
import * as THREE from "three";
import { M, solarTexture } from "../mat";
import { alignY, Bx, Cyl, Part, Plate, Prop, Rod, roundedPolygon } from "../parts";
import type { ModelProps, RunRef, Vec3 } from "../types";

/**
 * SCRUB V4, built from the Fusion CAD views: two blue banded pontoons (cylinder body, truncated-cone
 * ends, a wide charcoal band amidships and a thin black band near each end), a flat pale deck on top of
 * them carrying a blue equipment box at the stern, a translucent tube on two black saddles, a tilted
 * fan duct and a small pod slung under the centreline; a shield-shaped pale canopy on four flat posts
 * with a raised 4 x 2 solar panel; and two rear thrusters on long raked shafts with three-blade props.
 * Bow is +X.
 */
const ZP = 0.4; // pontoon offset
const R = 0.115; // pontoon radius
const HL = 1.55; // pontoon length, tip to tip
const CONE = 0.15; // length of each tapered end
const RE = R * 0.62; // radius of the flat end face
const HY = 0.02; // pontoon axis height
const TOP = HY + R; // top of the pontoons
const DECK = TOP + 0.008; // top face of the deck
const CANOPY_Y = 0.32;
const TH_Z = 0.225; // thruster offset

function Pontoon({ z }: { z: number }) {
  const body = HL - 2 * CONE;
  return (
    <group position={[0, HY, z]}>
      <Cyl r={R} h={body} rot={[0, 0, Math.PI / 2]} mat={M.cadBlue} seg={64} />
      {[1, -1].map((s) => (
        <mesh key={s} position={[s * (body / 2 + CONE / 2), 0, 0]} rotation={[0, 0, -s * (Math.PI / 2)]} material={M.cadBlue}>
          <cylinderGeometry args={[RE, R, CONE, 64]} />
        </mesh>
      ))}
      {/* wide charcoal band amidships, thin black bands near each end */}
      <Cyl r={R * 1.012} h={0.23} rot={[0, 0, Math.PI / 2]} mat={M.bandDark} seg={64} />
      {[-0.53, 0.53].map((x) => (
        <Cyl key={x} r={R * 1.012} h={0.06} pos={[x, 0, 0]} rot={[0, 0, Math.PI / 2]} mat={M.black} seg={64} />
      ))}
    </group>
  );
}

/** Rear thruster: motor can at the deck edge, long raked shaft, three-blade prop. */
function Thruster({ z, run }: { z: number; run: RunRef }) {
  const a: Vec3 = [-0.665, DECK + 0.025, z];
  const b: Vec3 = [-0.87, -0.12, z];
  const q = useMemo(() => alignY(b, a), []); // eslint-disable-line react-hooks/exhaustive-deps
  const d = useMemo(() => new THREE.Vector3(...b).sub(new THREE.Vector3(...a)).normalize(), []); // eslint-disable-line react-hooks/exhaustive-deps
  const can = useMemo<Vec3[]>(
    () => [
      [a[0] - d.x * 0.03, a[1] - d.y * 0.03, a[2]],
      [a[0] + d.x * 0.1, a[1] + d.y * 0.1, a[2]],
    ],
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );
  return (
    <group>
      {/* clamp bracket on the rear deck edge */}
      <Bx size={[0.11, 0.012, 0.09]} pos={[-0.665, DECK + 0.006, z]} mat={M.cadBlue} r={0.004} />
      <Rod a={can[0]} b={can[1]} r={0.03} mat={M.blackGloss} />
      <Rod a={a} b={b} r={0.0125} mat={M.stainless} />
      <group position={b} quaternion={q}>
        <Prop run={run} blades={3} length={0.1} chordRoot={0.062} chordTip={0.04} pitchRoot={1.0} pitchTip={0.55} thick={0.01} hubR={0.024} speed={22} mat={M.blackGloss} hubMat={M.black} />
      </group>
    </group>
  );
}

/** Raised, chamfered frame with the 4 x 2 black solar panel set into it. */
function SolarPanel({ x }: { x: number }) {
  const tex = useMemo(() => solarTexture(), []);
  const glass = useMemo(
    () => new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.1, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.04 }),
    [tex],
  );
  const base = CANOPY_Y + 0.014;
  return (
    <group position={[x, 0, 0]}>
      <group position={[0, base + 0.011, 0]} scale={[0.31, 1, 0.21]}>
        <mesh rotation={[0, Math.PI / 4, 0]} material={M.plateWarm}>
          <cylinderGeometry args={[Math.SQRT2, Math.SQRT2 * 1.17, 0.022, 4, 1]} />
        </mesh>
      </group>
      <mesh position={[0, base + 0.0235, 0]} rotation={[-Math.PI / 2, 0, 0]} material={glass}>
        <planeGeometry args={[0.58, 0.37]} />
      </mesh>
    </group>
  );
}

export default function V4({ ex, run }: ModelProps) {
  const deck = useMemo(
    () =>
      roundedPolygon(
        [
          [-0.7, -0.43],
          [0.34, -0.43],
          [0.34, 0.43],
          [-0.7, 0.43],
        ],
        0.05,
      ),
    [],
  );

  // shield-shaped canopy: square rear edge, flared sides, pointed bow overhanging the pontoons
  const canopy = useMemo(
    () =>
      roundedPolygon(
        [
          [-0.14, 0.3],
          [0.3, 0.5],
          [0.62, 0.3],
          [0.87, 0.0],
          [0.62, -0.3],
          [0.3, -0.5],
          [-0.14, -0.3],
        ],
        0.12,
      ),
    [],
  );

  const rearPosts: [number, number][] = [
    [-0.13, 0.28],
    [-0.13, -0.28],
  ];
  const frontPosts: [number, number][] = [
    [0.56, 0.31],
    [0.56, -0.31],
  ];

  return (
    <group>
      {/* pontoons */}
      <Part ex={ex} offset={[0, -0.3, 0]}>
        <Pontoon z={ZP} />
        <Pontoon z={-ZP} />
      </Part>

      {/* deck, blue equipment box at the stern */}
      <Part ex={ex} offset={[0, 0.15, 0]}>
        <Plate shape={deck} thick={0.01} pos={[0, TOP - 0.004, 0]} mat={M.deckWhite} bevel={0.0025} />
        <Bx size={[0.22, 0.14, 0.66]} pos={[-0.47, DECK + 0.07, 0]} mat={M.cadBlue} r={0.035} />
      </Part>

      {/* translucent tube on two black saddles, tilted fan duct, a tilted black box beside it */}
      <Part ex={ex} offset={[0, 0.4, 0]}>
        {[-0.11, 0.12].map((x) => (
          <Bx key={x} size={[0.045, 0.11, 0.16]} pos={[x, DECK + 0.055, 0]} mat={M.black} r={0.01} />
        ))}
        <Cyl r={0.062} h={0.36} pos={[0.01, DECK + 0.1, 0]} rot={[0, 0, Math.PI / 2]} mat={M.binPlastic} seg={40} />
        <Cyl r={0.048} h={0.32} pos={[0.01, DECK + 0.1, 0]} rot={[0, 0, Math.PI / 2]} mat={M.blackGloss} seg={32} />
        {[-0.17, 0.19].map((x) => (
          <Cyl key={x} r={0.065} h={0.02} pos={[x, DECK + 0.1, 0]} rot={[0, 0, Math.PI / 2]} mat={M.pvcWhite} seg={36} />
        ))}
        <group position={[-0.25, DECK + 0.045, 0]} rotation={[0, 0, 0.45]}>
          <Cyl r={0.078} h={0.05} mat={M.black} />
          <mesh position={[0, 0.026, 0]} rotation={[Math.PI / 2, 0, 0]} material={M.steelDark}>
            <torusGeometry args={[0.07, 0.006, 10, 40]} />
          </mesh>
          {Array.from({ length: 8 }, (_, i) => (
            <group key={i} position={[0, 0.027, 0]} rotation={[0, (i / 8) * Math.PI * 2, 0]}>
              <Bx size={[0.056, 0.004, 0.015]} pos={[0.037, 0, 0]} rot={[0.35, 0, 0]} mat={M.steelDark} r={0.001} />
            </group>
          ))}
          <Cyl r={0.018} h={0.056} mat={M.blackGloss} />
        </group>
      </Part>

      {/* canopy, flat posts and solar panel */}
      <Part ex={ex} offset={[0, 0.7, 0]}>
        {rearPosts.map(([x, z]) => (
          <Bx key={`r${z}`} size={[0.03, CANOPY_Y - DECK, 0.012]} pos={[x, (CANOPY_Y + DECK) / 2, z]} mat={M.postGrey} r={0.004} />
        ))}
        {frontPosts.map(([x, z]) => (
          <Bx key={`f${z}`} size={[0.03, CANOPY_Y - (TOP - 0.02), 0.012]} pos={[x, (CANOPY_Y + TOP - 0.02) / 2, z]} mat={M.postGrey} r={0.004} />
        ))}
        <Plate shape={canopy} thick={0.01} pos={[0, CANOPY_Y, 0]} mat={M.plateWarm} bevel={0.002} />
      </Part>
      <Part ex={ex} offset={[0, 1.0, 0]}>
        <SolarPanel x={0.26} />
      </Part>

      {/* pod slung under the centreline */}
      <Part ex={ex} offset={[0, -0.45, 0]}>
        <Rod a={[0, TOP - 0.02, 0]} b={[0, -0.12, 0]} r={0.011} mat={M.steelDark} />
        <mesh position={[0, -0.13, 0]} material={M.pvcGrey}>
          <sphereGeometry args={[0.033, 32, 20]} />
        </mesh>
      </Part>

      {/* rear thrusters */}
      <Part ex={ex} offset={[-0.5, -0.1, 0]}>
        <Thruster z={TH_Z} run={run} />
        <Thruster z={-TH_Z} run={run} />
      </Part>
    </group>
  );
}
