import { Router } from 'express';
import { authenticateToken } from '../../../auth/auth.middleware.js';
import { auditLog } from '../../../audit/audit.middleware.js';
import {
  registerAccess,
  listByDocument,
  listByDocumentVersion,
} from './documentAccess.controller.js';

const router = Router({ mergeParams: true });

/**
 * 📊 GET – resumo de acessos por DOCUMENTO (todas as versões)
 * GET /api/companies/:companyId/establishments/:establishmentId/documents/:documentId/access-log
 */
router.get(
  '/companies/:companyId/establishments/:establishmentId/documents/:documentId/access-log',
  authenticateToken,
  auditLog,
  listByDocument,
);

/**
 * 📊 GET – resumo de acessos por VERSÃO específica de um documento
 * GET /api/companies/:companyId/establishments/:establishmentId/documents/:documentId/versions/:versionId/access-log
 */
router.get(
  '/companies/:companyId/establishments/:establishmentId/documents/:documentId/versions/:versionId/access-log',
  authenticateToken,
  auditLog,
  listByDocumentVersion,
);

/**
 * 📝 POST – registrar acesso (VIEW/DOWNLOAD) manual, se o frontend precisar
 */
router.post(
  '/companies/:companyId/establishments/:establishmentId/documents/:documentId/access-log',
  authenticateToken,
  auditLog,
  registerAccess,
);

export default router;
