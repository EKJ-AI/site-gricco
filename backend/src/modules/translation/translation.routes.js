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

// ❌ REMOVIDO: rotas públicas em outro router (/api/public/i18n/*)

// ---------- CULTURES (ADMIN) ----------
/**
 * @swagger
 * /api/translations/cultures:
 *   post:
 *     summary: "Cria uma cultura (idioma)"
 *     tags: [Translations]
 *     security: [ { bearerAuth: [] } ]
 */
router.post(
  '/cultures',
  authenticateToken,
  authorizePermissions('translation.create'),
  TranslationController.createCulture
);

/**
 * @swagger
 * /api/translations/cultures/{id}:
 *   put:
 *     summary: "Atualiza uma cultura"
 *     tags: [Translations]
 *     security: [ { bearerAuth: [] } ]
 */
router.put(
  '/cultures/:id',
  authenticateToken,
  authorizePermissions('translation.update'),
  TranslationController.updateCulture
);

/**
 * @swagger
 * /api/translations/cultures/{id}:
 *   delete:
 *     summary: "Remove uma cultura (se não tiver labels vinculados)"
 *     tags: [Translations]
 *     security: [ { bearerAuth: [] } ]
 */
router.delete(
  '/cultures/:id',
  authenticateToken,
  authorizePermissions('translation.delete'),
  TranslationController.deleteCulture
);

// Lista culturas (ADMIN)
router.get(
  '/cultures',
  authenticateToken,
  authorizePermissions('translation.read'),
  TranslationController.listCultures
);

// ---------- LABELS (ADMIN) ----------
/**
 * @swagger
 * /api/translations:
 *   get:
 *     summary: "Lista traduções (labels) por cultura, com paginação e busca"
 *     tags: [Translations]
 *     security: [ { bearerAuth: [] } ]
 */
router.get(
  '/',
  authenticateToken,
  authorizePermissions('translation.read'),
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
 *     security: [ { bearerAuth: [] } ]
 */
router.get(
  '/:id',
  authenticateToken,
  authorizePermissions('translation.read'),
  TranslationController.getById
);

/**
 * @swagger
 * /api/translations:
 *   post:
 *     summary: "Cria uma nova tradução (label)"
 *     tags: [Translations]
 *     security: [ { bearerAuth: [] } ]
 */
router.post(
  '/',
  authenticateToken,
  auditLog,
  authorizePermissions('translation.create'),
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
 *     security: [ { bearerAuth: [] } ]
 */
router.put(
  '/:id',
  authenticateToken,
  auditLog,
  authorizePermissions('translation.update'),
  [ body('version').optional().isInt().withMessage('version deve ser inteiro') ],
  validateRequest,
  TranslationController.update
);

/**
 * @swagger
 * /api/translations/{id}:
 *   delete:
 *     summary: "Remove uma tradução (label) pelo ID"
 *     tags: [Translations]
 *     security: [ { bearerAuth: [] } ]
 */
router.delete(
  '/:id',
  authenticateToken,
  auditLog,
  authorizePermissions('translation.delete'),
  TranslationController.remove
);

export default router;
