import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "./Icons";
import ViewerBoundary from "./ViewerBoundary";
import WaterBackdrop from "./WaterBackdrop";
import { useInView } from "./useInView";
import { bots } from "../data/content";
import { photo } from "../data/photo";
import { webglAvailable } from "../three/webgl";
import { smooth } from "../three/timeline";
import type { LeafSources } from "../three/timeline";
import { prefetch } from "../routes";
import { useJourneyGate } from "./useJourneyGate";

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const RoadmapScene = lazy(() => import("../three/Roadmap"));

/** Photos that swim past instead of the 3D robots, for devices without a usable GPU. */
function PhotoLayer({ active }: { active: number }) {
  return (
    <div className="roadmap__photos">
      {bots.map((b, i) => (
        <img
          key={b.id}
          {...photo(b.cover, "(max-width: 900px) 90vw, 50vw")}
          alt=""
          decoding="async"
          loading="lazy"
          className={i === active ? "is-on" : i < active ? "is-past" : "is-next"}
          style={{ objectPosition: b.focus }}
        />
      ))}
    </div>
  );
}

/** Raster scale for finding the ink: half resolution is plenty for placing leaves. */
const INK_SCALE = 0.5;

/**
 * Finds every pixel of ink in the journey slide's text: each letter is drawn, in its own font and colour,
 * at the spot the browser laid it out, onto an offscreen canvas that is then read back. The scene puts a tiny
 * leaf on each of a sample of those pixels, so the words themselves turn into leaves.
 */
function measureSources(stage: HTMLElement, intro: HTMLElement, version: number): LeafSources {
  const s = stage.getBoundingClientRect();
  const K = INK_SCALE;
  const cw = Math.max(1, Math.round(s.width * K));
  const ch = Math.max(1, Math.round(s.height * K));
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const g = canvas.getContext("2d", { willReadFrequently: true })!;
  g.scale(K, K);
  g.textBaseline = "alphabetic";
  const range = document.createRange();

  intro.querySelectorAll<HTMLElement>("[data-leaf]").forEach((el) => {
    const cs = getComputedStyle(el);
    if (!el.textContent?.trim()) {
      // a dot: draw its ring
      const r = el.getBoundingClientRect();
      const bw = parseFloat(cs.borderTopWidth) || 2;
      g.strokeStyle = cs.borderTopColor;
      g.lineWidth = bw;
      g.beginPath();
      g.arc(r.left - s.left + r.width / 2, r.top - s.top + r.height / 2, (r.width - bw) / 2, 0, Math.PI * 2);
      g.stroke();
      return;
    }
    g.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    g.fillStyle = cs.color;
    const upper = cs.textTransform === "uppercase";
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode() as Text | null; n; n = walker.nextNode() as Text | null) {
      const text = n.data;
      for (let i = 0; i < text.length; i++) {
        if (!text[i].trim()) continue;
        range.setStart(n, i);
        range.setEnd(n, i + 1);
        const r = range.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        const c = upper ? text[i].toUpperCase() : text[i];
        // the letter box is the font's ascent + descent tall, so the baseline sits one ascent below its top
        const base = r.top - s.top + g.measureText(c).fontBoundingBoxAscent;
        g.fillText(c, r.left - s.left, base);
      }
    }
  });

  const data = g.getImageData(0, 0, cw, ch).data;
  const pts: number[] = [];
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const i = (y * cw + x) * 4;
      if (data[i + 3] > 110) pts.push((x + 0.5) / K, (y + 0.5) / K, data[i], data[i + 1], data[i + 2]);
    }
  }
  const count = pts.length / 5;
  return { w: s.width, h: s.height, version, pts: Float32Array.from(pts), count, ink: count / (K * K) };
}

/**
 * The journey: a pinned stage, then a stretch of scroll for the journey slide and a full-screen step per robot.
 * Scrolling through the first stretch plays the journey slide breaking into leaves and V1 sweeping them off the
 * water, frame by frame with the scroll (and backwards when scrolling back). After that, each robot swims in as
 * its step reaches the middle of the screen while the one before swims off. All of it is one canvas.
 */
