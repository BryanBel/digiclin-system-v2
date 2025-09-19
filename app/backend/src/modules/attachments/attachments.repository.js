import db from '../../db/pool.js';
import fs from 'fs/promises';
import path from 'path';

export const getAttachmentsByMedicalHistoryId = async (medical_history_id) => {
  const result = await db.query('SELECT * FROM attachments WHERE medical_history_id = $1', [
    medical_history_id,
  ]);
  return result.rows;
};

export const createAttachment = async (attachment) => {
  const { filename, filepath, mimetype, medical_history_id } = attachment;
  const result = await db.query(
    'INSERT INTO attachments (filename, filepath, mimetype, medical_history_id) VALUES ($1, $2, $3, $4) RETURNING *',
    [filename, filepath, mimetype, medical_history_id],
  );
  return result.rows[0];
};

export const getAttachmentById = async (id) => {
  const result = await db.query('SELECT * FROM attachments WHERE id = $1', [id]);
  return result.rows[0];
};

export const deleteAttachment = async (id) => {
  const attachment = await getAttachmentById(id);
  if (!attachment) {
    return null;
  }

  const absoluteFilepath = path.join(process.cwd(), attachment.filepath);

  try {
    await fs.unlink(absoluteFilepath);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error(`Failed to delete file from filesystem: ${absoluteFilepath}`, err);
    }
  }

  const result = await db.query('DELETE FROM attachments WHERE id = $1 RETURNING *', [id]);
  return result.rows[0];
};
