import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { Bot } from "../data/content";
import ViewerBoundary from "./ViewerBoundary";
import Loader from "./Loader";
import { Close, Play, Rotate } from "./Icons";

const OrbitViewer = lazy(() => import("../three/OrbitViewer"));

/** Full-screen 360° viewer: drag to orbit, scroll to zoom, close to return. */
export default function ModelViewer({ bot, onClose }: { bot: Bot; onClose: () => void }) {
  const [autoRotate, setAutoRotate] = useState(false);
  const [running, setRunning] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const closeBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeBtn.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div className="mv" role="dialog" aria-modal="true" aria-label={`${bot.name} 3D viewer`}>
      <div className="mv__canvas">
        <ViewerBoundary fallback={<img className="mv__photo" src={bot.cover} alt={bot.name} />}>
          <Suspense fallback={<Loader label="Preparing the 3D view" className="loader--cover" />}>
            <OrbitViewer key={resetKey} botId={bot.id} autoRotate={autoRotate} running={running} />
          </Suspense>
        </ViewerBoundary>
      </div>

      <div className="mv__top">
        <div>
          <span className="sel__id">{bot.id.toUpperCase()}</span>
          <h2>{bot.name}</h2>
          <p>{bot.purpose}</p>
        </div>
        <button ref={closeBtn} className="mv__close" onClick={onClose} aria-label="Close 3D viewer">
          <Close width={20} height={20} /> <span>Close</span>
        </button>
      </div>

      <div className="mv__bar">
        <span className="mv__tip"><Rotate width={16} height={16} /> Drag to look around · scroll or pinch to zoom</span>
        <div className="mv__controls">
          <button className={`vbtn ${autoRotate ? "is-on" : ""}`} aria-pressed={autoRotate} onClick={() => setAutoRotate((v) => !v)}>
            <Rotate width={16} height={16} /> Auto-rotate
          </button>
          <button className={`vbtn ${running ? "is-on" : ""}`} aria-pressed={running} onClick={() => setRunning((v) => !v)}>
            <Play width={14} height={14} /> {running ? "Running" : "Run"}
          </button>
          <button className="vbtn" onClick={() => setResetKey((k) => k + 1)}>Reset view</button>
        </div>
      </div>
    </div>
  );
}
