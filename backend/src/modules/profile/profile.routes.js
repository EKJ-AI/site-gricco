import { Router } from 'express';
import * as ProfileController from './profile.controller.js';
import { authenticateToken } from '../auth/auth.middleware.js';
import { authorizePermissions } from '../permission/permissions.middleware.js';
import { body, param } from 'express-validator';
import { validateRequest } from '../../middlewares/validateRequest.js';
import { auditLog } from '../audit/audit.middleware.js';

const router = Router();

router.get(
  '/',
  authenticateToken,
  authorizePermissions(['profile.manage']),
  ProfileController.list
);

router.post(
  '/',
  authenticateToken,
  auditLog,
  authorizePermissions(['profile.manage']),
  [
    body('name').notEmpty().withMessage('Nome é obrigatório'),
    body('description').optional().isString(),
    body('permissions').optional().isArray().withMessage('permissions deve ser um array'),
  ],
  validateRequest,
  ProfileController.create
);

router.put(
  '/:id',
  authenticateToken,
  auditLog,
  authorizePermissions(['profile.manage']),
  [
    param('id').isUUID().withMessage('ID inválido (UUID esperado)'),
    body('name').optional().isString(),
    body('description').optional().isString(),
    body('permissions').optional().isArray().withMessage('permissions deve ser um array'),
  ],
  validateRequest,
  ProfileController.update
);

router.delete(
  '/:id',
  authenticateToken,
  auditLog,
  authorizePermissions(['profile.manage']),
  [param('id').isUUID().withMessage('ID inválido (UUID esperado)')],
  validateRequest,
  ProfileController.remove
);

export default router;
