import type { MutableRefObject } from "react";

/** 0 = assembled, 1 = fully exploded. Eased every frame by the scene. */
export type ExplodeRef = MutableRefObject<number>;
/** true while the "Run" toggle is on (propellers spin, flap/conveyor cycle). */
export type RunRef = MutableRefObject<boolean>;

export interface ModelProps {
  ex: ExplodeRef;
  run: RunRef;
}

export type Vec3 = [number, number, number];

export interface Hotspot {
  id: string;
  label: string;
  /** anchor in model space (metres-ish, water surface at y = 0) */
  pos: Vec3;
  title: string;
  text: string;
}
