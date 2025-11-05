/**
 * @swagger
 * tags:
 *   name: Permissions
 *   description: Gerenciamento de permissões
 */

/**
 * @swagger
 * /api/permissions:
 *   get:
 *     summary: Lista todas as permissões
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de permissões
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
 * /api/permissions:
 *   post:
 *     summary: Cria uma nova permissão
 *     tags: [Permissions]
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
 *                 example: permission.manage
 *     responses:
 *       201:
 *         description: Permissão criada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 permission:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     name:
 *                       type: string
 *       400:
 *         description: Campo inválido
 *       401:
 *         description: Token inválido ou não enviado
 *       500:
 *         description: Erro interno no servidor
 */

/**
 * @swagger
 * /api/permissions/{id}:
 *   delete:
 *     summary: Remove uma permissão pelo ID
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID da permissão
 *     responses:
 *       200:
 *         description: Permissão removida com sucesso
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

router.post(
  '/',
  authenticateToken,
  auditLog, // Log de auditoria para requisições POST
  authorizePermissions(['permission.manage']),
  [
    body('name').notEmpty().withMessage('Nome é obrigatório')
  ],
  validateRequest,
  PermissionController.create
);

router.delete(
  '/:id',
  authenticateToken,
  auditLog,
  authorizePermissions(['permission.manage']),
  PermissionController.remove
);

export default router;
