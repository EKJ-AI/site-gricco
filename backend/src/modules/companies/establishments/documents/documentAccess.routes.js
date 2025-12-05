// src/modules/companies/establishments/documents/documentAccess.routes.js
import { Router } from 'express';
import { authenticateToken } from '../../../auth/auth.middleware.js';
import { auditLog } from '../../../audit/audit.middleware.js';
import { registerAccess } from './documentAccess.controller.js';

const router = Router({ mergeParams: true });

// POST /api/companies/:companyId/establishments/:establishmentId/documents/:documentId/access-log
router.post(
  '/companies/:companyId/establishments/:establishmentId/documents/:documentId/access-log',
  authenticateToken,
  auditLog,
  registerAccess
);

export default router;
