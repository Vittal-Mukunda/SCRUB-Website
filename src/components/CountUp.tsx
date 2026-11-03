import { useEffect, useRef, useState } from "react";
import { reducedMotion, useInView } from "./useInView";

interface CountUpProps {
  to: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
}

/** ease-out matching cubic-bezier(0.22, 1, 0.36, 1) closely enough for a counter */
const easeOut = (t: number) => 1 - Math.pow(1 - t, 4);

/** Counts from 0 to `to` the first time it is visible. */
export default function CountUp({ to, duration = 1.8, prefix = "", suffix = "" }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const [reduce] = useState(reducedMotion);
  const [value, setValue] = useState(reduce ? to : 0);

  useEffect(() => {
    if (!inView || reduce) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / (duration * 1000));
      setValue(Math.round(easeOut(t) * to));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduce, to, duration]);

  return (
    <span ref={ref}>
      {prefix}
      {value}
      {suffix}
    </span>
  );
}
