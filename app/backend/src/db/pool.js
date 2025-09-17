import pg from 'pg';
const pool = new pg.Pool({
  connectionString:
    process.env.NODE_ENV === 'dev'
      ? process.env.SUPABASE_DB_URL_DEV
      : process.env.SUPABASE_DB_URL_PROD,
});
export default pool;
