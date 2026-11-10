import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        terminal: {
          obsidian: "#07040d",     // Cosmic Obsidian base
          black: "#0b0716",        // Deep glass panel backing
          card: "#0f091d",         // Elevated glass surface
          cardHover: "#18102e",    // Interactive violet hover
          border: "#25183e",       // Deep geometric divider
          borderLight: "#42286e",  // Emphasized violet border
          text: "#f1f5f9",         // Primary readout white
          muted: "#94a3b8",        // Technical secondary text
          green: "#4ade80",        // Emerald Profit Indicator
          greenGlow: "#22c55e",
          greenMuted: "#052e16",
          red: "#f43f5e",          // Bearish / Sell / Short
          redGlow: "#e11d48",
          redMuted: "#4c0519",
          amber: "#fbbf24",        // System Warning / Diagnostic
          amberGlow: "#f59e0b",
          amberMuted: "#451a03",
          cyan: "#38bdf8",         // Cyber Cyan Secondary Accent
          purple: "#a855f7",       // Neon Violet Primary Accent
          fuchsia: "#d946ef",      // Fuchsia Highlighting Accent
          emerald: "#4ade80",      // Positive Indicator
        },
      },
      fontFamily: {
        mono: [
          "JetBrains Mono",
          "Fira Code",
          "IBM Plex Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      boxShadow: {
        "neon-green": "0 0 15px rgba(74, 222, 128, 0.3)",
        "neon-emerald": "0 0 20px rgba(74, 222, 128, 0.35)",
        "neon-red": "0 0 15px rgba(244, 63, 94, 0.3)",
        "neon-amber": "0 0 15px rgba(251, 191, 36, 0.3)",
        "neon-cyan": "0 0 20px rgba(56, 189, 248, 0.35)",
        "neon-violet": "0 0 20px rgba(168, 85, 247, 0.4)",
        "neon-fuchsia": "0 0 20px rgba(217, 70, 239, 0.4)",
        "panel-glass": "0 8px 32px 0 rgba(7, 4, 13, 0.8)",
        "elevated-glass": "0 8px 32px 0 rgba(15, 9, 29, 0.75)",
      },
      transitionTimingFunction: {
        kowalski: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      animation: {
        "pulse-fast": "pulse 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "ticker": "ticker 25s linear infinite",
      },
      keyframes: {
        ticker: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
