/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx,html}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'heading': ['Caveat', 'Brush Script MT', 'Lucida Handwriting', 'cursive'],
        'body': ['Kalam', 'Comic Sans MS', 'Trebuchet MS', 'sans-serif'],
        'handwriting': ['Gaegu', 'Comic Sans MS', 'Courier New', 'monospace']
      },
      colors: {
        'artsy-bg': '#fff7e0',
        'text-color': '#5d4037',
        'heading-color': '#e65100',
        'sub-heading-color': '#00695c',
        'accent-orange': '#ffcc80',
        'accent-peach': '#ffab91',
        'accent-teal': '#4db6ac',
        'accent-light-teal': '#b2dfdb',
      }
    },
  },
  plugins: [],
} 