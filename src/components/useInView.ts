import { useEffect, useState } from "react";
import type { RefObject } from "react";

type Watcher = (visible: boolean) => void;

/** One IntersectionObserver per margin, shared by every element that uses it. */
const observers = new Map<string, { io: IntersectionObserver; watchers: Map<Element, Watcher> }>();

function observe(el: Element, margin: string, fn: Watcher) {
  let entry = observers.get(margin);
  if (!entry) {
    const watchers = new Map<Element, Watcher>();
    const io = new IntersectionObserver((list) => list.forEach((e) => watchers.get(e.target)?.(e.isIntersecting)), { rootMargin: margin });
    entry = { io, watchers };
    observers.set(margin, entry);
  }
  entry.watchers.set(el, fn);
  entry.io.observe(el);
  return () => {
    entry.watchers.delete(el);
    entry.io.unobserve(el);
  };
}

/**
 * True while `ref` is on screen (with `once`, stays true after the first time).
 * Without IntersectionObserver it reports visible straight away.
 */
export function useInView(ref: RefObject<Element | null>, { once = false, margin = "0px", initial = false } = {}) {
  const [inView, setInView] = useState(() => initial || typeof IntersectionObserver === "undefined");

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    // the observer reports asynchronously, so `stop` is assigned before the callback can run
    const stop = observe(el, margin, (visible) => {
      if (once && !visible) return;
      setInView(visible);
      if (once) stop();
    });
    return stop;
  }, [ref, once, margin]);

  return inView;
}

/** The visitor asked for less motion. */
export const reducedMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
