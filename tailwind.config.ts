import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        night: "#0D0B1B",
        dusk: "#151326",
        panel: "#1C1930",
        haze: "#292442",
        line: "#332E49",
        lineStrong: "#51496D",
        mist: "#C1BDD3",
        paper: "#F6F3FF",
        // Aksen merah untuk aksi utama dan status aktif.
        clix: "#C82333",
        clixDeep: "#A61E2A",
        clixText: "#FF6672",
        // Rating tetap emas supaya angka skor tidak bersaing dengan aksi.
        gold: "#FFC83D",
        // Pink hanya untuk titik huruf "i" pada wordmark.
        brand: "#FF4F8B",
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', "system-ui", "sans-serif"],
        sans: ['"Instrument Sans"', "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "0.625rem",
        panel: "1rem",
      },
      boxShadow: {
        raise: "0 24px 48px -32px rgba(9, 8, 26, 0.95)",
      },
      transitionTimingFunction: {
        out: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
