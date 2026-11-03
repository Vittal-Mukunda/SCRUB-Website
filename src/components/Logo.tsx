interface LogoProps {
  /** "wordmark" = S.C.R.U.B. only; "full" adds the ROBOTICS line */
  variant?: "wordmark" | "full";
  className?: string;
}

const LETTERS = ["S", "C", "R", "U", "B"];

export default function Logo({ variant = "wordmark", className = "" }: LogoProps) {
  return (
    <span className={`logo ${className}`} role="img" aria-label="S.C.R.U.B. Robotics">
      <span className="logo__word" aria-hidden="true">
        {LETTERS.map((l) => (
          <span key={l}>
            {l}
            <i className="logo__dot" />
          </span>
        ))}
      </span>
      {variant === "full" && (
        <span className="logo__sub" aria-hidden="true">
          Robotics
        </span>
      )}
    </span>
  );
}
