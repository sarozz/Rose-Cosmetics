import type { CSSProperties } from "react";

type Size = "sm" | "md" | "lg";

const wordClass: Record<Size, string> = {
  sm: "text-base leading-none",
  md: "text-xl leading-none",
  lg: "text-4xl leading-none",
};
const subClass: Record<Size, string> = {
  sm: "text-[8px] tracking-[0.25em]",
  md: "text-[10px] tracking-[0.28em]",
  lg: "text-[12px] tracking-[0.32em]",
};

/**
 * Script "Rose" wordmark with a "COSMETICS" sub-line. Typeset-only so
 * the mark stays crisp on retina / print and nothing leans on a custom
 * asset.
 */
export function RoseLogo({
  size = "md",
  className = "",
}: {
  size?: Size;
  className?: string;
}) {
  const fontStyle: CSSProperties = {
    fontFamily:
      '"Snell Roundhand", "Lucida Handwriting", "Brush Script MT", ui-serif, Georgia, serif',
    fontStyle: "italic",
    fontWeight: 600,
  };
  return (
    <span className={`inline-flex flex-col ${className}`}>
      <span
        className={`text-rose-400 drop-shadow-[0_0_8px_rgba(233,80,125,0.35)] ${wordClass[size]}`}
        style={fontStyle}
      >
        Rose
      </span>
      <span className={`font-semibold uppercase text-ink ${subClass[size]}`}>
        Cosmetics
      </span>
    </span>
  );
}
