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
        // Kantin brand — sampled from the logo
        coral: {
          50: "#fdf2ef",
          100: "#fbe3dc",
          200: "#f7c8bb",
          300: "#f1a48f",
          400: "#ed8266",
          500: "#e96047", // logo background
          600: "#d54e35",
          700: "#b23f2a", // text-safe on white
          800: "#8f3423",
          900: "#752c1f",
        },
        leaf: {
          50: "#f5faec",
          100: "#e7f4d2",
          200: "#cfe9a9",
          300: "#b1da7c",
          400: "#97cc57",
          500: "#80c048", // logo leaf green
          600: "#67a437",
          700: "#4f7f2a", // text-safe on white
          800: "#406423",
          900: "#365420",
        },
      },
    },
  },
  plugins: [],
}

export default config
