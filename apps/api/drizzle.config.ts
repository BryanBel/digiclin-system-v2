import { defineConfig } from 'drizzle-kit';

try {
  process.loadEnvFile();
} catch {
  // Sin .env: se usan las variables del entorno (CI, Render).
}

if (!process.env.DATABASE_URL) {
  throw new Error('Falta DATABASE_URL. Copia apps/api/.env.example a apps/api/.env.');
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_URL },
  casing: 'snake_case',
  strict: true,
  verbose: true,
});
