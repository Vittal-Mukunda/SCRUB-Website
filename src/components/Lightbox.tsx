import { useEffect, useRef } from "react";
import { ArrowLeft, ArrowRight, Close } from "./Icons";
import { gallery } from "../data/content";

interface LightboxProps {
  index: number;
  onChange: (index: number) => void;
  onClose: () => void;
}

/**
 * Full-screen photo viewer. Like any dialog it takes focus when it opens, keeps Tab inside itself, stops the
 * page behind from scrolling, and hands focus back to the photo that opened it. Arrow keys and the on-screen
 * buttons step through the gallery; Escape or a click outside the photo closes it.
 */
export default function Lightbox({ index, onChange, onClose }: LightboxProps) {
  const root = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const photo = gallery[index];
  const n = gallery.length;
  // read inside the key handler without re-binding it on every step
  const live = useRef({ index, onChange, onClose });
  useEffect(() => {
    live.current = { index, onChange, onClose };
  });

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtn.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      const { index: i, onChange: change, onClose: close } = live.current;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") change((i + 1) % n);
      else if (e.key === "ArrowLeft") change((i + n - 1) % n);
      else if (e.key === "Tab") {
        const items = root.current?.querySelectorAll<HTMLElement>("button");
        if (!items?.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        const at = document.activeElement;
        if (e.shiftKey && at === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && at === last) {
          e.preventDefault();
          first.focus();
        } else if (!root.current?.contains(at)) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [n]);

  return (
    <div ref={root} className="lightbox" role="dialog" aria-modal="true" aria-label="Photo viewer" onClick={onClose}>
      <button ref={closeBtn} className="lightbox__x" aria-label="Close photo" onClick={onClose}>
        <Close width={22} height={22} />
      </button>
      <button
        className="lightbox__nav lightbox__nav--prev"
        aria-label="Previous photo"
        onClick={(e) => {
          e.stopPropagation();
          onChange((index + n - 1) % n);
        }}
      >
        <ArrowLeft width={22} height={22} />
      </button>
      <button
        className="lightbox__nav lightbox__nav--next"
        aria-label="Next photo"
        onClick={(e) => {
          e.stopPropagation();
          onChange((index + 1) % n);
        }}
      >
        <ArrowRight width={22} height={22} />
      </button>
      <figure onClick={(e) => e.stopPropagation()}>
        <img key={photo.src} src={photo.src} alt={photo.alt} />
        <figcaption>
          <strong>{photo.caption}</strong>
          {photo.credit && <small>{photo.credit}</small>}
          <small aria-live="polite">{index + 1} / {n}</small>
        </figcaption>
      </figure>
    </div>
  );
}
