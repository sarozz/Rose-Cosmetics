import type { CSSProperties } from "react";

type Size = "sm" | "md" | "lg";

const iconPx: Record<Size, number> = { sm: 22, md: 30, lg: 52 };
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
 * Inline recreation of the shop's neon mark: a layered rose bloom to the
 * left of a script "Rose" wordmark with "COSMETICS" sub-line. All SVG, no
 * webfont — matches the storefront signage closely enough for a POS UI and
 * stays crisp on retina / print.
 */
export function RoseLogo({
  size = "md",
  className = "",
}: {
  size?: Size;
  className?: string;
}) {
  const px = iconPx[size];
  const fontStyle: CSSProperties = {
    fontFamily:
      '"Snell Roundhand", "Lucida Handwriting", "Brush Script MT", ui-serif, Georgia, serif',
    fontStyle: "italic",
    fontWeight: 600,
  };
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <RoseMark px={px} />
      <span className="flex flex-col">
        <span
          className={`text-rose-400 drop-shadow-[0_0_8px_rgba(233,80,125,0.35)] ${wordClass[size]}`}
          style={fontStyle}
        >
          Rose
        </span>
        <span
          className={`font-semibold uppercase text-ink ${subClass[size]}`}
        >
          Cosmetics
        </span>
      </span>
    </span>
  );
}

function RoseMark({ px }: { px: number }) {
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* outer bloom */}
      <circle cx="24" cy="20" r="14" fill="#B03052" />
      {/* petal spiral */}
      <path
        d="M24 9c6 2 9 7 7 12-2 5-8 6-11 3-3-3-2-8 1-11 1-1 2-2 3-4z"
        fill="#8E2442"
      />
      <path
        d="M13 22c0-5 4-8 9-8 1 4-1 8-4 10-3 2-5 1-5-2z"
        fill="#C93A63"
      />
      <path
        d="M35 22c0-5-4-8-9-8-1 4 1 8 4 10 3 2 5 1 5-2z"
        fill="#C93A63"
      />
      <path
        d="M24 14c3 2 4 5 3 8-1 3-4 4-6 3-2-1-3-4-2-7 1-2 3-3 5-4z"
        fill="#6A1B32"
      />
      {/* centre bud */}
      <circle cx="24" cy="21" r="3" fill="#FDF2F5" opacity="0.25" />
      {/* stem */}
      <path
        d="M24 34v10"
        stroke="#2F7D32"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* leaves */}
      <path
        d="M24 38c-3-1-6-1-9 1 2 3 6 3 9 0z"
        fill="#2F7D32"
      />
      <path
        d="M24 41c3-1 6-0 8 2-2 2-5 2-8-0z"
        fill="#3B8E3F"
      />
    </svg>
  );
}
