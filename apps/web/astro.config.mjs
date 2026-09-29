// @ts-check
import node from '@astrojs/node';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, envField } from 'astro/config';

const API_DEV_URL = 'http://localhost:3000';

export default defineConfig({
  output: 'server',
  // En produccion la web la sirve la API (apps/api/src/web.ts): un solo proceso, un solo origen.
  adapter: node({ mode: 'middleware' }),
  integrations: [react()],
  env: {
    schema: {
      // Donde el servidor de Astro llama a la API durante el SSR. El navegador siempre usa /api
      // relativo (mismo origen). En produccion es el mismo proceso: http://127.0.0.1:$PORT.
      // 'secret' no porque sea secreta, sino porque asi Astro la lee en runtime y no la
      // incrusta al compilar (Render asigna el puerto al arrancar).
      API_INTERNAL_URL: envField.string({
        context: 'server',
        access: 'secret',
        default: API_DEV_URL,
      }),
    },
  },
  vite: {
    plugins: [tailwindcss()],
    server: {
      // Desarrollo: /api se reenvia a Nest, asi el navegador ve un solo origen (como en produccion).
      proxy: { '/api': { target: API_DEV_URL } },
    },
  },
});