export default function Roadmap() {
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  /** -2 before the journey, -1 on the journey slide, 0..3 the robot on stage, 4 after the last */
  const activeRef = useRef(-2);
  const reserveRef = useRef(0);
  const uRef = useRef(0);
  const sourcesRef = useRef<LeafSources>({ w: 0, h: 0, version: 0, pts: new Float32Array(0), count: 0, ink: 0 });
  const leavesReady = useRef(false);
  const [active, setActive] = useState(-2);
  // V1's chapter text waits until it has cleared the leaves
  const [lakeClear, setLakeClear] = useState(false);
  const [ready, setReady] = useState(false);
  const [canGL] = useState(webglAvailable);
  // the 3D code and models are a heavy download, so they wait until the journey is about two screens away
  const near = useInView(rootRef, { once: true, margin: "0px 0px 200% 0px" });
  const onScreen = useInView(rootRef);
  const show3d = canGL;
  // stable, so the memoised scene never re-renders because of them
  const onSceneReady = useCallback(() => setReady(true), []);
  const onLeavesReady = useCallback(() => void (leavesReady.current = true), []);

  // which step is in the middle of the screen
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !onScreen) return;
    let raf = 0;
    const compute = () => {
      raf = 0;
      const steps = root.querySelectorAll<HTMLElement>("[data-step]");
      if (!steps.length) return;
      const mid = window.innerHeight * 0.5;
      let idx = -1;
      if (steps[steps.length - 1].getBoundingClientRect().bottom <= mid) idx = steps.length;
      else {
        steps.forEach((s, i) => {
          if (s.getBoundingClientRect().top <= mid) idx = i;
        });
      }
      // step 0 is the journey slide, the robots follow
      const a = idx - 1;
      activeRef.current = a;
      setActive((prev) => (prev === a ? prev : a));
    };
    // phones: the text sits under the robot, so tell the scene how much room it takes (text + rail)
    const measure = () => {
      const texts = root.querySelectorAll<HTMLElement>(".step__text");
      reserveRef.current = Math.max(0, ...Array.from(texts, (el) => el.offsetHeight)) + 110;
      schedule();
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(compute);
    };
    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", measure);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [onScreen]);

  // measure the journey slide's text so the leaves can come out of it, and again whenever it reflows
  useEffect(() => {
    const stage = stageRef.current;
    const intro = introRef.current;
    if (!stage || !intro) return;
    let raf = 0;
    const run = () => {
      raf = 0;
      sourcesRef.current = measureSources(stage, intro, sourcesRef.current.version + 1);
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(run);
    };
    schedule();
    document.fonts?.ready.then(schedule);
    const ro = new ResizeObserver(schedule);
    ro.observe(stage);
    return () => {
      ro.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // the transition is stepped by scrolling (see useJourneyGate), which writes the clock `u`
  useJourneyGate(rootRef, uRef, !canGL || prefersReducedMotion());

  // what the slide and the V1 chapter show for the current `u`
  useEffect(() => {
    const introEl = introRef.current;
    if (!introEl || !onScreen) return;
    let raf = 0;
    let shown = -1;
    let clear = false;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const u = uRef.current;

      // the slide's own text gives way to the leaves redrawing it (or just fades, with no 3D to draw them)
      const leafMode = show3d && leavesReady.current;
      const intro = Math.round((1 - (leafMode ? smooth(0, 0.03, u) : smooth(0.02, 0.2, u))) * 1000) / 1000;
      if (intro !== shown) {
        shown = intro;
        // set on the slide itself: a variable on the stage would restyle everything inside it
        introEl.style.opacity = String(intro);
        introEl.classList.toggle("is-gone", intro === 0);
      }
      const nowClear = clear ? u > 0.8 : u >= 0.9;
      if (nowClear !== clear) {
        clear = nowClear;
        setLakeClear(nowClear);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onScreen, show3d]);

  const rail = Math.min(Math.max(active, 0), bots.length - 1);
  // the robots' chapters start once V1 has cleared the lake, not while the journey slide is still being played
  const onBots = active >= 0 && active < bots.length && lakeClear;
  const photoActive = lakeClear ? active : -2;

  return (
    <div ref={rootRef} id="roadmap" className={`roadmap ${ready ? "is-ready" : ""}`}>
      <div ref={stageRef} className="roadmap__stage">
        <div className="roadmap__glow" aria-hidden="true" />

        {/* the journey slide: pinned here so it can break apart where it stands */}
        <section ref={introRef} className="intro journey" aria-labelledby="journey-title">
          <WaterBackdrop intensity="soft" />
          <div className="journey__inner">
            <p className="eyebrow" data-leaf>The journey</p>
            <h2 id="journey-title" className="display" data-leaf>One robot became a fleet.</h2>
            <p className="lead" data-leaf>
              Each SCRUB was built because the one before it showed us what a different kind of water needs. Scroll to follow
              them in the order they arrived.
            </p>
            <ol className="journey__line">
              {bots.map((b) => (
                <li key={b.id}>
                  <a href={`#step-${b.id}`} className="journey__stop">
                    <span className="journey__when" data-leaf>{b.roadmap.when}</span>
                    <span className="journey__dot" aria-hidden="true" data-leaf />
                    <strong data-leaf>{b.name}</strong>
                    <span className="journey__purpose" data-leaf>{b.purpose}</span>
                  </a>
                </li>
              ))}
            </ol>
          </div>
          <a className="hero__scroll journey__scroll" href="#step-v1" aria-label="Scroll to SCRUB V1">
            <span>Scroll</span>
            <i />
          </a>
        </section>

        <div className="roadmap__scene" aria-hidden="true">
          {show3d && near ? (
            <ViewerBoundary fallback={<PhotoLayer active={photoActive} />}>
              <Suspense fallback={null}>
                <div className="roadmap__canvas">
                  <RoadmapScene
                    activeRef={activeRef}
                    uRef={uRef}
                    sourcesRef={sourcesRef}
                    reserveRef={reserveRef}
                    paused={!onScreen}
                    onReady={onSceneReady}
                    onLeavesReady={onLeavesReady}
                  />
                </div>
              </Suspense>
            </ViewerBoundary>
          ) : (
            !show3d && <PhotoLayer active={photoActive} />
          )}

          <ol className={`rail ${onBots ? "is-shown" : ""}`} style={{ "--p": rail / (bots.length - 1) } as CSSProperties}>
            {bots.map((b, i) => (
              <li key={b.id} className={i === active ? "is-on" : i < active ? "is-done" : ""}>
                <span className="rail__dot" />
                <span className="rail__id">{b.id.toUpperCase()}</span>
                <span className="rail__when">{b.roadmap.when}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* the journey slide's transition is stepped by two scrolls (useJourneyGate), then one step per robot */}
      <section data-step id="step-intro" className="step step--spacer" aria-hidden="true" />
      {bots.map((b, i) => {
        const feats = b.features.filter((f) => !f.draft).slice(0, 3);
        const on = active === i && (i > 0 || lakeClear);
        return (
          <section key={b.id} data-step id={`step-${b.id}`} className={`slide step ${on ? "is-active" : ""}`} aria-labelledby={`step-${b.id}-title`}>
            <div className="wrap step__grid">
              <div className="step__text">
                <p className="eyebrow">
                  Chapter {String(i + 1).padStart(2, "0")} · {b.roadmap.when}
                  {import.meta.env.DEV && b.roadmap.draft && <em className="draft-tag">approx. date</em>}
                </p>
                <h2 id={`step-${b.id}-title`} className="display step__title">{b.roadmap.headline}</h2>
                <div className="step__who">
                  <strong>{b.name}</strong>
                  <span className={`step__status ${b.status === "In development" ? "is-dev" : ""}`}>{b.status}</span>
                </div>
                <p className="step__purpose">
                  <span>Purpose</span>
                  {b.purpose}
                </p>
                <p className="step__story">{b.roadmap.story}</p>
                <ul className="step__chips" aria-label={`${b.name} highlights`}>
                  {feats.map((f) => (
                    <li key={f.title}>{f.title}</li>
                  ))}
                </ul>
                <Link to={`/products?bot=${b.id}`} className="btn btn--ghost" onPointerEnter={() => prefetch("/products")} onFocus={() => prefetch("/products")}>
                  See {b.name} in 3D <ArrowRight />
                </Link>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
