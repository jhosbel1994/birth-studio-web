/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        birth: {
          red: '#e8000d',
          black: '#0a0a0a',
          white: '#ffffff',
          gray: '#f5f5f5',
          'gray-2': '#e8e8e8',
          'gray-3': '#aaaaaa',
          'gray-4': '#666666',
        },
      },
      fontFamily: {
        barlow: ['"Barlow Condensed"', 'sans-serif'],
        dm: ['"DM Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
