import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
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
        ink: {
          DEFAULT: "#1F2937",
          soft: "#374151",
          muted: "#6B7280",
        },
        // Warm off-white palette so the app isn't a harsh slab of pure white.
        // `page` is the main app background; `card` stays white so content sits
        // forward of it with clear hierarchy.
        page: "#FAF5F0",
        surface: "#F4EDE5",
        card: "#FFFFFF",
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
