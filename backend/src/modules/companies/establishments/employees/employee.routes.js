// src/modules/companies/employees/employee.routes.js
import { Router } from 'express';
import * as ctrl from './employee.controller.js';
import { authenticateToken } from '../../../auth/auth.middleware.js';
import { authorizePermissions } from '../../../permission/permissions.middleware.js';

const router = Router({ mergeParams: true });

// helpers para escopo aninhado -> body
const scopeCompanyToBody = (req, _res, next) => {
  req.body = { ...(req.body || {}), companyId: req.params.companyId };
  next();
};
const scopeEstablishmentToBody = (req, _res, next) => {
  req.body = {
    ...(req.body || {}),
    establishmentId: req.params.establishmentId,
  };
  next();
};

// ========== LISTAGENS ==========
/**
 * GET /api/employees/company/:companyId?page=&pageSize=&q=
 */
router.get(
  '/company/:companyId',
  authenticateToken,
  authorizePermissions('employee.read'),
  ctrl.listByCompany
);

/**
 * GET /api/employees/establishment/:establishmentId?page=&pageSize=&q=
 */
router.get(
  '/establishment/:establishmentId',
  authenticateToken,
  authorizePermissions('employee.read'),
  ctrl.listByEstablishment
);

/**
 * GET /api/employees/by-establishment/:establishmentId
 * Alias compatível com o frontend atual
 */
router.get(
  '/by-establishment/:establishmentId',
  authenticateToken,
  authorizePermissions('employee.read'),
  ctrl.listByEstablishment
);

// ========== CRIAÇÃO ==========
router.post(
  '/',
  authenticateToken,
  authorizePermissions('employee.create'),
  ctrl.create
);

router.post(
  '/company/:companyId',
  authenticateToken,
  authorizePermissions('employee.create'),
  scopeCompanyToBody,
  ctrl.create
);

router.post(
  '/establishment/:establishmentId',
  authenticateToken,
  authorizePermissions('employee.create'),
  scopeEstablishmentToBody,
  ctrl.create
);

// ========== CRUD POR ID ==========
router.get(
  '/:id',
  authenticateToken,
  authorizePermissions('employee.read'),
  ctrl.getById
);

router.put(
  '/:id',
  authenticateToken,
  authorizePermissions('employee.update'),
  ctrl.update
);

router.delete(
  '/:id',
  authenticateToken,
  authorizePermissions('employee.delete'),
  ctrl.remove
);

export default router;
