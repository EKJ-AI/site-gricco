// src/modules/companies/documents/documentVersion.routes.js
import { Router } from 'express';
import * as ctrl from './documentVersion.controller.js';
import { authenticateToken } from '../../../auth/auth.middleware.js';
import { authorizePermissions } from '../../../permission/permissions.middleware.js';
import { uploadDocumentVersion } from '../../../uploads/upload.storage.js';
import { auditLog } from '../../../audit/audit.middleware.js';

const router = Router({ mergeParams: true });

/**
 * IMPORTANTE:
 * Este router deve ser montado em algo como:
 *
 *   app.use(
 *     '/api/companies/:companyId/establishments/:establishmentId/documents/:documentId/versions',
 *     router,
 *   );
 *
 * Assim, companyId / establishmentId / documentId chegam via params (mergeParams: true)
 */

/**
 * GET /api/companies/:companyId/establishments/:establishmentId/documents/:documentId/versions
 * Lista versões de um documento
 */
router.get(
  '/',
  authenticateToken,
  authorizePermissions('documentVersion.read'),
  ctrl.list,
);

/**
 * POST /api/companies/:companyId/establishments/:establishmentId/documents/:documentId/versions
 * Upload de nova versão (campo de arquivo: "file")
 */
router.post(
  '/',
  authenticateToken,
  auditLog,
  authorizePermissions('documentVersion.create'),
  uploadDocumentVersion.single('file'),
  ctrl.uploadNew,
);

/**
 * GET /api/companies/:companyId/establishments/:establishmentId/documents/:documentId/versions/:versionId
 * Detalhe de uma versão específica
 */
router.get(
  '/:versionId',
  authenticateToken,
  authorizePermissions('documentVersion.read'),
  ctrl.getById,
);

/**
 * PUT /api/companies/:companyId/establishments/:establishmentId/documents/:documentId/versions/:versionId/archive
 * Arquiva uma versão (se for a vigente, desativa o documento)
 */
router.put(
  '/:versionId/archive',
  authenticateToken,
  auditLog,
  authorizePermissions('documentVersion.archive'),
  ctrl.archiveFromDocument,
);

/**
 * POST /api/companies/:companyId/establishments/:establishmentId/documents/:documentId/versions/:versionId/activate
 * Ativa uma versão (arquiva as demais e marca como currentVersion)
 */
router.post(
  '/:versionId/activate',
  authenticateToken,
  auditLog,
  authorizePermissions('documentVersion.activate'),
  ctrl.activateFromDocument,
);

/**
 * GET /api/companies/:companyId/establishments/:establishmentId/documents/:documentId/versions/:versionId/file?mode=view|download
 * Acesso ao arquivo físico com registro em DocumentAccessLog (VIEW / DOWNLOAD)
 */
router.get(
  '/:versionId/file',
  authenticateToken,
  //authorizePermissions('document.read'),
  // ❌ antes tinha authorizePermissions('document.read')
  // ✅ agora o ctrl.accessFile faz toda a verificação (RBAC + colaborador)
  ctrl.accessFile,
);

export default router;
