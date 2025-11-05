/**
 * @swagger
 * tags:
 *   name: Profiles
 *   description: Gerenciamento de perfis
 */

/**
 * @swagger
 * /api/profiles:
 *   get:
 *     summary: Lista todos os perfis
 *     tags: [Profiles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de perfis
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *       401:
 *         description: Token inválido ou não enviado
 *       500:
 *         description: Erro interno no servidor
 */

/**
 * @swagger
 * /api/profiles:
 *   post:
 *     summary: Cria um novo perfil
 *     tags: [Profiles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: Administrador
 *     responses:
 *       201:
 *         description: Perfil criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 profile:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     name:
 *                       type: string
 *       400:
 *         description: Campos inválidos
 *       401:
 *         description: Token inválido ou não enviado
 *       500:
 *         description: Erro interno no servidor
 */

/**
 * @swagger
 * /api/profiles/{id}:
 *   put:
 *     summary: Atualiza um perfil pelo ID
 *     tags: [Profiles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do perfil
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: Administrador Atualizado
 *     responses:
 *       200:
 *         description: Perfil atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Campos inválidos
 *       401:
 *         description: Token inválido ou não enviado
 *       500:
 *         description: Erro interno no servidor
 */

/**
 * @swagger
 * /api/profiles/{id}:
 *   delete:
 *     summary: Remove um perfil pelo ID
 *     tags: [Profiles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do perfil
 *     responses:
 *       200:
 *         description: Perfil removido com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: Token inválido ou não enviado
 *       500:
 *         description: Erro interno no servidor
 */

import { Router } from 'express';
import * as ProfileController from './profile.controller.js';
import { authenticateToken } from '../auth/auth.middleware.js';
import { authorizePermissions } from '../permission/permissions.middleware.js';
import { body } from 'express-validator';
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
    body('name').notEmpty().withMessage('Nome é obrigatório')
  ],
  validateRequest,
  ProfileController.create
);

router.put(
  '/:id',
  authenticateToken,
  auditLog,
  authorizePermissions(['profile.manage']),
  ProfileController.update
);

router.delete(
  '/:id',
  authenticateToken,
  auditLog,
  authorizePermissions(['profile.manage']),
  ProfileController.remove
);

export default router;
