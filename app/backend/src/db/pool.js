import pg from 'pg';

/**
 * Conexion a PostgreSQL.
 *
 * Antes esto probaba SUPABASE_DB_URL_PROD, luego DATABASE_URL, luego
 * SUPABASE_DB_URL_DEV, en un orden que dependia de NODE_ENV. Eso convertia una
 * migracion de proveedor en una trampa: basta con que quede una variable vieja definida
 * en el entorno de despliegue para que gane sobre la nueva, y la aplicacion se conecte en
 * silencio a la base equivocada.
 *
 * Ahora hay una sola variable. El backend usa pg, no un SDK, asi que cualquier
 * PostgreSQL sirve: Neon, Supabase, uno local. El nombre del proveedor no pertenece al
 * nombre de la variable.
 */
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    'Falta DATABASE_URL. Copia app/backend/.env.example a .env y define la cadena de conexion.',
  );
}

const pool = new pg.Pool({ connectionString });

export default pool;
