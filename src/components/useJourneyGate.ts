import { useEffect } from "react";
import type { MutableRefObject, RefObject } from "react";
import { clamp } from "../three/timeline";

/** px either side of a stop that still counts as standing on it */
const EPS = 3;
/** ms the page is held when it arrives on the journey slide, so the slide can be read before anything moves */
const ARRIVE_HOLD = 500;
/** ms the page is held on each robot before the next scroll is let through */
const STOP_HOLD = 550;
/** ms of quiet in the wheel stream that count as a new gesture rather than the tail of the last one */
const FRESH_GAP = 140;
/** the longest the tail of a gesture is swallowed after a hold ends */
const FRESH_CAP = 450;

/** ms V1 takes to sweep every leaf into its bin (the clock `u` going 0.5 to 0.75) */
const SWEEP_MS = 1350;
/** ms V1 then takes to glide back to the centre (u going 0.75 to 1) */
const GLIDE_MS = 1000;
/** the second scroll is the sweep and the glide, one after the other */
const CLEAN_MS = SWEEP_MS + GLIDE_MS;

/** ms the words take to fly up as leaves and land on the water, as one motion (the clock `u` going 0 to 0.5) */
const LEAF_MS = 850;

const easeOutCubic = (k: number) => 1 - Math.pow(1 - k, 3);
const easeInOutSine = (k: number) => -(Math.cos(Math.PI * k) - 1) / 2;

/**
 * How far along its path (0..1) the clean-up has got after fraction `k` of its time. The sweep and the glide each
 * cover half of the path but take different times, so the clock runs at two speeds; played backwards the glide
 * comes first.
 */
function cleanProgress(k: number, forward: boolean) {
  const split = (forward ? SWEEP_MS : GLIDE_MS) / CLEAN_MS;
  return k < split ? 0.5 * (k / split) : 0.5 + 0.5 * ((k - split) / (1 - split));
}

/**
 * Steps the journey slide's clock `u` (written into `uRef`) in two scrolls instead of following the scrollbar:
 *  1st scroll: the words turn into leaves, fly up and land on the water in one smooth 0.85 seconds;
 *  2nd scroll: V1 sweeps them up in 1.35 seconds and glides to the centre in one more, and the page stays put until
 *              that has finished.
 * After that the robots scroll natively, except that the page is held for a moment each time a robot reaches the top,
 * so they arrive one at a time. Scrolling back up replays the same steps in reverse.
 *
 * The page is held by clamping its scroll position and, for the length of the hold, freezing the document's
 * overflow; wheel, touch and key input is turned into "go forward / go back" while resting on the journey slide.
 */
