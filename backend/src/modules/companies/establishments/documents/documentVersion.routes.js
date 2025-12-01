import { Router } from 'express';
import * as ctrl from './documentVersion.controller.js';
//import authorize from '../../middleware/authorize.js';
import { authenticateToken } from '../../../auth/auth.middleware.js';
import { authorizePermissions } from '../../../permission/permissions.middleware.js';
import { uploadDocumentVersion } from '../../../uploads/upload.storage.js';

import { auditLog } from '../../../audit/audit.middleware.js';

const router = Router({ mergeParams: true });

// histórico por documento
router.get('/document/:documentId', authenticateToken, authorizePermissions('documentVersion.read'), ctrl.list);

// upload nova versão
router.post(
  '/:companyId/:establishmentId/:documentId/upload',
  authenticateToken, auditLog, authorizePermissions('documentVersion.create'),
  uploadDocumentVersion.single('file'),
  ctrl.uploadNew
);

// item
router.get('/:id', authenticateToken, authorizePermissions('documentVersion.read'), ctrl.getById);

// estado
router.put('/:id/archive',  authenticateToken, auditLog, authorizePermissions('documentVersion.archive'), ctrl.archive);
router.put('/:id/activate', authenticateToken, auditLog, authorizePermissions('documentVersion.activate'), ctrl.activate);

export default router;
