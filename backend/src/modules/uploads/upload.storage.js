import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import { sanitizeFilename } from './upload.utils.js';

const ROOT = path.resolve(process.cwd(), 'uploads'); // pasta raiz local

function ensureDirSync(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// Storage que recebe via req.params: companyId, establishmentId, documentId
export const storageDocumentVersion = multer.diskStorage({
  destination: function (req, file, cb) {
    const { companyId, establishmentId, documentId } = req.params;
    const dest = path.join(ROOT, companyId, establishmentId, documentId);
    ensureDirSync(dest);
    cb(null, dest);
  },
  filename: function (req, file, cb) {
    const original = sanitizeFilename(file.originalname);
    // versãoId será conhecida no controller; aqui só salva nome original
    cb(null, original);
  }
});

export const uploadDocumentVersion = multer({
  storage: storageDocumentVersion,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 1,
  }
});
