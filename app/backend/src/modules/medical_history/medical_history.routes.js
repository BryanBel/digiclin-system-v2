import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import {
  listMedicalHistoryEntries,
  findMedicalHistoryById,
  createMedicalHistoryEntry,
  deleteMedicalHistoryEntry,
} from './medical_history.repository.js';
import {
  listMedicalHistorySchema,
  createMedicalHistorySchema,
  listOwnMedicalHistorySchema,
} from './medical_history.routes.schemas.js';
import { parseDateInput } from '../../utils/dateHelpers.js';
import { ensurePatientForUserRegistration } from '../patients/patients.repository.js';
import { createAttachmentRecord } from './medical_history.attachments.repository.js';

const router = Router();

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.join(moduleDir, '../../..');
const publicDir = path.join(backendRoot, 'public');
const attachmentsDir = path.join(publicDir, 'uploads', 'medical-history');
const attachmentsRelativeBase = 'uploads/medical-history';

const ensureAttachmentsDir = async () => {
  await fs.mkdir(attachmentsDir, { recursive: true });
};

const sanitizeOriginalName = (name) => {
  if (!name || typeof name !== 'string') return 'archivo';
  const trimmed = name.trim().slice(0, 160);
  return trimmed.replace(/[\r\n]+/g, ' ').replace(/[<>:"/\\|?*]+/g, '_') || 'archivo';
};

const allowedMimeTypes = new Set(['application/pdf', 'image/png', 'image/jpeg']);
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_ATTACHMENTS = 5;

const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    try {
      await ensureAttachmentsDir();
      cb(null, attachmentsDir);
    } catch (error) {
      cb(error, attachmentsDir);
    }
  },
  filename: (_req, file, cb) => {
    const extension = path
      .extname(file.originalname || '')
      .slice(0, 8)
      .toLowerCase();
    const uniqueSuffix = crypto.randomUUID();
    const storedName = `mh-${Date.now()}-${uniqueSuffix}${extension}`;
    cb(null, storedName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_ATTACHMENT_SIZE,
    files: MAX_ATTACHMENTS,
  },
  fileFilter: (_req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      const error = new Error('Solo se permiten archivos PDF, PNG o JPG.');
      error.status = 400;
      cb(error);
      return;
    }
    cb(null, true);
  },
});

const handleAttachmentsUpload = (req, res, next) => {
  upload.array('attachments', MAX_ATTACHMENTS)(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError) {
      const message =
        error.code === 'LIMIT_FILE_SIZE'
          ? 'Cada archivo debe pesar menos de 10MB.'
          : error.code === 'LIMIT_FILE_COUNT'
            ? 'Solo puedes adjuntar hasta 5 archivos por registro.'
            : 'No se pudieron procesar los archivos adjuntos.';
      const normalized = new Error(message);
      normalized.status = 400;
      next(normalized);
      return;
    }

    next(error);
  });
};

const cleanupUploadedFiles = async (files) => {
  if (!Array.isArray(files) || !files.length) return;
  await Promise.all(
    files.map((file) =>
      fs.unlink(file.path).catch((error) => {
        console.warn('No se pudo eliminar un archivo adjunto temporal:', file.path, error.message);
      }),
    ),
  );
};

const mapAttachment = (attachment) => {
  if (!attachment) return null;
  return {
    id: attachment.id,
    name: attachment.name ?? attachment.filename ?? 'Archivo adjunto',
    filename: attachment.filename ?? attachment.name ?? 'archivo',
    mimetype: attachment.mimetype ?? null,
    size: attachment.size ?? null,
    url: attachment.url ?? null,
    createdAt: attachment.createdAt ?? null,
    medicalHistoryId: attachment.medicalHistoryId ?? attachment.medical_history_id ?? null,
  };
};

const mapMedicalHistory = (row) => {
  if (!row) return null;

  const entryDateIso = row.entry_date instanceof Date ? row.entry_date.toISOString() : null;

  return {
    id: row.id,
    entryDate: entryDateIso,
    medicalInform: row.medical_inform,
    treatment: row.treatment ?? null,
    recipe: row.recipe ?? null,
    patientId: row.patient_id,
    doctorId: row.doctor_id,
    visitId: row.visit_id,
    patient: row.patient_id
      ? {
          id: row.patient_id,
          name: row.patient_name ?? null,
          documentId: row.patient_document_id ?? null,
          email: row.patient_email ?? null,
          phone: row.patient_phone ?? null,
        }
      : null,
    doctor: row.doctor_id
      ? {
          id: row.doctor_id,
          name: row.doctor_name ?? null,
          email: row.doctor_email ?? null,
        }
      : null,
    attachments: Array.isArray(row.attachments)
      ? row.attachments.map((attachment) => mapAttachment(attachment)).filter(Boolean)
      : [],
  };
};

