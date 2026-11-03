import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Reveal from "../components/Reveal";
import Callouts from "../components/Callouts";
import BotDetails from "../components/BotDetails";
import Loader from "../components/Loader";
import ModelViewer from "../components/ModelViewer";
import ViewerBoundary from "../components/ViewerBoundary";
import { useInView } from "../components/useInView";
import { ArrowDown, ArrowLeft, Cube } from "../components/Icons";
import { bots } from "../data/content";
import { photo } from "../data/photo";
import { loadShowcase } from "../routes";
import type { BotId } from "../data/content";
import type { Cell, ProjectedPoint } from "../three/Showcase";

/** three.js is large, so it only loads when the products page is opened. */
const Showcase = lazy(loadShowcase);

const GIVE_UP_MS = 15000;

/**
 * True when the device can draw the 3D showroom smoothly. A browser without a usable GPU falls back
 * to software WebGL (SwiftShader, llvmpipe, Microsoft Basic Render Driver), where the scene would
 * run at a few frames per second and freeze the page, so those get the photo cards instead.
 */
function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    const opts = { failIfMajorPerformanceCaveat: true };
    const gl = (c.getContext("webgl2", opts) || c.getContext("webgl", opts)) as WebGLRenderingContext | null;
    if (!gl) return false;
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "";
    gl.getExtension("WEBGL_lose_context")?.loseContext(); // free this probe context right away
    return !/swiftshader|llvmpipe|softpipe|software|basic render/i.test(renderer);
  } catch {
    return false;
  }
}

