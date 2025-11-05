import express from 'express';
import * as passwordController from './password.controller.js';
import { auditLog } from '../audit/audit.middleware.js';

const router = express.Router();

router.post('/forgot', passwordController.forgotPassword);

// ✅ AuditLog middleware para registrar tentativas de reset
router.post('/reset', auditLog, passwordController.resetPassword);

export default router;