const ensureRole = (req, res, allowedRoles) => {
  const userRole = typeof req.user?.role === 'string' ? req.user.role.toLowerCase() : '';
  const normalizedAllowedRoles = allowedRoles.map((role) => role.toLowerCase());

  if (!userRole || !normalizedAllowedRoles.includes(userRole)) {
    res.status(403).json({ error: 'Acceso restringido para este recurso.' });
    return false;
  }
  return true;
};

router.get('/', async (req, res, next) => {
  try {
    if (!ensureRole(req, res, ['admin', 'doctor'])) return;

    const query = listMedicalHistorySchema.parse(req.query);
    const entries = await listMedicalHistoryEntries(query);
    res.json({ entries: entries.map(mapMedicalHistory) });
  } catch (error) {
    next(error);
  }
});

router.get('/my', async (req, res, next) => {
  try {
    if (!ensureRole(req, res, ['patient'])) return;

    const query = listOwnMedicalHistorySchema.parse(req.query);
    const patient = await ensurePatientForUserRegistration({
      email: req.user?.email,
      fullName: req.user?.full_name ?? undefined,
    });

    if (!patient) {
      return res.json({ entries: [] });
    }

    const entries = await listMedicalHistoryEntries({
      patientId: patient.id,
      limit: query.limit,
      offset: query.offset,
    });

    res.json({ entries: entries.map(mapMedicalHistory) });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    if (!ensureRole(req, res, ['admin', 'doctor'])) return;

    const entryId = Number(req.params.id);
    if (Number.isNaN(entryId)) {
      return res.status(400).json({ error: 'Identificador inválido.' });
    }

    const entry = await findMedicalHistoryById({ id: entryId });
    if (!entry) {
      return res.status(404).json({ error: 'Historial médico no encontrado.' });
    }

    res.json({ entry: mapMedicalHistory(entry) });
  } catch (error) {
    next(error);
  }
});

router.post('/', handleAttachmentsUpload, async (req, res, next) => {
  try {
    if (!ensureRole(req, res, ['doctor'])) {
      await cleanupUploadedFiles(req.files);
      return;
    }

    const payload = createMedicalHistorySchema.parse(req.body);

    const entryDate = payload.entryDate ? parseDateInput(payload.entryDate) : null;
    if (payload.entryDate && !entryDate) {
      await cleanupUploadedFiles(req.files);
      return res.status(400).json({ error: 'Fecha inválida.' });
    }

    const created = await createMedicalHistoryEntry({
      entryDate,
      medicalInform: payload.medicalInform,
      treatment: payload.treatment,
      recipe: payload.recipe,
      patientId: payload.patientId,
      doctorId: req.user?.id,
      visitId: payload.visitId,
    });

    if (!created) {
      await cleanupUploadedFiles(req.files);
      return res.status(500).json({ error: 'No se pudo crear el historial médico.' });
    }

    const uploadedFiles = Array.isArray(req.files) ? req.files : [];

    try {
      await Promise.all(
        uploadedFiles.map(async (file) => {
          const relativePath = path.posix.join(attachmentsRelativeBase, file.filename);
          const originalName = sanitizeOriginalName(file.originalname);
          await createAttachmentRecord({
            medicalHistoryId: created.id,
            filename: originalName,
            filepath: relativePath,
            mimetype: file.mimetype,
          });
        }),
      );
    } catch (error) {
      await cleanupUploadedFiles(uploadedFiles);
      await deleteMedicalHistoryEntry({ id: created.id });
      throw error;
    }

    const refreshed = await findMedicalHistoryById({ id: created.id });

    res.status(201).json({ entry: mapMedicalHistory(refreshed ?? created) });
  } catch (error) {
    await cleanupUploadedFiles(req.files);
    next(error);
  }
});

router.patch('/:id', (req, res) => {
  if (!ensureRole(req, res, ['doctor'])) return;
  return res.status(405).json({
    error:
      'Los registros del historial son inmutables. Crea un nuevo registro para añadir información.',
  });
});

router.delete('/:id', (req, res) => {
  if (!ensureRole(req, res, ['doctor'])) return;
  return res.status(405).json({
    error:
      'Los registros del historial no pueden eliminarse para preservar la trazabilidad clínica.',
  });
});

export default router;
