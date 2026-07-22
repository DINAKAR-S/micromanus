import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0b0d12",
        panel: "#12151d",
        edge: "#232838",
        accent: "#6d5efc",
        accent2: "#22d3ee",
      },
    },
  },
  plugins: [],
} satisfies Config;
