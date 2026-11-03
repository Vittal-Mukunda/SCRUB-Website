/**
 * Decorative animated "lake surface": drifting caustic light, ripple rings and
 * algae specks. Pure CSS/SVG, so it costs almost nothing and respects
 * prefers-reduced-motion (see styles.css).
 */
const SPECKS = Array.from({ length: 14 }, (_, i) => ({
  left: (i * 37 + 11) % 100,
  top: (i * 53 + 7) % 100,
  size: 3 + ((i * 7) % 7),
  delay: (i * 0.9) % 8,
  dur: 9 + ((i * 5) % 9),
}));

export default function WaterBackdrop({ intensity = "full" }: { intensity?: "full" | "soft" }) {
  return (
    <div className={`water water--${intensity}`} aria-hidden="true">
      <div className="water__glow water__glow--a" />
      <div className="water__glow water__glow--b" />
      <div className="water__ripple water__ripple--a" />
      <div className="water__ripple water__ripple--b" />
      <div className="water__ripple water__ripple--c" />
      {SPECKS.map((s, i) => (
        <span
          key={i}
          className="water__speck"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.dur}s`,
          }}
        />
      ))}
      <svg className="water__waves" viewBox="0 0 1440 160" preserveAspectRatio="none">
        <path
          className="water__wave water__wave--1"
          d="M0 80 C 180 20, 360 140, 540 80 S 900 20, 1080 80 S 1320 130, 1440 70 V160 H0Z"
        />
        <path
          className="water__wave water__wave--2"
          d="M0 100 C 200 150, 400 40, 600 100 S 1000 150, 1200 90 S 1380 60, 1440 100 V160 H0Z"
        />
      </svg>
    </div>
  );
}
