import pool from '../../db/pool.js';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { listAttachmentsForMedicalHistories } from './medical_history.attachments.repository.js';

const BASE_SELECT = `
  SELECT
    mh.id,
    mh.entry_date,
    mh.medical_inform,
    mh.treatment,
    mh.recipe,
    mh.patient_id,
    mh.doctor_id,
    mh.visit_id,
    p.full_name AS patient_name,
    p.document_id AS patient_document_id,
    p.email AS patient_email,
    p.phone AS patient_phone,
    u.full_name AS doctor_name,
    u.email AS doctor_email
  FROM medical_history mh
  LEFT JOIN patients p ON p.id = mh.patient_id
  LEFT JOIN users u ON u.id = mh.doctor_id
`;

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.join(moduleDir, '../../..');
const publicDir = path.join(backendRoot, 'public');

const normalizeRelativePath = (candidate) => {
  if (!candidate) return '';
  return candidate.replace(/^\/+/, '').replace(/\\+/g, '/');
};

const buildPublicUrl = (relativePath) => `/${normalizeRelativePath(relativePath)}`;

const resolveAttachmentAbsolutePath = (relativePath) => {
  const segments = normalizeRelativePath(relativePath)
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean);
  return path.join(publicDir, ...segments);
};

const mapAttachmentRowToResponse = async (row) => {
  if (!row) return null;
  const relativePath = normalizeRelativePath(row.filepath);
  const absolutePath = resolveAttachmentAbsolutePath(relativePath);

  let size = null;
  try {
    const stats = await fs.stat(absolutePath);
    size = stats.size ?? null;
  } catch (error) {
    console.warn('No se pudo obtener el tamaño del adjunto:', relativePath, error.message);
  }

  return {
    id: row.id,
    name: row.filename,
    filename: row.filename,
    mimetype: row.mimetype,
    createdAt:
      row.created_at instanceof Date ? row.created_at.toISOString() : (row.created_at ?? null),
    size,
    url: buildPublicUrl(relativePath),
    filepath: relativePath,
    medicalHistoryId: row.medical_history_id,
  };
};

const hydrateAttachments = async (entries) => {
  if (!Array.isArray(entries) || !entries.length) {
    return entries;
  }

  const ids = entries
    .map((entry) => entry?.id)
    .filter((id) => typeof id === 'number' && Number.isInteger(id));

  if (!ids.length) {
    return entries.map((entry) => ({ ...entry, attachments: [] }));
  }

  const attachmentsByHistory = await listAttachmentsForMedicalHistories({ ids });

  const enriched = await Promise.all(
    entries.map(async (entry) => {
      const rawAttachments = attachmentsByHistory.get(entry.id) ?? [];
      const mapped = await Promise.all(
        rawAttachments.map((raw) => mapAttachmentRowToResponse(raw)),
      );
      return {
        ...entry,
        attachments: mapped.filter(Boolean),
      };
    }),
  );

  return enriched;
};

const resolveVisitId = async (visitId) => {
  if (visitId === null || visitId === undefined) {
    return null;
  }

  if (typeof visitId === 'string' && !visitId.trim()) {
    return null;
  }

  if (visitId === 'null' || visitId === 'undefined') {
    return null;
  }

  const numericId = Number(visitId);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    const error = new Error('La visita asociada no es válida.');
    error.status = 400;
    throw error;
  }

  const { rows } = await pool.query('SELECT id FROM visits WHERE id = $1 LIMIT 1', [numericId]);
  const existing = rows?.[0]?.id ?? null;

  if (!existing) {
    const error = new Error('La visita asociada no existe o ya fue eliminada.');
    error.status = 400;
    throw error;
  }

  return existing;
};

const mapMedicalHistoryRow = (row) => {
  if (!row) return null;

  return {
    id: row.id,
    entry_date: row.entry_date,
    medical_inform: row.medical_inform,
    treatment: row.treatment ?? null,
    recipe: row.recipe ?? null,
    patient_id: row.patient_id,
    doctor_id: row.doctor_id,
    visit_id: row.visit_id,
    patient_name: row.patient_name ?? null,
    patient_document_id: row.patient_document_id ?? null,
    patient_email: row.patient_email ?? null,
    patient_phone: row.patient_phone ?? null,
    doctor_name: row.doctor_name ?? null,
    doctor_email: row.doctor_email ?? null,
    attachments: [],
  };
};

