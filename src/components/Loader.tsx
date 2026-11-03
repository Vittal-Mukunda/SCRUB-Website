import { useState } from "react";
import Logo from "./Logo";

interface LoaderProps {
  label?: string;
  /** false starts the fade-out */
  visible?: boolean;
  className?: string;
}

const PERIOD = 6; // seconds for one crossing
const BOAT_W = 0.22; // boat width as a fraction of the scene
const SWEEP_AT = 0.4; // fraction of the cycle at which debris vanishes (see @keyframes sweep)

/** Floating waste the robot clears: x as a fraction of the scene width, y as a percent from the top. */
const DEBRIS = [
  { x: 0.2, y: 58, kind: "dot" },
  { x: 0.33, y: 64, kind: "bottle" },
  { x: 0.46, y: 56, kind: "dot" },
  { x: 0.6, y: 63, kind: "leaf" },
  { x: 0.73, y: 57, kind: "bottle" },
  { x: 0.87, y: 62, kind: "dot" },
] as const;

const WAVE = "M0 6 " + Array.from({ length: 36 }, (_, i) => (i === 0 ? "q 10 -6 20 0" : "t 20 0")).join(" ");

/**
 * Branded loading screen: a SCRUB robot cruises across a lake, spinning its rotors and
 * clearing floating waste, under the logo. Every animation here is a transform or opacity
 * change on its own layer, so it keeps running smoothly while the page is busy loading.
 */
export default function Loader({ label = "Launching the SCRUB fleet", visible = true, className = "" }: LoaderProps) {
  // once faded out, leave the page so its endless animations stop costing frames
  const [gone, setGone] = useState(false);
  if (gone && !visible) return null;
  return (
    <div
      className={`loader ${visible ? "" : "is-done"} ${className}`}
      role="status"
      aria-live="polite"
      aria-hidden={!visible}
      onTransitionEnd={(e) => {
        if (!visible && e.target === e.currentTarget && (e.propertyName === "visibility" || e.propertyName === "opacity")) setGone(true);
      }}
    >
      <div className="loader__inner">
        <Logo variant="full" className="loader__logo" />

        <div className="loader__scene" aria-hidden="true">
          {[
            { top: 62, cls: "b", op: 0.3 },
            { top: 72, cls: "a", op: 0.55 },
            { top: 82, cls: "c", op: 0.2 },
          ].map((w) => (
            <svg key={w.cls} className={`loader__wave loader__wave--${w.cls}`} style={{ top: `${w.top}%`, opacity: w.op }} viewBox="0 0 720 12" preserveAspectRatio="none">
              <path d={WAVE} />
            </svg>
          ))}

          {DEBRIS.map((d) => {
            const tHit = (d.x / (1 + BOAT_W)) * PERIOD;
            return (
              <span
                key={d.x}
                className={`loader__debris loader__debris--${d.kind}`}
                style={{ left: `${d.x * 100}%`, top: `${d.y}%`, animationDelay: `${(tHit - SWEEP_AT * PERIOD).toFixed(2)}s` }}
              />
            );
          })}

          <div className="loader__boat" style={{ width: `${BOAT_W * 100}%` }}>
            <div className="loader__bob">
              <svg viewBox="-40 40 80 50" className="loader__hull">
                <rect x="-34" y="66" width="68" height="9" rx="4.5" className="b-hull" />
                <rect x="-34" y="76" width="68" height="9" rx="4.5" className="b-hull b-hull--2" />
                <rect x="-26" y="60" width="52" height="6" rx="2" className="b-deck" />
                <rect x="-9" y="47" width="18" height="13" rx="2.5" className="b-box" />
                <rect x="-5" y="51" width="10" height="3" rx="1" className="b-label" />
              </svg>
              <i className="loader__led" />
              {["l", "r"].map((side) => (
                <svg key={side} viewBox="-10 -10 20 20" className={`loader__rotor loader__rotor--${side}`}>
                  <rect x="-1.2" y="-9" width="2.4" height="18" rx="1" />
                  <rect x="-9" y="-1.2" width="18" height="2.4" rx="1" />
                </svg>
              ))}
            </div>
          </div>
        </div>

        <p className="loader__label">{label}<span className="loader__dots" aria-hidden="true"><i>.</i><i>.</i><i>.</i></span></p>
      </div>
    </div>
  );
}
