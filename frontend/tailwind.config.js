/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'surface-900': '#0f1113',
        'surface-800': '#15171a',
        'surface-700': '#1d2125',
        'gold': '#cc9a1f',
        'muted': '#a39e93',
      },
      fontFamily: {
        sans: ['Inter Tight', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
