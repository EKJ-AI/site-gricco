// src/modules/catalogs/catalog.routes.js
import { Router } from 'express';
import * as ctrl from './catalog.controller.js';
import { authenticateToken } from '../../../auth/auth.middleware.js';
import { authorizePermissions } from '../../../permission/permissions.middleware.js';
import { auditLog } from '../../../audit/audit.middleware.js';

const router = Router();

/**
 * GET /api/catalogs/cnaes?q=&page=1&pageSize=10
 */
router.get(
  '/cnaes',
  authenticateToken,
  authorizePermissions('catalog.read'),
  ctrl.searchCNAE
);

/**
 * GET /api/catalogs/cbos?q=&page=1&pageSize=10
 */
router.get(
  '/cbos',
  authenticateToken,
  authorizePermissions('catalog.read'),
  ctrl.searchCBO
);

/**
 * GET /api/catalogs/cep/:cep
 */
router.get(
  '/cep/:cep',
  authenticateToken,
  auditLog,
  authorizePermissions('catalog.read'),
  ctrl.getCEP
);

/**
 * GET /api/catalogs/cnpj/:cnpj
 */
router.get(
  '/cnpj/:cnpj',
  authenticateToken,
  auditLog,
  authorizePermissions('catalog.read'),
  ctrl.getCNPJ
);

export default router;
