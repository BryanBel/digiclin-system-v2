import { Client } from 'pg';
const connectionString = process.env.SUPSUPABASE_DB_URL;
const db = new Client({ connectionString });
await db.connect();
export default db;
