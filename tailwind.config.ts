import type { Config } from "tailwindcss";

// LIGHT IS THE DEFAULT (Aug 12 2026). The named colors below back the legacy
// utility classes (`bg-panel`, `text-flow-400`, `border-line`, `text-mint`)
// still used across older pages. They are remapped onto the warm off-white
// canvas so those pages inherit the same identity as the rebuilt ones instead
// of rendering as a second company.
//
// Anything that needs the old navy is inside `.is-dark-app` (the /admin back
// office), which redeclares the CSS variables locally.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0A1220", // deep navy, now the type colour rather than the page
        canvas: "#F7F5F2", // warm off-white page ground
        panel: "#FFFFFF", // raised surface
        line: "#DED8D0", // hairline on light
        flow: {
          400: "#1240E8", // cobalt, readable on white (7.2:1)
          500: "#0B2CA8",
          600: "#08205E",
        },
        mint: "#146C34", // positive, AA on the warm tint band
        warn: "#92400E", // caution, AA on the warm tint band
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        display: ["var(--font-archivo)", "Archivo", "Inter", "sans-serif"],
      },
      boxShadow: {
        "glow-blue": "0 12px 32px rgba(18, 64, 232, 0.18)",
        "glow-violet": "0 12px 32px rgba(109, 40, 217, 0.16)",
        "glow-amber": "0 12px 32px rgba(180, 83, 9, 0.14)",
        "glow-mint": "0 12px 32px rgba(21, 128, 61, 0.14)",
      },
    },
  },
  plugins: [],
};
export default config;
