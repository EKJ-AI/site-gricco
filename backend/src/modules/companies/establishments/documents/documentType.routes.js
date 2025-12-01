import { Router } from 'express';
import * as ctrl from './documentType.controller.js';
//import authorize from '../../middleware/authorize.js';
import { authenticateToken } from '../../../auth/auth.middleware.js';
import { authorizePermissions } from '../../../permission/permissions.middleware.js';

import { auditLog } from '../../../audit/audit.middleware.js';

const router = Router();

router.get('/',       authenticateToken, authorizePermissions('documentType.read'),   ctrl.list);
router.get('/:id',    authenticateToken, authorizePermissions('documentType.read'),   ctrl.getById);
router.post('/',      authenticateToken, auditLog, authorizePermissions('documentType.create'), ctrl.create);
router.put('/:id',    authenticateToken, auditLog, authorizePermissions('documentType.update'), ctrl.update);
router.delete('/:id', authenticateToken, auditLog, authorizePermissions('documentType.delete'), ctrl.remove);

export default router;
