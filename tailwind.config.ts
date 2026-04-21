import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f4f0ff",
          100: "#e9e1ff",
          200: "#d4c4ff",
          300: "#b79cff",
          400: "#9366ff",
          500: "#7b3fff",
          600: "#6528e6",
          700: "#4E3485",
          800: "#3a2566",
          900: "#2a1a4a",
          950: "#150c29",
        },
      },
      fontFamily: {
        display: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Inter", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(255,255,255,0.06), 0 20px 60px -20px rgba(123,63,255,0.45)",
        "glow-lg": "0 0 0 1px rgba(255,255,255,0.08), 0 40px 120px -30px rgba(217,70,239,0.55)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.97)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "blob-drift": {
          "0%, 100%": { transform: "translate(0,0) scale(1)" },
          "33%": { transform: "translate(30px,-20px) scale(1.05)" },
          "66%": { transform: "translate(-20px,20px) scale(0.97)" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out both",
        "slide-up": "slide-up 0.5s cubic-bezier(0.22,1,0.36,1) both",
        "scale-in": "scale-in 0.35s cubic-bezier(0.22,1,0.36,1) both",
        "blob-drift": "blob-drift 18s ease-in-out infinite",
        "blob-drift-slow": "blob-drift 26s ease-in-out infinite",
        "shimmer": "shimmer 2.4s linear infinite",
      },
      backgroundImage: {
        "grid-faint":
          "linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)",
      },
      backgroundSize: {
        "grid-24": "24px 24px",
      },
    },
  },
  plugins: [],
};
export default config;
