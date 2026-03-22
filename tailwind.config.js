/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0a0d1a',
        surface: '#0d1120',
        cyan: { DEFAULT: '#22d3ee', hover: '#06b6d4' },
        amber: { DEFAULT: '#fbbf24' },
        coral: { DEFAULT: '#f87171' },
        purple: { DEFAULT: '#a78bfa' },
      },
      textColor: {
        primary: '#e2e8f0',
        secondary: '#94a3b8',
        muted: '#475569',
      },
    },
  },
  plugins: [],
};
