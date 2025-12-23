import { Router } from 'express';
import { body } from 'express-validator';
import * as AuthController from './auth.controller.js';
import { validateRequest } from '../../middlewares/validateRequest.js';
import { auditLog } from '../audit/audit.middleware.js';

const router = Router();

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Email inválido'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Senha deve ter pelo menos 6 caracteres'),
  ],
  validateRequest,
  auditLog,
  AuthController.login,
);

router.post('/refresh', auditLog, AuthController.refresh);

router.post('/logout', auditLog, AuthController.logout);

export default router;
