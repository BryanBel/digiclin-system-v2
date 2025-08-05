import db from './index.js';

const createContactsTable = async () => {
  await db.query('DROP TABLE IF EXISTS contacts');
  await db.query(`
    CREATE TABLE contacts (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL
    )
  `);
  console.log('Tabla de contactos creada');
};

const createUsersTable = async () => {
  await db.query('DROP TABLE IF EXISTS users');
  await db.query(`
    CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    passwordHash TEXT NOT NULL,
    email_verified BOOLEAN DEFAULT false
    )
  `);
  console.log('Tabla de usuarios creada');
};

const createTables = async () => {
  await createContactsTable();
  await createUsersTable();
  console.log('Tablas creadas correctamente');
  process.exit();
};

createTables();
