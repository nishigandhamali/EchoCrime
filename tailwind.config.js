/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { 950: '#04060d', 900: '#070b17', 800: '#0b1226', 700: '#111a33', 600: '#1a2545' },
        blood: { DEFAULT: '#e11d48', glow: '#ff3b5c', dim: '#7f1230' },
        volt: { DEFAULT: '#38bdf8', glow: '#7dd3fc', dim: '#0c4a6e' },
        paper: '#e8e4d8',
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
