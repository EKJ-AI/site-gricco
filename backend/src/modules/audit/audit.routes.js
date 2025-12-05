/**
 * @swagger
 * tags:
 *   name: Audit
 *   description: Logs de auditoria e rastreamento
 */

/**
 * @swagger
 * /api/audit:
 *   get:
 *     summary: Lista os logs de auditoria
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de logs de auditoria
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
 *                       userId:
 *                         type: integer
 *                       action:
 *                         type: string
 *                       entity:
 *                         type: string
 *                       entityId:
 *                         type: integer
 *                       details:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Token inválido ou não enviado
 *       403:
 *         description: Permissão negada
 *       500:
 *         description: Erro interno no servidor
 */

import { Router } from 'express';
import { authenticateToken } from '../auth/auth.middleware.js';
import { authorizePermissions } from '../permission/permissions.middleware.js';
import * as AuditController from './audit.controller.js';
import { auditLog } from './audit.middleware.js';

const router = Router();

router.get(
  '/',
  authenticateToken,
  auditLog,
  // ✅ permission corrigida (existe no seed RBAC)
  authorizePermissions(['audit.read']),
  AuditController.list,
);

export default router;
