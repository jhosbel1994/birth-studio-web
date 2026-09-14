/** @type {import('tailwindcss').Config} */
// Config de la LANDING pública (index.html). El sistema interno (sistema/)
// tiene su propia config. Compilar con:
//   sistema/node_modules/.bin/tailwindcss -c tailwind.config.js -i css/landing-src.css -o css/landing.css --minify
module.exports = {
  darkMode: 'class',
  content: ['./index.html'],
  theme: {
    extend: {
      colors: {
        surface: '#fafafa',
        'surface-container': '#f4f4f5',
        'surface-container-high': '#e4e4e7',
        'surface-container-lowest': '#ffffff',
        primary: '#111113',
        'on-primary': '#ffffff',
        secondary: '#71717a',
        'on-surface': '#18181b',
        'on-surface-variant': '#52525b',
        outline: '#e4e4e7',
        'outline-subtle': '#f1f1f4',
        accent: '#e60000',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        price: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
      },
      letterSpacing: {
        tighter: '-0.04em',
        tight: '-0.025em',
        normal: '-0.01em',
        wide: '0.04em',
        wider: '0.08em',
        widest: '0.14em',
      },
    },
  },
  plugins: [],
}
