/** @type {import('tailwindcss').Config} */
const v = (name) => `var(--${name})`;
const tokens = [
  "canvas",
  "surface",
  "subtle",
  "hover",
  "line",
  "line-strong",
  "divider",
  "ink",
  "body",
  "muted",
  "faint",
  "accent",
  "accent-hover",
  "accent-soft",
  "accent-tint",
  "on-accent",
  "danger",
  "danger-soft",
  "warn-soft",
  "warn",
  "ok-soft",
  "ok-line",
  "ok-ink",
  "ok-muted",
  "dev-bg",
  "dev-fg",
  "active-bg",
  "active-fg",
  "retired-bg",
  "retired-fg",
  "scrim",
];

export default {
  content: ["./src/mainview/**/*.{html,js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: Object.fromEntries(tokens.map((t) => [t, v(t)])),
      fontFamily: {
        sans: ['"IBM Plex Sans"', "system-ui", "sans-serif"],
        mono: ['"IBM Plex Mono"', "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
