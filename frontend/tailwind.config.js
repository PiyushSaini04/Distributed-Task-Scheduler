/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#0f1419',
          raised: '#1a1f26',
          overlay: '#242b33',
        },
        border: {
          DEFAULT: '#2d3748',
        },
      },
    },
  },
  plugins: [],
};
