import { useEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import { hotspots } from "../three/hotspots";
import type { ProjectedPoint } from "../three/Showcase";

interface Layout {
  botId: string;
  left: number[];
  right: number[];
}

/**
 * Feature call-outs for the centred robot: a dot on each part, a line to a label, and a
 * sentence on what the part does. Dots and lines follow the robot every frame (it keeps
 * swaying), written straight to the DOM so React never re-renders.
 */
export default function Callouts({ botId, projRef, ready, active = true }: { botId: string; projRef: MutableRefObject<ProjectedPoint[]>; ready: boolean; active?: boolean }) {
  const spots = useMemo(() => hotspots[botId] ?? [], [botId]);
  const root = useRef<HTMLDivElement>(null);
  const dots = useRef<(HTMLSpanElement | null)[]>([]);
  const labels = useRef<(HTMLLIElement | null)[]>([]);
  const lines = useRef<(SVGPathElement | null)[]>([]);
  const [measured, setLayout] = useState<Layout | null>(null);
  // a layout only applies to the robot it was measured for, once it has landed; until then the labels sit in a plain list
  const layout = ready && measured?.botId === botId ? measured : null;
  const [narrow, setNarrow] = useState(() => window.innerWidth < 900);

  useEffect(() => {
    const on = () => setNarrow(window.innerWidth < 900);
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);

  // once the robot has landed, split the labels between the two sides by where their dots are
  useEffect(() => {
    if (!ready) return;
    const pts = projRef.current;
    const idx = spots.map((_, i) => i).sort((a, b) => (pts[a]?.x ?? 0) - (pts[b]?.x ?? 0));
    const half = Math.ceil(idx.length / 2);
    const byY = (arr: number[]) => arr.sort((a, b) => (pts[a]?.y ?? 0) - (pts[b]?.y ?? 0));
    setLayout({ botId, left: byY(idx.slice(0, half)), right: byY(idx.slice(half)) });
  }, [ready, spots, projRef, botId]);

  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const tick = () => {
      const r = root.current?.getBoundingClientRect();
      const pts = projRef.current;
      if (r) {
        spots.forEach((_, i) => {
          const p = pts[i];
          const dot = dots.current[i];
          if (!p || !dot) return;
          dot.style.transform = `translate(${p.x}px, ${p.y}px)`;
          const lab = labels.current[i];
          const ln = lines.current[i];
          if (!lab || !ln || narrow || !layout) return;
          const lr = lab.getBoundingClientRect();
          const isLeft = layout.left.includes(i);
          const x0 = (isLeft ? lr.right : lr.left) - r.left;
          const y0 = (lr.top + lr.bottom) / 2 - r.top;
          const lead = isLeft ? 22 : -22;
          ln.setAttribute("d", `M${x0},${y0} L${x0 + lead},${y0} L${p.x},${p.y}`);
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [spots, projRef, layout, narrow, active]);

  const label = (i: number) => (
    <li
      key={spots[i].id}
      ref={(el) => void (labels.current[i] = el)}
      className="callout"
      style={{ transitionDelay: `${i * 90}ms` }}
    >
      <span className="callout__n">{i + 1}</span>
      <div>
        <strong>{spots[i].title}</strong>
        <p>{spots[i].text}</p>
      </div>
    </li>
  );

  return (
    <div ref={root} className={`callouts ${ready && layout ? "is-ready" : ""} ${narrow ? "is-narrow" : ""}`}>
      <svg className="callouts__lines" aria-hidden="true">
        {spots.map((h, i) => (
          <path key={h.id} ref={(el) => void (lines.current[i] = el)} />
        ))}
      </svg>
      {spots.map((h, i) => (
        <span key={h.id} ref={(el) => void (dots.current[i] = el)} className="callouts__dot" aria-hidden="true">
          {narrow && <em>{i + 1}</em>}
        </span>
      ))}
      {layout && !narrow ? (
        <>
          <ul className="callouts__col callouts__col--l">{layout.left.map(label)}</ul>
          <ul className="callouts__col callouts__col--r">{layout.right.map(label)}</ul>
        </>
      ) : (
        <ul className="callouts__list">{spots.map((_, i) => label(i))}</ul>
      )}
    </div>
  );
}
