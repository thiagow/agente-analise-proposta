import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "hive-bg": "#0a0f1e",
        "hive-surface": "#0f1629",
        "hive-surface-2": "#111827",
        "hive-border": "#1e2a4a",
        "hive-purple": "#7c3aed",
        "hive-pink": "#ec4899",
        "hive-text": "#e2e8f0",
        "hive-muted": "#64748b",
      },
      backgroundImage: {
        "gradient-brand": "linear-gradient(135deg, #7c3aed, #ec4899)",
        "gradient-brand-hover": "linear-gradient(135deg, #6d28d9, #db2777)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-in-out",
        "slide-up": "slideUp 0.4s ease-out",
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
