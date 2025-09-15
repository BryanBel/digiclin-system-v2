import { defineConfig } from 'astro/config';
import node from '@astrojs/node'; // Import the node adapter
import react from '@astrojs/react'; 
import tailwindcss from '@astrojs/tailwind';
import icon from 'astro-icon'; 

export default defineConfig({
  // Add the node adapter for SSR
  adapter: node({
    mode: 'middleware' 
  }),
  integrations: [
    react(),
    icon(),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});