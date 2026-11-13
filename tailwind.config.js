/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  // One app-wide light/dark toggle (src/lib/theme.tsx) stamps `data-mode`
  // on <html> — not the OS `prefers-color-scheme` Tailwind's default
  // "media" strategy reads.
  darkMode: ["selector", '[data-mode="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
