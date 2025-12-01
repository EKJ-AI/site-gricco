import { Router } from 'express';
import * as ctrl from './department.controller.js';
import { authenticateToken } from '../../../auth/auth.middleware.js';
import { authorizePermissions } from '../../../permission/permissions.middleware.js';

const router = Router({ mergeParams: true });

// flat: /api/departments?establishmentId=...
router.get('/', authenticateToken, authorizePermissions('department.read'), ctrl.list);
router.get('/:id', authenticateToken, authorizePermissions('department.read'), ctrl.getById);
router.post('/', authenticateToken, authorizePermissions('department.create'), ctrl.create);
router.put('/:id', authenticateToken, authorizePermissions('department.update'), ctrl.update);
router.delete('/:id', authenticateToken, authorizePermissions('department.delete'), ctrl.remove);

export default router;