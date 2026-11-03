import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { M, labelTexture } from "../mat";
import { Bolt, Bx, Cable, Cyl, Part, Pipe, Rod } from "../parts";
import type { ModelProps, RunRef, Vec3 } from "../types";

/**
 * SCRUB V1, modelled from the Madiwala Lake photographs:
 *  - two grey PVC pipe hulls with flared end caps and stainless clamp straps
 *  - stainless square-tube frame, posts with black caps, L-brackets
 *  - white deck sheet; electronics under a clear polythene cover with a black-framed
 *    "S.C.R.U.B." plaque; blue and red wiring
 *  - two six-blade side paddle wheels hanging outboard of the hulls, diagonally opposite
 */
const L = 2.3; // hull length
const R = 0.14; // hull radius
const Z = 0.56; // hull offset from centreline
const RAIL_Y = 0.285;
const DECK_Y = 0.3;
const POST_TOP = 0.78;

/** Blue wiring that runs from the electronics down along the near hull (as in the photos). */
const BLUE_WIRE: Vec3[] = [
  [0.1, 0.34, 0.2],
  [0.35, 0.3, 0.42],
  [0.62, 0.2, 0.5],
  [0.85, 0.12, 0.6],
  [1.05, 0.05, 0.63],
];
const RED_WIRE: Vec3[] = [
  [0.2, 0.34, -0.12],
  [0.45, 0.32, -0.3],
  [0.7, 0.3, -0.42],
];

function PaddleWheel({ x, z, run, speed }: { x: number; z: number; run: RunRef; speed: number }) {
  const spin = useRef<THREE.Group>(null);
  const out = z > 0 ? 1 : -1;
  useFrame((_, dt) => {
    if (spin.current && run.current) spin.current.rotation.z += speed * dt;
  });
  return (
    <group position={[x, 0.36, z]}>
      {/* axle back to the frame */}
      <Rod a={[0, 0, -out * 0.34]} b={[0, 0, out * 0.12]} r={0.016} mat={M.stainless} />
      <group ref={spin}>
        <Cyl r={0.058} h={0.2} rot={[Math.PI / 2, 0, 0]} mat={M.blackGloss} />
        {Array.from({ length: 6 }, (_, i) => (
          <group key={i} rotation={[0, 0, (i / 6) * Math.PI * 2 + 0.26]}>
            <Bx size={[0.37, 0.013, 0.17]} pos={[0.235, 0, 0]} mat={M.black} r={0.004} />
            <Bx size={[0.12, 0.034, 0.21]} pos={[0.1, 0, 0]} mat={M.blackGloss} r={0.008} />
            <Bolt pos={[0.1, 0.017, 0.07]} r={0.006} mat={M.stainless} />
            <Bolt pos={[0.1, 0.017, -0.07]} r={0.006} mat={M.stainless} />
          </group>
        ))}
      </group>
      {/* gear motor beside the hub */}
      <Bx size={[0.11, 0.11, 0.14]} pos={[0, 0, out * 0.17]} mat={M.blackGloss} r={0.014} />
      <Cyl r={0.03} h={0.05} pos={[0, 0, out * 0.26]} rot={[Math.PI / 2, 0, 0]} mat={M.black} />
    </group>
  );
}

