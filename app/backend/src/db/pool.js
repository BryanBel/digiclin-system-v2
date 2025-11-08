import pg from 'pg';

const resolveConnectionString = () => {
  const isDev = process.env.NODE_ENV === 'dev';
  if (isDev) {
    return (
      process.env.SUPABASE_DB_URL_DEV ||
      process.env.DATABASE_URL ||
      process.env.SUPABASE_DB_URL_PROD ||
      ''
    );
  }

  return (
    process.env.SUPABASE_DB_URL_PROD ||
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DB_URL_DEV ||
    ''
  );
};

const connectionString = resolveConnectionString();

if (!connectionString) {
  console.error('Database connection string is not defined. Check environment variables.');
}

const pool = new pg.Pool({ connectionString });

export default pool;