export const listMedicalHistoryEntries = async ({ search, patientId, limit = 50, offset = 0 }) => {
  const filters = [];
  const params = [];
  let paramIndex = 1;

  if (search) {
    filters.push(`(
      p.full_name ILIKE $${paramIndex}
      OR COALESCE(p.document_id, '') ILIKE $${paramIndex}
      OR COALESCE(p.email, '') ILIKE $${paramIndex}
      OR COALESCE(p.phone, '') ILIKE $${paramIndex}
      OR COALESCE(mh.medical_inform, '') ILIKE $${paramIndex}
      OR COALESCE(mh.treatment, '') ILIKE $${paramIndex}
      OR COALESCE(mh.recipe, '') ILIKE $${paramIndex}
      OR COALESCE(u.full_name, '') ILIKE $${paramIndex}
    )`);
    params.push(`%${search}%`);
    paramIndex += 1;
  }

  if (patientId) {
    filters.push(`mh.patient_id = $${paramIndex}`);
    params.push(patientId);
    paramIndex += 1;
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const limitPlaceholder = `$${paramIndex}`;
  params.push(limit ?? 50);
  paramIndex += 1;

  const offsetPlaceholder = `$${paramIndex}`;
  params.push(offset ?? 0);

  const query = `
    ${BASE_SELECT}
    ${whereClause}
    ORDER BY mh.entry_date DESC, mh.id DESC
    LIMIT ${limitPlaceholder}
    OFFSET ${offsetPlaceholder}
  `;

  const { rows } = await pool.query(query, params);
  const mapped = rows.map(mapMedicalHistoryRow);
  return hydrateAttachments(mapped);
};

export const findMedicalHistoryById = async ({ id }) => {
  const query = `${BASE_SELECT} WHERE mh.id = $1`;
  const { rows } = await pool.query(query, [id]);
  const mapped = mapMedicalHistoryRow(rows[0]);
  const [withAttachments] = await hydrateAttachments(mapped ? [mapped] : []);
  return withAttachments ?? null;
};

export const createMedicalHistoryEntry = async ({
  entryDate,
  medicalInform,
  treatment,
  recipe,
  patientId,
  doctorId,
  visitId,
}) => {
  const resolvedVisitId = await resolveVisitId(visitId);

  const insertQuery = `
    INSERT INTO medical_history (
      entry_date,
      medical_inform,
      treatment,
      recipe,
      patient_id,
      doctor_id,
      visit_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id
  `;

  const insertParams = [
    entryDate ?? new Date(),
    medicalInform,
    treatment ?? null,
    recipe ?? null,
    patientId,
    doctorId ?? null,
    resolvedVisitId,
  ];

  const { rows } = await pool.query(insertQuery, insertParams);
  const createdId = rows?.[0]?.id;
  if (!createdId) return null;
  return findMedicalHistoryById({ id: createdId });
};

export const updateMedicalHistoryEntry = async ({
  id,
  entryDate,
  medicalInform,
  treatment,
  recipe,
  visitId,
}) => {
  const fields = [];
  const params = [];
  let paramIndex = 1;

  if (entryDate !== undefined) {
    fields.push(`entry_date = $${paramIndex}`);
    params.push(entryDate ?? null);
    paramIndex += 1;
  }

  if (medicalInform !== undefined) {
    fields.push(`medical_inform = $${paramIndex}`);
    params.push(medicalInform);
    paramIndex += 1;
  }

  if (treatment !== undefined) {
    fields.push(`treatment = $${paramIndex}`);
    params.push(treatment ?? null);
    paramIndex += 1;
  }

  if (recipe !== undefined) {
    fields.push(`recipe = $${paramIndex}`);
    params.push(recipe ?? null);
    paramIndex += 1;
  }

  if (visitId !== undefined) {
    const resolvedVisitId = visitId === null ? null : await resolveVisitId(visitId);
    fields.push(`visit_id = $${paramIndex}`);
    params.push(resolvedVisitId);
    paramIndex += 1;
  }

  if (!fields.length) {
    return findMedicalHistoryById({ id });
  }

  params.push(id);

  const updateQuery = `
    UPDATE medical_history
    SET ${fields.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING id
  `;

  const { rows } = await pool.query(updateQuery, params);
  const updatedId = rows?.[0]?.id;
  if (!updatedId) return null;
  return findMedicalHistoryById({ id: updatedId });
};

export const deleteMedicalHistoryEntry = async ({ id }) => {
  const { rows } = await pool.query('DELETE FROM medical_history WHERE id = $1 RETURNING id', [id]);
  return Boolean(rows?.[0]?.id);
};
