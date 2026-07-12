import type { Config } from "tailwindcss";

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
          50:  "#F5E8F1",
          100: "#E5C4D9",
          200: "#C998B6",
          300: "#A56F92",
          400: "#7E4D74",
          500: "#5C2253",
          600: "#45183F",
          700: "#321131",
          800: "#2D0F2A",
          900: "#1F0A1D",
          950: "#140711",
        },
        muted: {
          50:  "#F4ECF1",
          100: "#E5D2DF",
          200: "#D2B5C9",
          300: "#B98FAC",
          400: "#8B5E82",
          500: "#7A4F71",
          600: "#694060",
          700: "#52314B",
          800: "#3F2639",
          900: "#2A1926",
        },
        accent: {
          50:  "#FCF3E2",
          100: "#F8E1B5",
          200: "#F2CB85",
          300: "#EFB560",
          400: "#E4A03F",
          500: "#D08F30",
          600: "#C88A33",
          700: "#A06D26",
          800: "#75501C",
          900: "#4D3412",
        },
        cream: {
          50:  "#FBF6ED",
          100: "#F4EBD9",
          200: "#EADBC4",
          300: "#D9C2A0",
          400: "#BFA279",
          500: "#A0855A",
          600: "#7D6644",
        },
      },
      fontFamily: {
        sans: ["Inter", "var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Bebas Neue", "sans-serif"],
        "display-bold": ["var(--font-display-bold)", "Anton", "sans-serif"],
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #45183F 0%, #694060 100%)",
        "brand-accent-gradient": "linear-gradient(135deg, #E4A03F 0%, #D08F30 100%)",
      },
      animation: {
        "pulse-glow": "pulseGlow 2.4s ease-in-out infinite",
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": {
            boxShadow:
              "0 4px 0 rgb(160 109 38), 0 0 0 0 rgba(228, 160, 63, 0.4)",
          },
          "50%": {
            boxShadow:
              "0 4px 0 rgb(160 109 38), 0 0 0 8px rgba(228, 160, 63, 0)",
          },
        },
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;
