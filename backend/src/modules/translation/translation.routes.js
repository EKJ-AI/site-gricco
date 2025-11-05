// src/modules/translation/translation.routes.js
/**
 * @swagger
 * tags:
 *   name: Translations
 *   description: "Gestão de traduções do site (por cultura e rótulos/keys)"
 */

import { Router } from 'express';
import * as TranslationController from './translation.controller.js';
import { authenticateToken } from '../auth/auth.middleware.js';
import { authorizePermissions } from '../permission/permissions.middleware.js';
import { body, query } from 'express-validator';
import { validateRequest } from '../../middlewares/validateRequest.js';
import { auditLog } from '../audit/audit.middleware.js';

const router = Router();

/**
 * @swagger
 * /api/translations/cultures:
 *   get:
 *     summary: "Lista culturas ativas para traduções"
 *     tags: [Translations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: "Filtro textual por id/description da cultura"
 *     responses:
 *       200:
 *         description: "Lista de culturas"
 *       401:
 *         description: "Token inválido ou não enviado"
 *       500:
 *         description: "Erro interno no servidor"
 */
router.get(
  '/cultures',
  authenticateToken,
  authorizePermissions(['translation.read']),
  TranslationController.listCultures
);

/**
 * @swagger
 * /api/translations:
 *   get:
 *     summary: "Lista traduções (labels) por cultura, com paginação e busca"
 *     tags: [Translations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: cultureId
 *         required: true
 *         schema:
 *           type: string
 *         description: "ID da cultura (ex.: pt-BR)"
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: "Filtro textual por code/key/description"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: "Página para paginação (default 1)"
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 20
 *         description: "Tamanho da página (1..200, default 20)"
 *     responses:
 *       200:
 *         description: "Lista paginada de traduções"
 *       400:
 *         description: "Parâmetros inválidos"
 *       401:
 *         description: "Token inválido ou não enviado"
 *       500:
 *         description: "Erro interno no servidor"
 */
router.get(
  '/',
  authenticateToken,
  authorizePermissions(['translation.read']),
  [
    query('cultureId').notEmpty().withMessage('cultureId é obrigatório'),
    query('page').optional().isInt({ min: 1 }).withMessage('page deve ser inteiro >= 1'),
    query('pageSize').optional().isInt({ min: 1, max: 200 }).withMessage('pageSize deve ser 1..200'),
  ],
  validateRequest,
  TranslationController.list
);

/**
 * @swagger
 * /api/translations/{id}:
 *   get:
 *     summary: "Obtém uma tradução (label) pelo ID"
 *     tags: [Translations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: "Tradução encontrada"
 *       401:
 *         description: "Token inválido ou não enviado"
 *       404:
 *         description: "Tradução não encontrada"
 *       500:
 *         description: "Erro interno no servidor"
 */
router.get(
  '/:id',
  authenticateToken,
  authorizePermissions(['translation.read']),
  TranslationController.getById
);

/**
 * @swagger
 * /api/translations:
 *   post:
 *     summary: "Cria uma nova tradução (label)"
 *     tags: [Translations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - cultureId
 *               - key
 *               - description
 *             properties:
 *               cultureId:
 *                 type: string
 *                 example: "pt-BR"
 *               key:
 *                 type: string
 *                 example: "dashboard.title"
 *               description:
 *                 type: string
 *                 example: "Painel"
 *               code:
 *                 type: string
 *                 example: "DASHBOARD_TITLE"
 *               tutorial:
 *                 type: string
 *                 example: "Texto de ajuda opcional"
 *               version:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: "Tradução criada"
 *       400:
 *         description: "Campos inválidos"
 *       401:
 *         description: "Token inválido ou não enviado"
 *       500:
 *         description: "Erro interno no servidor"
 */
router.post(
  '/',
  authenticateToken,
  auditLog,
  authorizePermissions(['translation.create']),
  [
    body('cultureId').notEmpty().withMessage('cultureId é obrigatório'),
    body('key').notEmpty().withMessage('key é obrigatório'),
    body('description').notEmpty().withMessage('description é obrigatório'),
    body('version').optional().isInt().withMessage('version deve ser inteiro'),
  ],
  validateRequest,
  TranslationController.create
);

/**
 * @swagger
 * /api/translations/{id}:
 *   put:
 *     summary: "Atualiza uma tradução (label) pelo ID"
 *     tags: [Translations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cultureId:
 *                 type: string
 *               key:
 *                 type: string
 *               description:
 *                 type: string
 *               code:
 *                 type: string
 *               tutorial:
 *                 type: string
 *               version:
 *                 type: integer
 *     responses:
 *       200:
 *         description: "Tradução atualizada"
 *       400:
 *         description: "Campos inválidos"
 *       401:
 *         description: "Token inválido ou não enviado"
 *       404:
 *         description: "Tradução não encontrada"
 *       500:
 *         description: "Erro interno no servidor"
 */
router.put(
  '/:id',
  authenticateToken,
  auditLog,
  authorizePermissions(['translation.update']),
  [
    body('version').optional().isInt().withMessage('version deve ser inteiro'),
  ],
  validateRequest,
  TranslationController.update
);

/**
 * @swagger
 * /api/translations/{id}:
 *   delete:
 *     summary: "Remove uma tradução (label) pelo ID"
 *     tags: [Translations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: "Tradução removida"
 *       401:
 *         description: "Token inválido ou não enviado"
 *       404:
 *         description: "Tradução não encontrada"
 *       500:
 *         description: "Erro interno no servidor"
 */
router.delete(
  '/:id',
  authenticateToken,
  auditLog,
  authorizePermissions(['translation.delete']),
  TranslationController.remove
);

export default router;
