import { useRef } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useInView } from "./useInView";

interface RevealProps {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  /** render as <li> when used directly inside a <ul> */
  as?: "div" | "li";
}

/**
 * Fades and lifts content in once as it scrolls into view. A CSS transition on transform and
 * opacity only, so it runs on the compositor; reduced-motion turns it off (see styles.css).
 */
export default function Reveal({ children, delay = 0, y = 24, className = "", as = "div" }: RevealProps) {
  const ref = useRef<HTMLDivElement & HTMLLIElement>(null);
  const shown = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const Tag = as;
  const style = { "--reveal-y": `${y}px`, transitionDelay: delay ? `${delay}s` : undefined } as CSSProperties;
  return (
    <Tag ref={ref} className={`reveal ${shown ? "is-in" : ""} ${className}`} style={style}>
      {children}
    </Tag>
  );
}
