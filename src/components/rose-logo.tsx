import { Allura } from "next/font/google";

// Allura is the closest free Google Font to Apple's "Snell Roundhand", which
// only ships on macOS / iOS. Loading it via next/font means every device
// (Windows, Android, ChromeOS, …) renders the wordmark from the same font
// file, so the brand mark stops drifting between platforms.
const allura = Allura({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

type Size = "sm" | "md" | "lg";

const wordClass: Record<Size, string> = {
  sm: "text-2xl leading-none",
  md: "text-3xl leading-none",
  lg: "text-5xl leading-none",
};
const subClass: Record<Size, string> = {
  sm: "text-[8px] tracking-[0.25em]",
  md: "text-[10px] tracking-[0.28em]",
  lg: "text-[12px] tracking-[0.32em]",
};

/**
 * Script "Rose" wordmark with a "COSMETICS" sub-line. The wordmark uses a
 * web-loaded script font so it renders identically on every device. The
 * sub-line keeps the system sans for scale neutrality.
 */
export function RoseLogo({
  size = "md",
  className = "",
}: {
  size?: Size;
  className?: string;
}) {
  return (
    <span className={`inline-flex flex-col ${className}`}>
      <span
        className={`${allura.className} text-rose-400 drop-shadow-[0_0_8px_rgba(233,80,125,0.35)] ${wordClass[size]}`}
      >
        Rose
      </span>
      <span className={`font-semibold uppercase text-ink ${subClass[size]}`}>
        Cosmetics
      </span>
    </span>
  );
}
