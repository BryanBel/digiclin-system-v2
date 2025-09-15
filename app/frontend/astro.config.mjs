// app/frontend/astro.config.mjs
import { defineConfig } from 'astro/config';
import node from '@astrojs/node'; // Import the node adapter
import react from '@astrojs/react'; // If you use React
import tailwindcss from '@astrojs/tailwind'; // If you use Tailwind
import icon from 'astro-icon'; // If you use astro-icon

export default defineConfig({
  // Add the node adapter for SSR
  adapter: node({
    mode: 'middleware' // or 'lambda'
  }),
  integrations: [
    react(), // if you use React
    icon(), // if you use astro-icon
  ],
  // Other Astro configurations...
  vite: {
    plugins: [tailwindcss()],
  },
    // Make sure 'astro-icon' and other necessary plugins are correctly configured
});