export default function V1({ ex, run }: ModelProps) {
  const plaque = useMemo(() => new THREE.MeshStandardMaterial({ map: labelTexture("S.C.R.U.B."), roughness: 0.55 }), []);
  const postsAt: [number, number][] = [
    [-0.85, 0.5],
    [-0.85, -0.5],
    [0.0, 0.5],
    [0.0, -0.5],
    [0.85, 0.5],
    [0.85, -0.5],
  ];

  return (
    <group>
      {/* hulls + stainless clamp straps */}
      <Part ex={ex} offset={[0, -0.3, 0]}>
        {[Z, -Z].map((z) => (
          <group key={z}>
            <Pipe length={L} r={R} pos={[0, 0.02, z]} mat={M.pvcPipeGrey} capMat={M.pvcCap} couplers={[-0.31, 0.31]} />
            {[-0.85, 0, 0.85].map((x) => (
              <group key={x}>
                <mesh position={[x, 0.02, z]} rotation={[0, Math.PI / 2, 0]} material={M.stainless}>
                  <torusGeometry args={[R * 1.035, 0.008, 12, 72]} />
                </mesh>
                <Bx size={[0.034, 0.1, 0.012]} pos={[x, 0.17, z - Math.sign(z) * 0.07]} mat={M.stainless} r={0.003} />
                <Bolt pos={[x, 0.225, z - Math.sign(z) * 0.07]} rot={[Math.PI / 2, 0, 0]} r={0.006} mat={M.stainless} />
              </group>
            ))}
          </group>
        ))}
      </Part>

      {/* stainless square-tube frame */}
      <Part ex={ex} offset={[0, 0.35, 0]}>
        {[0.5, -0.5].map((z) => (
          <Bx key={`r${z}`} size={[2.0, 0.03, 0.03]} pos={[0, RAIL_Y, z]} mat={M.stainless} r={0.004} />
        ))}
        {[-0.85, 0, 0.85].map((x) => (
          <Bx key={`c${x}`} size={[0.03, 0.03, 1.06]} pos={[x, RAIL_Y, 0]} mat={M.stainless} r={0.004} />
        ))}
        {postsAt.map(([x, z]) => (
          <group key={`${x}${z}`}>
            <Bx size={[0.028, POST_TOP - RAIL_Y, 0.028]} pos={[x, (POST_TOP + RAIL_Y) / 2, z]} mat={M.stainless} r={0.004} />
            <Bx size={[0.034, 0.02, 0.034]} pos={[x, POST_TOP + 0.01, z]} mat={M.black} r={0.006} />
          </group>
        ))}
        {/* mid-height side rails */}
        {[0.5, -0.5].map((z) => (
          <Bx key={`m${z}`} size={[1.7, 0.024, 0.024]} pos={[0, 0.5, z]} mat={M.stainless} r={0.004} />
        ))}
        {[-0.85, 0.85].map((x) => (
          <Bx key={`e${x}`} size={[0.024, 0.024, 1.0]} pos={[x, 0.5, 0]} mat={M.stainless} r={0.004} />
        ))}
        {/* outrigger arms carrying the paddle wheels */}
        <Bx size={[0.03, 0.03, 0.5]} pos={[-0.55, RAIL_Y + 0.02, 0.72]} mat={M.stainless} r={0.004} />
        <Bx size={[0.03, 0.03, 0.5]} pos={[0.6, RAIL_Y + 0.02, -0.72]} mat={M.stainless} r={0.004} />
      </Part>

      {/* deck sheet, electronics and wiring */}
      <Part ex={ex} offset={[0, 0.7, 0]}>
        <Bx size={[1.6, 0.012, 0.95]} pos={[0, DECK_Y, 0]} mat={M.boardWhite} r={0.004} />
        <Bx size={[0.2, 0.012, 0.14]} pos={[-0.12, DECK_Y + 0.012, 0.0]} mat={M.pcbBlue} r={0.003} />
        <Bx size={[0.1, 0.045, 0.08]} pos={[0.12, DECK_Y + 0.03, 0.05]} mat={M.black} r={0.006} />
        <Bx size={[0.07, 0.03, 0.05]} pos={[0.0, DECK_Y + 0.022, -0.08]} mat={M.pvcWhite} r={0.005} />
        <Bx size={[0.14, 0.008, 0.024]} pos={[0.16, DECK_Y + 0.016, 0.2]} mat={M.cableRed} r={0.003} />
        <Cable points={BLUE_WIRE} r={0.006} mat={M.cableBlue} />
        <Cable points={RED_WIRE} r={0.005} mat={M.cableRed} />
      </Part>

      {/* clear polythene cover with the framed plaque */}
      <Part ex={ex} offset={[0, 1.15, 0]}>
        <Bx size={[0.54, 0.34, 0.36]} pos={[0, DECK_Y + 0.18, 0]} mat={M.polythene} r={0.03} />
        <Bx size={[0.4, 0.23, 0.014]} pos={[0, DECK_Y + 0.2, 0.188]} mat={M.black} r={0.006} />
        <mesh position={[0, DECK_Y + 0.2, 0.196]} material={plaque}>
          <planeGeometry args={[0.38, 0.21]} />
        </mesh>
        <Bx size={[0.4, 0.23, 0.014]} pos={[0, DECK_Y + 0.2, -0.188]} mat={M.black} r={0.006} />
        <mesh position={[0, DECK_Y + 0.2, -0.196]} rotation={[0, Math.PI, 0]} material={plaque}>
          <planeGeometry args={[0.38, 0.21]} />
        </mesh>
      </Part>

      {/* paddle wheels, diagonally opposite and outboard of the hulls */}
      <Part ex={ex} offset={[0, 0, 0.8]}>
        <PaddleWheel x={-0.55} z={0.98} run={run} speed={2.4} />
      </Part>
      <Part ex={ex} offset={[0, 0, -0.8]}>
        <PaddleWheel x={0.6} z={-0.98} run={run} speed={2.4} />
      </Part>
    </group>
  );
}
