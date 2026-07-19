export default {
  plugins: {
    '@tailwindcss/postcss': {},
    // Kept for the non-Tailwind app stylesheets that still rely on PostCSS
    // vendor prefixing; Tailwind 4 prefixes its own output via Lightning CSS.
    autoprefixer: {},
  },
}
