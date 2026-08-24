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
      boxShadow: {
        glass: '0 8px 32px rgba(10,10,10,0.08)',
        'glass-sm': '0 4px 16px rgba(10,10,10,0.06)',
        'glass-dark': '0 8px 32px rgba(0,0,0,0.35)',
        glow: '0 0 24px rgba(232,0,13,0.35)',
      },
    },
  },
  plugins: [],
}
