import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    root: './',
    include: ['src/**/*.spec.ts', 'test/**/*.e2e-spec.ts'],
    // Los tests nunca tocan Neon: la BD real se sustituye por PGlite en memoria.
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgres://tests-use-pglite@localhost/unused',
    },
  },
});
