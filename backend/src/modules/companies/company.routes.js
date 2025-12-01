// src/modules/companies/company.routes.js
import { Router } from 'express';
import * as ctrl from './company.controller.js';
import { authenticateToken } from '../auth/auth.middleware.js';
import { authorizePermissions } from '../permission/permissions.middleware.js';
import establishmentChildRoutes from './establishments/establishment.child.routes.js';
import { auditLog } from '../audit/audit.middleware.js';

const router = Router();

router.get(
  '/',
  authenticateToken,
  authorizePermissions('company.read'),
  ctrl.list
);

router.get(
  '/:id',
  authenticateToken,
  authorizePermissions('company.read'),
  ctrl.getById
);

router.post(
  '/',
  authenticateToken,
  auditLog,
  authorizePermissions('company.create'),
  ctrl.create
);

router.put(
  '/:id',
  authenticateToken,
  auditLog,
  authorizePermissions('company.update'),
  ctrl.update
);

router.delete(
  '/:id',
  authenticateToken,
  auditLog,
  authorizePermissions('company.delete'),
  ctrl.remove
);

// /api/companies/:companyId/establishments/...
router.use(
  '/:companyId/establishments',
  establishmentChildRoutes
);

export default router;
