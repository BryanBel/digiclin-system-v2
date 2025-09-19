import { defineConfig } from 'astro/config';
import node from '@astrojs/node'; // Import the node adapter
import react from '@astrojs/react';
import icon from 'astro-icon';
import tailwind from '@tailwindcss/vite';

export default defineConfig({
  // Especifica explícitamente que la salida es para un servidor (SSR).
  output: 'server',
  // Añado el adaptador SSR
  adapter: node({
    mode: 'middleware' 
  }),
  integrations: [
    react(),
    icon()
  ],
  vite: {
    plugins: [tailwind()],
  },
});