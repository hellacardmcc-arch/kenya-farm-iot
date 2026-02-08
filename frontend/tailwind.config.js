/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'farm-green': '#2d5a27',
        'farm-lime': '#4ade80',
        'contrast-ok': '#0d7d0d',
        'contrast-warn': '#b45309',
        'contrast-danger': '#c41e1e',
        'contrast-text': '#1a1a1a',
        'contrast-border': '#e5e5e5',
        'contrast-surface': '#fafaf9',
      },
    },
  },
  plugins: [],
};
