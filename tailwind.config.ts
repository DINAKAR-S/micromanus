import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0a0b0f",        // near-black base
        panel: "#15171f",      // cards / surfaces
        edge: "#2b3040",       // borders
        accent: "#c7cedb",     // primary silver (buttons: bg-accent + text-ink)
        accent2: "#93a1b8",    // steel blue secondary
        silver: "#c7cedb",
        silverbright: "#eef1f6",
        steel: "#8792a6",
      },
      keyframes: {
        marquee: { from: { transform: "translateX(0)" }, to: { transform: "translateX(-50%)" } },
        marqueeRev: { from: { transform: "translateX(-50%)" }, to: { transform: "translateX(0)" } },
        glowpulse: {
          "0%,100%": { filter: "drop-shadow(0 0 12px rgba(199,206,219,0.20))" },
          "50%": { filter: "drop-shadow(0 0 26px rgba(199,206,219,0.45))" },
        },
      },
      animation: {
        marquee: "marquee 32s linear infinite",
        marqueeRev: "marqueeRev 32s linear infinite",
        glowpulse: "glowpulse 3.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
