import db from '../../db/index.js';

const addOne = async (payload) => {
  const response = await db.query(
    `
    INSERT INTO users (email, passwordHash)
    VALUES ($1, $2) RETURNING *
  `,
    [payload.email, payload.passwordHash],
  );
  return response.rows[0];
};

const usersRepository = {
  addOne,
};

export default usersRepository;
