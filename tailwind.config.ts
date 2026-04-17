import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: { "2xl": "1400px" }
    },
    extend: {
      colors: {
        // Logo blue (deep navy → cyan)
        brand: {
          50:  "#eaf4ff",
          100: "#cfe6ff",
          200: "#9fceff",
          300: "#5fb0ff",
          400: "#2a90ff",
          500: "#1273e8",
          600: "#0d59c2",
          700: "#0d4a9d",
          800: "#0f3b7a",
          900: "#102c5b",
          950: "#0a1d3f"
        },
        // Logo cyan / promo glow
        cyan: {
          400: "#5cd0ff",
          500: "#23b8ff",
          600: "#0099e0"
        },
        // Logo orange→yellow gradient
        accent: {
          300: "#ffd66b",
          400: "#ffba3d",
          500: "#ff9a1f",
          600: "#f07a10"
        },
        // Funnel "lead drop" green
        lead: {
          400: "#a6e36b",
          500: "#7fc93f",
          600: "#5fa726"
        },
        // Promo card deep navy palette
        ink: {
          50:  "#f4f7fc",
          100: "#e6ecf6",
          200: "#c2cce0",
          300: "#94a2c0",
          400: "#65759b",
          500: "#475579",
          600: "#33415e",
          700: "#222d46",
          800: "#141c33",
          900: "#0a1124",
          950: "#050918"
        }
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "Inter", "Segoe UI", "Roboto", "sans-serif"]
      },
      backgroundImage: {
        // Promo-card cosmic glow (matches "Welcome to The LeadFlow Pro" cards)
        "promo-glow":
          "radial-gradient(ellipse 80% 60% at 80% 50%, rgba(35,184,255,0.30), transparent 60%), radial-gradient(ellipse 60% 50% at 10% 110%, rgba(160,80,255,0.20), transparent 65%)",
        "grid-fade":
          "radial-gradient(ellipse at top, rgba(35,184,255,0.18), transparent 60%)",
        // Funnel gradient: blue → cyan → orange → yellow (matches logo)
        "funnel-gradient":
          "linear-gradient(180deg, #2a90ff 0%, #23b8ff 30%, #ff9a1f 70%, #ffd66b 100%)",
        "brand-gradient":
          "linear-gradient(135deg, #0d4a9d 0%, #23b8ff 45%, #ff9a1f 100%)",
        // Spectrum line under "WELCOME TO" headlines
        "spectrum":
          "linear-gradient(90deg, #5cd0ff 0%, #b06bff 50%, #ff9a1f 100%)"
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        }
      },
      animation: {
        "fade-up": "fade-up 0.5s ease-out both"
      }
    }
  },
  plugins: [require("tailwindcss-animate")]
};

export default config;
