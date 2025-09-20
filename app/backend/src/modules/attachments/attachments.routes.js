import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import {
  createAttachment,
  getAttachmentsByMedicalHistoryId,
  deleteAttachment,
} from './attachments.repository.js';

// Habilitamos mergeParams para que este router pueda acceder a los parámetros
// de la ruta padre (ej: /medical-history/:medicalHistoryId)
const router = Router({ mergeParams: true });

// Configure multer for file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

// GET /api/medical-history/:medicalHistoryId/attachments
router.get('/', async (req, res, next) => {
  try {
    const attachments = await getAttachmentsByMedicalHistoryId(req.params.medicalHistoryId);
    res.json(attachments);
  } catch (error) {
    next(error);
  }
});

// POST /api/medical-history/:medicalHistoryId/attachments
router.post('/', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Ningun archivo se ha subido.' });
    }

    const { filename, mimetype } = req.file;
    const filepath = `public/uploads/${filename}`; // Store relative path
    const medical_history_id = req.params.medicalHistoryId;

    const newAttachment = await createAttachment({
      filename,
      filepath,
      mimetype,
      medical_history_id,
    });

    res.status(201).json(newAttachment);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/medical-history/:medicalHistoryId/attachments/:attachmentId
router.delete('/:attachmentId', async (req, res, next) => {
  try {
    const { attachmentId } = req.params;
    await deleteAttachment(attachmentId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
