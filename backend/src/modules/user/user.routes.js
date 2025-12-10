import { Router } from 'express';
import * as UserController from './user.controller.js';
import { authenticateToken } from '../auth/auth.middleware.js';
import { authorizePermissions } from '../permission/permissions.middleware.js';
import { body } from 'express-validator';
import { validateRequest } from '../../middlewares/validateRequest.js';
import { auditLog } from '../audit/audit.middleware.js';

const router = Router();

router.get(
  '/me',
  authenticateToken,
  // authorizePermissions(['user.read']),
  UserController.getMe,
);

router.get(
  '/',
  authenticateToken,
  authorizePermissions(['user.read']),
  UserController.list,
);

router.post(
  '/',
  authenticateToken,
  auditLog, // Log de auditoria para requisições POST
  authorizePermissions(['user.create']),
  [
    body('name').notEmpty().withMessage('Nome é obrigatório'),
    body('email').isEmail().withMessage('Email inválido'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Senha mínima de 6 caracteres'),
    body('profileId')
      .notEmpty()
      .withMessage('ProfileId obrigatório'),
  ],
  validateRequest,
  UserController.create,
);

router.get(
  '/:id',
  authenticateToken,
  authorizePermissions(['user.read']),
  UserController.getById,
);

router.put(
  '/:id',
  authenticateToken,
  auditLog,
  authorizePermissions(['user.update']),
  UserController.update,
);

// Ativar / desativar usuário (usa permissão dedicada)
router.patch(
  '/:id/active',
  authenticateToken,
  auditLog,
  authorizePermissions(['user.active']),
  [
    body('isActive')
      .isBoolean()
      .withMessage('isActive deve ser boolean (true/false)'),
  ],
  validateRequest,
  UserController.setActive,
);

// Soft delete (inativar) – mantém rota DELETE existente
router.delete(
  '/:id',
  authenticateToken,
  auditLog,
  authorizePermissions(['user.delete']),
  UserController.remove,
);

export default router;
