import { defineConfig } from 'astro/config';
import node from '@astrojs/node'; // Import the node adapter
import react from '@astrojs/react';
import icon from 'astro-icon';
import tailwind from '@tailwindcss/vite';

export default defineConfig({
  // Add the node adapter for SSR
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