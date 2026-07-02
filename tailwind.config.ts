import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        display: ["var(--font-space)", "var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        // "forest ink" — sidebar surface family
        ink: {
          DEFAULT: "#111a13",
          soft: "#182219",
          line: "#243126",
        },
      },
    },
  },
  plugins: [],
}

export default config
