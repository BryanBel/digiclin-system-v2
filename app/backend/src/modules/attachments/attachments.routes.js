import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import {
  createAttachment,
  getAttachmentsByMedicalHistoryId,
  getAttachmentById,
  deleteAttachment,
} from './attachments.repository.js';

const router = Router();

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

// GET all attachments for a medical history entry
router.get('/medical-history/:medicalHistoryId/attachments', async (req, res, next) => {
  try {
    const attachments = await getAttachmentsByMedicalHistoryId(req.params.medicalHistoryId);
    res.json(attachments);
  } catch (error) {
    next(error);
  }
});

// POST a new attachment to a medical history entry
router.post(
  '/medical-history/:medicalHistoryId/attachments',
  upload.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
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
  },
);

// GET a specific attachment by its ID and allow download
router.get('/attachments/:id', async (req, res, next) => {
  try {
    const attachment = await getAttachmentById(req.params.id);
    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found.' });
    }
    // The filepath is relative to the project root, so we need to construct the absolute path
    const absoluteFilepath = path.join(process.cwd(), attachment.filepath);
    res.download(absoluteFilepath, attachment.filename);
  } catch (error) {
    next(error);
  }
});

// DELETE an attachment
router.delete(
  '/medical-history/:medicalHistoryId/attachments/:attachmentId',
  async (req, res, next) => {
    try {
      const { attachmentId } = req.params;
      await deleteAttachment(attachmentId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
);

export default router;
