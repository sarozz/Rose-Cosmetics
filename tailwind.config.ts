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
      },
      fontFamily: {
        sans: [
          "InterVariable",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
