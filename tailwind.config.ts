import type { Config } from "tailwindcss";

// Tokens da identidade ZDK Ingressos (manual da marca v1.0):
// Preto Palco + Grafite (surface) · Ouro ZDK (accent) · Prata/Gelo (cream)
// Os nomes são semânticos — trocar a marca = trocar os valores aqui e no globals.css.
const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/emails/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          50:  "#F1F2F4",
          100: "#DFE1E6",
          200: "#C2C6CE",
          300: "#9BA0AB",
          400: "#6B7180",
          500: "#2A2F3B",
          600: "#1D2029",
          700: "#16181F",
          800: "#0D0E12",
          900: "#08090C",
          950: "#050608",
        },
        muted: {
          50:  "#F2F3F5",
          100: "#E2E4E8",
          200: "#C5C8CF",
          300: "#A6A8AB",
          400: "#8A8F9A",
          500: "#6E7480",
          600: "#2A2F3B",
          700: "#20242E",
          800: "#181B23",
          900: "#101218",
        },
        accent: {
          50:  "#FBF3DF",
          100: "#F6E4B8",
          200: "#EFD08A",
          300: "#F0C25E",
          400: "#D9A63F",
          500: "#C08F2B",
          600: "#A2761F",
          700: "#7C5A16",
          800: "#573E0E",
          900: "#332406",
        },
        cream: {
          50:  "#FFFFFF",
          100: "#FAFAF9",
          200: "#F4F4F2",
          300: "#C9CBCE",
          400: "#A6A8AB",
          500: "#7E8187",
          600: "#5B5E64",
        },
      },
      fontFamily: {
        sans: ["Inter", "var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Arial Black", "sans-serif"],
        "display-bold": ["var(--font-display)", "Arial Black", "sans-serif"],
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #16181F 0%, #2A2F3B 100%)",
        "brand-accent-gradient": "linear-gradient(135deg, #F0C25E 0%, #D9A63F 100%)",
      },
      animation: {
        "pulse-glow": "pulseGlow 2.4s ease-in-out infinite",
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": {
            boxShadow:
              "0 4px 0 rgb(124 90 22), 0 0 0 0 rgba(217, 166, 63, 0.4)",
          },
          "50%": {
            boxShadow:
              "0 4px 0 rgb(124 90 22), 0 0 0 8px rgba(217, 166, 63, 0)",
          },
        },
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;
