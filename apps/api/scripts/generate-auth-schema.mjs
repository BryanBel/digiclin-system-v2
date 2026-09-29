// Regenera src/db/schema/auth.ts con el CLI de Better Auth y lo ajusta a las convenciones
// del proyecto. Uso: pnpm --filter @digiclin/api auth:schema
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const apiDir = path.resolve(import.meta.dirname, '..');
const target = path.join(apiDir, 'src/db/schema/auth.ts');

execSync(
  'pnpm exec auth generate --config src/auth/auth.cli.ts --output src/db/schema/auth.ts --yes',
  {
    cwd: apiDir,
    stdio: 'inherit',
  },
);

const generated = readFileSync(target, 'utf8')
  // timestamptz: los instantes no deben depender de la zona horaria del servidor.
  .replace(/timestamp\("([a-z_]+)"\)/g, 'timestamp("$1", { withTimezone: true })');

writeFileSync(
  target,
  '// GENERADO por `pnpm auth:schema` (CLI de Better Auth). No editar a mano.\n' +
    '// Ajuste aplicado por scripts/generate-auth-schema.mjs: timestamps con zona horaria.\n' +
    generated,
);

execSync(`pnpm exec prettier --write ${JSON.stringify(target)}`, {
  cwd: path.resolve(apiDir, '../..'),
  stdio: 'inherit',
});
