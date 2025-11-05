import { Router } from 'express';
import { body } from 'express-validator';
import * as AuthController from './auth.controller.js';
import { validateRequest } from '../../middlewares/validateRequest.js';
import { auditLog } from '../audit/audit.middleware.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Endpoints de autenticação
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Faz login e retorna um token JWT.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login bem-sucedido, tokens gerados.
 *       400:
 *         description: Dados inválidos.
 *       401:
 *         description: Credenciais inválidas.
 */
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Email inválido'),
    body('password').isLength({ min: 6 }).withMessage('Senha deve ter pelo menos 6 caracteres')
  ],
  validateRequest,
  auditLog,
  AuthController.login
);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Gera novos tokens a partir do refresh token.
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Tokens renovados com sucesso.
 *       400:
 *         description: Refresh token não fornecido.
 *       401:
 *         description: Refresh token inválido ou expirado.
 */
router.post('/refresh', auditLog, AuthController.refresh);


/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Efetua logout, invalida o refresh token e limpa o cookie.
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logout efetuado com sucesso.
 *       401:
 *         description: Não autenticado ou refresh token inválido/ausente.
 *       500:
 *         description: Erro interno no servidor.
 */
router.post('/logout', auditLog, AuthController.logout);

export default router;
