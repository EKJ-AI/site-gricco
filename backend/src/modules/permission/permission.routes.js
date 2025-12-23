// src/modules/permission/permission.routes.js
import { Router } from 'express';
import * as PermissionController from './permission.controller.js';
import { authenticateToken } from '../auth/auth.middleware.js';
import { authorizePermissions } from './permissions.middleware.js';
import { body } from 'express-validator';
import { validateRequest } from '../../middlewares/validateRequest.js';
import { auditLog } from '../audit/audit.middleware.js';

const router = Router();

router.get(
  '/',
  authenticateToken,
  authorizePermissions(['permission.manage']),
  PermissionController.list
);

router.get(
  '/:id',
  authenticateToken,
  authorizePermissions(['permission.manage']),
  PermissionController.getById
);

router.post(
  '/',
  authenticateToken,
  auditLog,
  authorizePermissions(['permission.manage']),
  [body('name').notEmpty().withMessage('Nome é obrigatório')],
  validateRequest,
  PermissionController.create
);

router.put(
  '/:id',
  authenticateToken,
  auditLog,
  authorizePermissions(['permission.manage']),
  [body('name').notEmpty().withMessage('Nome é obrigatório')],
  validateRequest,
  PermissionController.update
);

router.delete(
  '/:id',
  authenticateToken,
  auditLog,
  authorizePermissions(['permission.manage']),
  PermissionController.remove
);

export default router;
