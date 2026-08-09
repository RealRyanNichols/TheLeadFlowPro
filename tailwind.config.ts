import type { Config } from "tailwindcss";

// PREMIUM DARK: deep space base, glassmorphism cards, gradient + glow accents.
// Amber = money bleeding, mint = money kept, sky/violet = brand energy.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#070B14",   // page base (deep space)
        panel: "#0D1526", // solid panel fallback
        line: "#1E2A44",  // borders / tracks
        flow: {
          400: "#38BDF8",
          500: "#0EA5E9",
          600: "#0284C7",
        },
        mint: "#34D399",
        warn: "#FBBF24",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        "glow-blue": "0 0 24px rgba(56, 189, 248, 0.35)",
        "glow-violet": "0 0 24px rgba(139, 92, 246, 0.3)",
        "glow-amber": "0 0 20px rgba(251, 191, 36, 0.25)",
        "glow-mint": "0 0 20px rgba(52, 211, 153, 0.25)",
      },
    },
  },
  plugins: [],
};
export default config;
