/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc7fb',
          400: '#38aaf6',
          500: '#0e8fe6',
          600: '#0270c4',
          700: '#03599f',
          800: '#074c83',
          900: '#0c3f6d',
          950: '#082848',
        }
      }
    },
  },
  plugins: [],
}
