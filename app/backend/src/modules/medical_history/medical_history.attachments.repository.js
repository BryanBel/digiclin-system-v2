import pool from '../../db/pool.js';

const mapAttachmentRow = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    filename: row.filename,
    filepath: row.filepath,
    mimetype: row.mimetype,
    medical_history_id: row.medical_history_id,
    created_at: row.created_at,
  };
};

export const createAttachmentRecord = async ({
  medicalHistoryId,
  filename,
  filepath,
  mimetype,
}) => {
  const query = `
    INSERT INTO attachments (filename, filepath, mimetype, medical_history_id)
    VALUES ($1, $2, $3, $4)
    RETURNING id, filename, filepath, mimetype, medical_history_id, created_at
  `;

  const params = [filename, filepath, mimetype, medicalHistoryId];
  const { rows } = await pool.query(query, params);
  return mapAttachmentRow(rows?.[0] ?? null);
};

export const listAttachmentsForMedicalHistories = async ({ ids }) => {
  if (!Array.isArray(ids) || !ids.length) {
    return new Map();
  }

  const query = `
    SELECT id, filename, filepath, mimetype, medical_history_id, created_at
    FROM attachments
    WHERE medical_history_id = ANY($1::int[])
    ORDER BY created_at DESC, id DESC
  `;

  const { rows } = await pool.query(query, [ids]);
  const grouped = new Map();

  rows.forEach((row) => {
    const normalized = mapAttachmentRow(row);
    if (!normalized) return;
    const existing = grouped.get(normalized.medical_history_id) ?? [];
    existing.push(normalized);
    grouped.set(normalized.medical_history_id, existing);
  });

  return grouped;
};

export const listAttachmentsForMedicalHistory = async ({ medicalHistoryId }) => {
  const grouped = await listAttachmentsForMedicalHistories({ ids: [medicalHistoryId] });
  return grouped.get(medicalHistoryId) ?? [];
};
