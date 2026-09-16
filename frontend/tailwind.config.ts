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
        focus: "0 0 0 4px rgba(32, 180, 134, 0.18)"
      }
    }
  },
  plugins: []
};

export default config;
