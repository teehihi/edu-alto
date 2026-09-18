import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#20B486",
          dark: "#1A906B",
          soft: "#EAFFF9"
        },
        heading: "#101A2C",
        ink: "#101828",
        muted: "#667085",
        footer: "#F5FBF9",
        "footer-secondary": "#EAF7F3",
        "footer-divider": "#DDEFE9",
        feature: {
          yellow: "#F5C34D",
          coral: "#F4866D",
          rose: "#C77A9A"
        }
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      boxShadow: {
        xs: "0 1px 2px rgba(16, 24, 40, 0.05)",
        soft: "0 12px 16px -4px rgba(16, 24, 40, 0.08), 0 4px 6px -2px rgba(16, 24, 40, 0.03)",
        card: "0 14px 35px rgba(16, 24, 40, 0.09)",
        cardHover: "0 20px 40px rgba(16, 24, 40, 0.14)",
        focus: "0 0 0 4px rgba(32, 180, 134, 0.18)"
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" }
        },
        floatSlow: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(6px)" }
        }
      },
      animation: {
        float: "float 4s ease-in-out infinite",
        floatSlow: "floatSlow 5s ease-in-out infinite"
      }
    }
  },
  plugins: []
};

export default config;
