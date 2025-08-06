/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e6f3f3',
          100: '#b3d9da',
          200: '#80bfbf',
          300: '#4da5a5',
          400: '#268a8b',
          500: '#0F6769',
          600: '#0d5759',
          700: '#0a4749',
          800: '#073638',
          900: '#042628',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
      boxShadow: {
        'gsp': '0 10px 15px -3px rgba(15, 103, 105, 0.1), 0 4px 6px -2px rgba(15, 103, 105, 0.05)',
      }
    },
  },
  plugins: [],
} 