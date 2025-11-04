// app/frontend/tailwind.config.mjs
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{astro,html,js,jsx,md,mdx,svelte,vue,tsx,ts}',
  ],
  theme: {
    extend: {
      colors: {
        'zoom-blue': '#2D8CFF',
        'zoom-dark': '#174EA6',
        'zoom-light': '#F6F8FA',
        'zoom-gray': '#E3E8EE',
        'zoom-text': '#1A1A1A',
      },
    },
  },
  plugins: [],
};