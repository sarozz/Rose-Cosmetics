import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // Tailwind's default sm breakpoint is 640px. Add a tighter `xs` for
      // the in-between band (380–640px) where most modern phones live —
      // the hero headline gets one more size up before sm kicks in.
      screens: {
        xs: "380px",
      },
      colors: {
        rose: {
          DEFAULT: "#B03052",
          50: "#FDF2F5",
          100: "#FBE4EA",
          200: "#F6C2CE",
          300: "#EE94AA",
          400: "#E25F80",
          500: "#C93A63",
          600: "#B03052",
          700: "#8E2442",
          800: "#6A1B32",
          900: "#491322",
        },
        // Dark theme. Text is off-white (not pure) to avoid glare, and the
        // three bg tones stack `page < surface < card` so content panels
        // visually sit forward of the chrome.
        ink: {
          DEFAULT: "#ECE9F0",
          soft: "#C6C2CF",
          muted: "#8E8A9A",
        },
        page: "#14121A",
        surface: "#1E1B26",
        card: "#241F2D",
        // Subtle divider that reads on dark without being harsh.
        line: "rgba(255, 255, 255, 0.08)",
        // Marketing site palette — soft creamy background that lets the
        // rose accent pop. Tailwind ships `stone-*` already so we just add
        // the cream tone.
        cream: "#FFF8F3",
      },
      fontFamily: {
        // System UI stack — ships zero font bytes, renders instantly, looks
        // native on every platform. No more "InterVariable" that the browser
        // was silently falling back from.
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
