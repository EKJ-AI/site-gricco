import { Router } from 'express';
import { body } from 'express-validator';
import { authenticateToken } from '../auth/auth.middleware.js';
import { authorizePermissions } from '../permission/permissions.middleware.js';
import { auditLog } from '../audit/audit.middleware.js';
import { validateRequest } from '../../middlewares/validateRequest.js';
import * as BlogController from './blog.controller.js';

const router = Router();

/**
 * Rotas públicas (site institucional)
 * - não exigem token
 * - só retornam PUBLISHED
 */

// Lista de posts publicados (paginada)
router.get('/public', BlogController.listPublic);

// Detalhe por slug
router.get('/slug/:slug', BlogController.getBySlug);

/**
 * Rotas autenticadas (admin / interno)
 */

// Listar posts (qualquer status)
router.get(
  '/',
  authenticateToken,
  authorizePermissions(['blog.post.read']),
  BlogController.list,
);

// Obter por ID
router.get(
  '/:id',
  authenticateToken,
  authorizePermissions(['blog.post.read']),
  BlogController.getById,
);

// Criar post
router.post(
  '/',
  authenticateToken,
  auditLog,
  authorizePermissions(['blog.post.create']),
  [
    body('title').notEmpty().withMessage('Título é obrigatório'),
    body('slug').notEmpty().withMessage('Slug é obrigatório'),
  ],
  validateRequest,
  BlogController.create,
);

// Atualizar post
router.put(
  '/:id',
  authenticateToken,
  auditLog,
  authorizePermissions(['blog.post.update']),
  [
    body('title').optional().notEmpty().withMessage('Título não pode ser vazio'),
    body('slug').optional().notEmpty().withMessage('Slug não pode ser vazio'),
  ],
  validateRequest,
  BlogController.update,
);

// Publicar post
router.patch(
  '/:id/publish',
  authenticateToken,
  auditLog,
  authorizePermissions(['blog.post.publish']),
  BlogController.publish,
);

// Despublicar post (volta para DRAFT)
router.patch(
  '/:id/unpublish',
  authenticateToken,
  auditLog,
  authorizePermissions(['blog.post.publish']),
  BlogController.unpublish,
);

// Soft delete
router.delete(
  '/:id',
  authenticateToken,
  auditLog,
  authorizePermissions(['blog.post.delete']),
  BlogController.remove,
);

export default router;
