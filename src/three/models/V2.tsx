import { useMemo } from "react";
import * as THREE from "three";
import { toCreasedNormals } from "three-stdlib";
import { M } from "../mat";
import { Bx, Part } from "../parts";
import type { ModelProps } from "../types";

/**
 * SCRUB V2, built from the Fusion CAD view: two long dark-teal box hulls with pointed, raked bows,
 * grey T-slot rails along their inner edges with a pale deck between them, an open-top grey bin with
 * panelled walls at the bow (passive intake, no conveyor), a black electronics box behind it, and a flat
 * pale roof on four black posts with black caps. Bow is +X.
 */
const HL = 1.9; // hull length
const HW = 0.36; // hull width
const HB = -0.2; // hull bottom
const HT = 0.16; // hull top
const HZ = 0.5; // hull centre offset
const PRow = 0.6; // where the pointed bow starts (x)
const RAIL_Z = HZ - HW / 2 + 0.02; // rails sit on the hulls' inner edges
const DECK_Y = HT - 0.05;

const BIN_X = 0.45;
const BIN_L = 0.56;
const BIN_W = (RAIL_Z - 0.03) * 2;
const BIN_B = HT - 0.12;
const BIN_T = HT + 0.1;

const ROOF_Y = HT + 0.44;
const POST_X = [-0.25, 0.72];
const POST_Z = RAIL_Z;

/** Box hull: square stern, pointed bow in plan, and the bow's top edge raked down towards the tip. */
function useHull() {
  return useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-HL / 2, -HW / 2);
    s.lineTo(PRow, -HW / 2);
    s.lineTo(HL / 2, 0);
    s.lineTo(PRow, HW / 2);
    s.lineTo(-HL / 2, HW / 2);
    s.closePath();
    // a small bevel all round: real moulded edges are never razor-sharp, and the rounded edge is what catches the light
    const B = 0.014;
    const g0 = new THREE.ExtrudeGeometry(s, { depth: HT - HB - 2 * B, bevelEnabled: true, bevelSize: B, bevelThickness: B, bevelSegments: 3, curveSegments: 1 });
    g0.rotateX(-Math.PI / 2);
    g0.translate(0, B, 0);
    const p = g0.attributes.position as THREE.BufferAttribute;
    const mid = (HT - HB) / 2;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      if (p.getY(i) > mid && x > PRow) p.setY(i, p.getY(i) - ((x - PRow) / (HL / 2 - PRow)) * 0.1);
    }
    return toCreasedNormals(g0, 0.6);
  }, []);
}

export default function V2({ ex }: ModelProps) {
  const hull = useHull();
  return (
    <group>
      {/* hulls */}
      <Part ex={ex} offset={[0, -0.3, 0]}>
        {[HZ, -HZ].map((z) => (
          <mesh key={z} geometry={hull} position={[0, HB, z]} material={M.hullTeal} />
        ))}
      </Part>

      {/* rails along the inner edges and the pale deck between them */}
      <Part ex={ex} offset={[0, 0.12, 0]}>
        {[RAIL_Z, -RAIL_Z].map((z) => (
          <Bx key={z} size={[1.7, 0.035, 0.045]} pos={[-0.05, HT + 0.0175, z]} mat={M.steelDark} r={0.006} />
        ))}
        {[-0.8, -0.25, 0.2].map((x) => (
          <Bx key={x} size={[0.04, 0.03, RAIL_Z * 2]} pos={[x, DECK_Y - 0.021, 0]} mat={M.steelDark} r={0.005} />
        ))}
        <Bx size={[1.5, 0.012, RAIL_Z * 2 - 0.04]} pos={[-0.1, DECK_Y, 0]} mat={M.sheetSilver} r={0.003} />
      </Part>

      {/* open-top bin at the bow: panelled walls, a seam down each face, dark interior */}
      <Part ex={ex} offset={[0.35, 0.3, 0]}>
        <Bx size={[BIN_L, 0.012, BIN_W]} pos={[BIN_X, BIN_B, 0]} mat={M.tankDark} r={0.003} />
        <Bx size={[0.012, BIN_T - BIN_B, BIN_W]} pos={[BIN_X + BIN_L / 2, (BIN_T + BIN_B) / 2, 0]} mat={M.binGrey} r={0.003} />
        <Bx size={[0.012, BIN_T - BIN_B, BIN_W]} pos={[BIN_X - BIN_L / 2, (BIN_T + BIN_B) / 2, 0]} mat={M.binGrey} r={0.003} />
        {[BIN_W / 2, -BIN_W / 2].map((z) => (
          <Bx key={z} size={[BIN_L, BIN_T - BIN_B, 0.012]} pos={[BIN_X, (BIN_T + BIN_B) / 2, z]} mat={M.binGrey} r={0.003} />
        ))}
        {/* panel seams */}
        <Bx size={[0.016, BIN_T - BIN_B - 0.02, 0.004]} pos={[BIN_X + BIN_L / 2 + 0.002, (BIN_T + BIN_B) / 2, 0]} mat={M.roofGrey} r={0.001} />
        {[BIN_W / 2 + 0.002, -BIN_W / 2 - 0.002].map((z) => (
          <Bx key={z} size={[0.004, BIN_T - BIN_B - 0.02, 0.016]} pos={[BIN_X + 0.02, (BIN_T + BIN_B) / 2, z]} mat={M.roofGrey} r={0.001} />
        ))}
        <Bx size={[BIN_L + 0.02, 0.014, 0.03]} pos={[BIN_X, BIN_T, BIN_W / 2]} mat={M.steelDark} r={0.004} />
        <Bx size={[BIN_L + 0.02, 0.014, 0.03]} pos={[BIN_X, BIN_T, -BIN_W / 2]} mat={M.steelDark} r={0.004} />
      </Part>

      {/* electronics behind the bin */}
      <Part ex={ex} offset={[-0.3, 0.45, 0]}>
        <Bx size={[0.24, 0.1, 0.16]} pos={[-0.2, DECK_Y + 0.056, -0.12]} mat={M.black} r={0.01} />
        <Bx size={[0.14, 0.07, 0.12]} pos={[-0.55, DECK_Y + 0.041, 0.1]} mat={M.tankDark} r={0.008} />
      </Part>

      {/* roof on four black posts */}
      <Part ex={ex} offset={[0, 0.8, 0]}>
        {POST_X.flatMap((x) =>
          [POST_Z, -POST_Z].map((z) => (
            <group key={`${x}${z}`}>
              <Bx size={[0.07, 0.03, 0.07]} pos={[x, HT + 0.015, z]} mat={M.black} r={0.006} />
              <Bx size={[0.04, ROOF_Y - HT - 0.03, 0.04]} pos={[x, (ROOF_Y + HT) / 2, z]} mat={M.black} r={0.006} />
              <Bx size={[0.06, 0.05, 0.06]} pos={[x, ROOF_Y - 0.025, z]} mat={M.black} r={0.008} />
            </group>
          )),
        )}
        <Bx size={[1.1, 0.012, RAIL_Z * 2 + 0.1]} pos={[0.24, ROOF_Y + 0.006, 0]} mat={M.roofGrey} r={0.003} />
      </Part>
    </group>
  );
}
