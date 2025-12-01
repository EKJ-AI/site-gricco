// src/modules/companies/documents/document.routes.js
import { Router } from 'express';
import * as ctrl from './document.controller.js';
import * as verCtrl from './documentVersion.controller.js';
import { authenticateToken } from '../../../auth/auth.middleware.js';
import { authorizePermissions } from '../../../permission/permissions.middleware.js';

import { auditLog } from '../../../audit/audit.middleware.js';

const router = Router({ mergeParams: true });

// por estabelecimento (lista documentos)
router.get(
  '/establishment/:establishmentId',
  authenticateToken,
  authorizePermissions('document.read'),
  ctrl.list
);

// item
router.get(
  '/:id',
  authenticateToken,
  authorizePermissions('document.read'),
  ctrl.getById
);
router.post(
  '/',
  authenticateToken,
  auditLog,
  authorizePermissions('document.create'),
  ctrl.create
);
router.put(
  '/:id',
  authenticateToken,
  auditLog,
  authorizePermissions('document.update'),
  ctrl.update
);
router.delete(
  '/:id',
  authenticateToken,
  auditLog,
  authorizePermissions('document.delete'),
  ctrl.remove
);

// trocar versão vigente (rota antiga ainda suportada)
router.put(
  '/:id/current/:versionId',
  authenticateToken,
  auditLog,
  authorizePermissions('document.update'),
  ctrl.setCurrentVersion
);

// --------- NOVO: versões por documento (usado pelo frontend) ---------

// GET /api/documents/:documentId/versions
router.get(
  '/:documentId/versions',
  authenticateToken,
  authorizePermissions('documentVersion.read'),
  (req, res) => verCtrl.list(req, res)
);

// POST /api/documents/:documentId/versions/:versionId/activate
router.post(
  '/:documentId/versions/:versionId/activate',
  authenticateToken,
  auditLog,
  authorizePermissions('documentVersion.activate'),
  (req, res) => verCtrl.activateFromDocument(req, res)
);

// POST /api/documents/:documentId/versions/:versionId/archive
router.post(
  '/:documentId/versions/:versionId/archive',
  authenticateToken,
  auditLog,
  authorizePermissions('documentVersion.archive'),
  (req, res) => verCtrl.archiveFromDocument(req, res)
);

export default router;
