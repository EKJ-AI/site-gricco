import crypto from 'node:crypto';
import path from 'node:path';

export function sanitizeFilename(name = '') {
  return String(name).replace(/[^\w.\-]+/g, '_').slice(0, 180);
}

export function sha256OfBuffer(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

export function buildStoragePath({ companyId, establishmentId, documentId, versionId, originalName }) {
  const safe = sanitizeFilename(originalName || 'file');
  return path.posix.join(
    '/uploads',
    companyId,
    establishmentId,
    documentId,
    `${versionId}__${safe}`
  );
}
