/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Gerenciamento de usuários
 */

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     summary: Retorna os dados do usuário autenticado
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dados do usuário autenticado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     profileId:
 *                       type: integer
 *                     profile:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         name:
 *                           type: string
 *                         permissions:
 *                           type: array
 *                           items:
 *                             type: string
 *       401:
 *         description: Token inválido ou não enviado
 *       404:
 *         description: Usuário não encontrado
 *       500:
 *         description: Erro interno no servidor
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Lista todos os usuários com paginação
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Página para paginação (default 1)
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *         description: Tamanho da página (default 10)
 *     responses:
 *       200:
 *         description: Lista paginada de usuários
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     pageSize:
 *                       type: integer
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           name:
 *                             type: string
 *                           email:
 *                             type: string
 *                           profile:
 *                             type: string
 *       401:
 *         description: Token inválido ou não enviado
 *       500:
 *         description: Erro interno no servidor
 */

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Cria um novo usuário
 *     tags: [Users]
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
 *               - email
 *               - password
 *               - profileId
 *             properties:
 *               name:
 *                 type: string
 *                 example: Vanessa Zaremba
 *               email:
 *                 type: string
 *                 format: email
 *                 example: vanessa@teste.com
 *               password:
 *                 type: string
 *                 example: 123456
 *               profileId:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: Usuário criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     profileId:
 *                       type: integer
 *       400:
 *         description: Campos inválidos ou email já cadastrado
 *       401:
 *         description: Token inválido ou não enviado
 *       500:
 *         description: Erro interno no servidor
 */

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Obtém um usuário pelo ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do usuário
 *     responses:
 *       200:
 *         description: Dados do usuário
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     profileId:
 *                       type: integer
 *                     profile:
 *                       type: string
 *       401:
 *         description: Token inválido ou não enviado
 *       404:
 *         description: Usuário não encontrado
 *       500:
 *         description: Erro interno no servidor
 */

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Atualiza um usuário pelo ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do usuário
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - profileId
 *             properties:
 *               name:
 *                 type: string
 *                 example: Vanessa Zaremba
 *               email:
 *                 type: string
 *                 format: email
 *                 example: vanessa@teste.com
 *               password:
 *                 type: string
 *                 example: 123456
 *               profileId:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       200:
 *         description: Usuário atualizado com sucesso
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
 * /api/users/{id}:
 *   delete:
 *     summary: Remove um usuário pelo ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do usuário
 *     responses:
 *       200:
 *         description: Usuário removido com sucesso
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
import * as UserController from './user.controller.js';
import { authenticateToken } from '../auth/auth.middleware.js';
import { authorizePermissions } from '../permission/permissions.middleware.js';
import { body } from 'express-validator';
import { validateRequest } from '../../middlewares/validateRequest.js';
import { auditLog } from '../audit/audit.middleware.js';
import * as userController from './user.controller.js';

const router = Router();

router.get('/me', 
  authenticateToken, 
  //authorizePermissions(['user.read']), 
  userController.getMe
);
router.get(
  '/',
  authenticateToken,
  authorizePermissions(['user.read']),
  UserController.list
);

router.post(
  '/',
  authenticateToken,
  auditLog, // Log de auditoria para requisições POST
  authorizePermissions(['user.create']),
  [
    body('name').notEmpty().withMessage('Nome é obrigatório'),
    body('email').isEmail().withMessage('Email inválido'),
    body('password').isLength({ min: 6 }).withMessage('Senha mínima de 6 caracteres'),
    body('profileId').notEmpty().withMessage('ProfileId obrigatório')
  ],
  validateRequest,
  UserController.create
);

router.get(
  '/:id',
  authenticateToken,
  authorizePermissions(['user.read']),
  UserController.getById
);

router.put(
  '/:id',
  authenticateToken,
  auditLog,
  authorizePermissions(['user.update']),
  UserController.update
);

router.delete(
  '/:id',
  authenticateToken,
  auditLog,
  authorizePermissions(['user.delete']),
  UserController.remove
);

export default router;