/** Photo cards, for devices without WebGL. */
function PhotoGrid() {
  return (
    <ul className="bot-grid">
      {bots.map((b) => (
        <li key={b.id}>
          <Link to={`/products?bot=${b.id}`} className="bot-card">
            <div className="bot-card__media">
              <img {...photo(b.cover, "(max-width: 800px) 92vw, 560px")} alt={b.name} loading="lazy" decoding="async" style={{ objectPosition: b.focus }} />
            </div>
            <div className="bot-card__body">
              <span className="bot-card__id">{b.id.toUpperCase()}</span>
              <h2>{b.name}</h2>
              <p className="bot-card__purpose">{b.purpose}</p>
              <p className="bot-card__sum">{b.summary}</p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function Products() {
  const [params, setParams] = useSearchParams();
  const selected = useMemo(() => bots.find((b) => b.id === params.get("bot"))?.id ?? null, [params]);
  const bot = bots.find((b) => b.id === selected) ?? null;
  const [viewer, setViewer] = useState(false);
  const [settled, setSettled] = useState(false);
  const [canGL] = useState(webglAvailable);
  const [loaded, setLoaded] = useState(0);
  const [gaveUp, setGaveUp] = useState(false);
  const projRef = useRef<ProjectedPoint[]>([]);
  const cellsRef = useRef<Cell[]>([]);
  const hoverRef = useRef(-1);
  const stageRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState(-1);
  const showroomRef = useRef<HTMLElement>(null);
  // stop drawing the 3D scene (and the call-outs) while it is scrolled out of view
  const onScreen = useInView(showroomRef, { initial: true });
  const paused = viewer || !onScreen;

  const ready = loaded >= bots.length || gaveUp;

  useEffect(() => {
    const t = setTimeout(() => setGaveUp(true), GIVE_UP_MS);
    return () => clearTimeout(t);
  }, []);

  // keep the 3D scene in step with the grid cards
  useEffect(() => {
    const stage = stageRef.current;
    const grid = gridRef.current;
    if (!stage || !grid) return;
    const measure = () => {
      const s = stage.getBoundingClientRect();
      cellsRef.current = Array.from(grid.children).map((el) => {
        const r = el.getBoundingClientRect();
        return { x: r.left - s.left, y: r.top - s.top, w: r.width, h: r.height };
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(stage);
    ro.observe(grid);
    Array.from(grid.children).forEach((c) => ro.observe(c));
    return () => ro.disconnect();
  }, [canGL]);

  const select = useCallback((id: BotId) => setParams({ bot: id }), [setParams]);
  const back = useCallback(() => setParams({}), [setParams]);
  const open = useCallback(() => setViewer(true), []);
  const closeViewer = useCallback(() => setViewer(false), []);
  const hoverCard = useCallback((i: number) => {
    hoverRef.current = i;
    setHover(i);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !viewer && selected) back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, viewer, back]);

  // a new robot starts at the top of the showroom
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [selected]);

  if (!canGL) {
    return (
      <>
        <section className="page-hero">
          <div className="wrap">
            <Reveal>
              <p className="eyebrow">Products</p>
              <h1 className="display">Four robots, four jobs.</h1>
              <p className="lead">Each SCRUB is built for a different kind of water.</p>
            </Reveal>
          </div>
        </section>
        <section className="section section--tight">
          <div className="wrap"><PhotoGrid /></div>
        </section>
        {bot && <BotDetails bot={bot} />}
      </>
    );
  }

  return (
    <>
      <section ref={showroomRef} className={`showroom ${selected ? "is-selected" : ""}`} aria-label="SCRUB robots">
        <Loader visible={!ready} className="loader--cover" />

        <header className="showroom__head">
          <p className="eyebrow">Products</p>
          <h1 className="display display--md">Four robots, four jobs.</h1>
          <p className="showroom__hint">Choose a robot to bring it to the centre and see what each part does.</p>
        </header>

        <div ref={stageRef} className="showroom__stage">
          {/* card backgrounds sit under the 3D scene, card text and click areas above it */}
          <div className={`pgrid pgrid--bg ${selected ? "is-off" : ""}`} aria-hidden="true">
            {bots.map((b, i) => <div key={b.id} className={`pcard__bg ${hover === i ? "is-hover" : ""}`} />)}
          </div>

          <div className="showroom__canvas">
            <ViewerBoundary fallback={<div className="showroom__fallback"><PhotoGrid /></div>}>
              <Suspense fallback={null}>
                <Showcase
                  selected={selected}
                  paused={paused}
                  revealed={ready}
                  cellsRef={cellsRef}
                  hoverRef={hoverRef}
                  onSelect={select}
                  onOpen={open}
                  onSettled={setSettled}
                  onProgress={setLoaded}
                  projRef={projRef}
                />
              </Suspense>
            </ViewerBoundary>
          </div>

          <div ref={gridRef} className={`pgrid pgrid--fg ${selected || !ready ? "is-off" : ""}`}>
            {bots.map((b, i) => (
              <button
                key={b.id}
                className="pcard"
                tabIndex={selected ? -1 : 0}
                onClick={() => select(b.id)}
                onPointerEnter={() => hoverCard(i)}
                onPointerLeave={() => hoverCard(-1)}
                onFocus={() => hoverCard(i)}
                onBlur={() => hoverCard(-1)}
              >
                <span className="pcard__space" aria-hidden="true" />
                <span className="pcard__text">
                  <span className="pcard__top">
                    <span className="pcard__id">{b.id.toUpperCase()}</span>
                    <em className={b.status === "In development" ? "is-dev" : ""}>{b.status}</em>
                  </span>
                  <strong>{b.name}</strong>
                  <span className="pcard__purpose">{b.purpose}</span>
                  <small>Explore <ArrowDown width={14} height={14} style={{ transform: "rotate(-90deg)" }} /></small>
                </span>
              </button>
            ))}
          </div>

          {bot && (
            <div className="sel">
              <div className="sel__top">
                <button className="vbtn" onClick={back}><ArrowLeft width={16} height={16} /> All robots</button>
                <div className="sel__title">
                  <span className="sel__id">{bot.id.toUpperCase()}</span>
                  <h2>{bot.name}</h2>
                  <p>{bot.purpose}</p>
                </div>
              </div>

              <Callouts botId={bot.id} projRef={projRef} ready={settled} active={!paused} />

              <div className="sel__actions">
                <button className="btn btn--accent btn--sm" onClick={open}><Cube width={18} height={18} /> Open 3D viewer</button>
                <a href="#details" className="btn btn--ghost btn--sm" onClick={(e) => { e.preventDefault(); document.getElementById("details")?.scrollIntoView({ behavior: "smooth" }); }}>
                  Scroll for details &amp; specs <ArrowDown width={16} height={16} />
                </a>
              </div>
              <p className="sel__tip">Click the robot to inspect it in 360°</p>
            </div>
          )}
        </div>

        {viewer && bot && <ModelViewer bot={bot} onClose={closeViewer} />}
      </section>

      {bot && <BotDetails bot={bot} />}
    </>
  );
}
