import { type Config } from "tailwindcss";
import { fontFamily } from "tailwindcss/defaultTheme";

export default {
  content: ["./src/**/*.tsx"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", ...fontFamily.sans],
      },
      keyframes: {
        pulse2: {
          "0%": { opacity: "1" },
          [`${((2.5 / 4 / 2) * 100).toFixed(2)}%`]: { opacity: ".81" },
          [`${((2.5 / 4) * 100).toFixed(2)}%`]: { opacity: "1" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        pulse2: "pulse2 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