export function useJourneyGate(rootRef: RefObject<HTMLElement | null>, uRef: MutableRefObject<number>, fast: boolean) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const html = document.documentElement;
    // u at each rest, and how long the step from one to the next takes
    const levels = fast ? [0, 1] : [0, 0.5, 1];
    const durs = fast ? [220] : [LEAF_MS, CLEAN_MS];
    const last = levels.length - 1;

    let stage = 0;
    let anim: { from: number; to: number; t0: number; dur: number } | null = null;
    let raf = 0;
    let holdY: number | null = null;
    let timer = 0;
    let syncTimer = 0;
    let swallowUntil = 0;
    let bypassUntil = 0;
    let lastWheel = 0;
    let prevY = window.scrollY;
    let touchY = 0;
    let touchHandled = false;

    /** page y of the top of each robot's step; the first is where the journey slide is pinned */
    const stops = () => {
      const y = window.scrollY;
      const out: number[] = [];
      root.querySelectorAll<HTMLElement>("[data-step]").forEach((s, i) => {
        if (i > 0) out.push(Math.round(y + s.getBoundingClientRect().top));
      });
      return out;
    };
    const stopAt = () => {
      const y = window.scrollY;
      return stops().findIndex((s) => Math.abs(y - s) <= EPS);
    };
    const setY = (y: number) => {
      if (Math.abs(window.scrollY - y) > 0.5) window.scrollTo({ top: y, behavior: "instant" });
    };
    const busy = () => holdY !== null;

    const release = () => {
      holdY = null;
      html.style.overflow = "";
      swallowUntil = performance.now() + FRESH_CAP;
    };
    const lockFor = (y: number, ms: number) => {
      clearTimeout(timer);
      holdY = y;
      html.style.overflow = "hidden";
      setY(y);
      prevY = y;
      timer = window.setTimeout(release, ms);
    };

    const tick = (now: number) => {
      raf = 0;
      if (!anim) return;
      const k = clamp((now - anim.t0) / anim.dur);
      const along = anim.dur === CLEAN_MS ? cleanProgress(k, anim.to > anim.from) : anim.dur === LEAF_MS ? easeInOutSine(k) : easeOutCubic(k);
      uRef.current = anim.from + (anim.to - anim.from) * along;
      if (k < 1) raf = requestAnimationFrame(tick);
      else anim = null;
    };
    const play = (to: number, dur: number) => {
      anim = { from: uRef.current, to, t0: performance.now(), dur };
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const jump = (s: number) => {
      stage = s;
      anim = null;
      uRef.current = levels[s];
    };

    const wants = (dir: number) => (dir > 0 && stage < last) || (dir < 0 && stage > 0);
    /** one step forward or back on the journey slide, with the page held until it is over */
    const advance = (dir: number) => {
      const pin = stops()[0];
      const from = stage;
      stage += dir;
      const dur = durs[Math.min(from, stage)];
      play(levels[stage], dur);
      lockFor(pin, dur + (dur > 2000 ? 350 : 80));
    };
    /** put the page where it should be after a jump the gate did not see step by step */
    const sync = () => {
      if (busy()) return;
      const pin = stops()[0];
      const y = window.scrollY;
      if (y > pin + EPS) jump(last);
      else if (y < pin - window.innerHeight * 0.6) jump(0);
    };
    const bypass = (ms: number) => {
      bypassUntil = performance.now() + ms;
      clearTimeout(syncTimer);
      syncTimer = window.setTimeout(sync, ms + 100);
    };

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return; // pinch zoom
      const now = performance.now();
      const gap = now - lastWheel;
      lastWheel = now;
      if (now < bypassUntil) return;
      if (busy()) {
        e.preventDefault();
        return;
      }
      if (Math.abs(e.deltaY) < 2 || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      const dir = e.deltaY > 0 ? 1 : -1;
      const at = stopAt();
      if (at < 0) return;
      // the tail of the gesture that just ended (a trackpad keeps sending events for a while) must not start the next step
      if (now < swallowUntil && gap < FRESH_GAP) {
        e.preventDefault();
        return;
      }
      if (at === 0 && wants(dir)) {
        e.preventDefault();
        advance(dir);
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return;
      if (e.key === "End" || e.key === "Home") {
        // a deliberate jump across the page: don't stop the page on the way
        if (e.key === "End") jump(last);
        bypass(1500);
        return;
      }
      let dir = 0;
      if (e.key === "ArrowDown" || e.key === "PageDown") dir = 1;
      else if (e.key === "ArrowUp" || e.key === "PageUp") dir = -1;
      else if (e.key === " " && !/^(BUTTON|A)$/.test(t?.tagName ?? "")) dir = e.shiftKey ? -1 : 1;
      if (!dir) return;
      if (performance.now() < bypassUntil) return;
      if (busy()) {
        e.preventDefault();
        return;
      }
      if (stopAt() === 0 && wants(dir)) {
        e.preventDefault();
        advance(dir);
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      touchY = e.touches[0]?.clientY ?? 0;
      touchHandled = false;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!e.cancelable) return;
      if (busy() || touchHandled) {
        e.preventDefault();
        return;
      }
      const dy = touchY - (e.touches[0]?.clientY ?? touchY);
      if (Math.abs(dy) < 10) return;
      const dir = dy > 0 ? 1 : -1;
      if (stopAt() === 0 && wants(dir)) {
        e.preventDefault();
        touchHandled = true;
        advance(dir);
      }
    };

    const onScroll = () => {
      const y = window.scrollY;
      const prev = prevY;
      prevY = y;
      if (busy()) {
        setY(holdY!);
        prevY = holdY!;
        return;
      }
      if (performance.now() < bypassUntil || y === prev) return;
      const st = stops();
      if (!st.length) return;
      const pin = st[0];
      // a jump of more than a screen and a half (reload, scrollbar drag): take the page where it landed
      if (Math.abs(y - prev) > window.innerHeight * 1.5) {
        jump(y > pin + EPS ? last : 0);
        return;
      }
      const hold = (i: number, s: number) => {
        lockFor(s, i === 0 ? ARRIVE_HOLD : STOP_HOLD);
      };
      if (y > prev) {
        for (let i = 0; i < st.length; i++) {
          if (prev < st[i] - EPS && y >= st[i] - EPS) return hold(i, st[i]);
        }
        // pushed off the journey slide some way the wheel did not catch (scrollbar drag): treat it as a scroll
        if (stage < last && prev >= pin - EPS && prev <= pin + EPS && y > pin + EPS) advance(1);
      } else {
        for (let i = st.length - 1; i >= 0; i--) {
          if (prev > st[i] + EPS && y <= st[i] + EPS && (i > 0 || stage > 0)) return hold(i, st[i]);
        }
        if (stage > 0 && prev >= pin - EPS && prev <= pin + EPS && y < pin - EPS) advance(-1);
      }
    };

    // links to a robot's step ("Scroll" on the journey slide) mean "take me there", not "play it step by step"
    const onClick = (e: MouseEvent) => {
      if ((e.target as Element | null)?.closest?.('a[href^="#step-"]')) {
        jump(last);
        bypass(1500);
      }
    };

    // arriving mid-page (reload): the journey is already behind us
    if (window.scrollY > (stops()[0] ?? Infinity) + EPS) jump(last);

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("click", onClick, true);
      clearTimeout(timer);
      clearTimeout(syncTimer);
      if (raf) cancelAnimationFrame(raf);
      html.style.overflow = "";
    };
  }, [rootRef, uRef, fast]);
}
