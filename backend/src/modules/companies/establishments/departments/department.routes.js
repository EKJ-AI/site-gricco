import { Router } from 'express';
import * as ctrl from './department.controller.js';
import { authenticateToken } from '../../../auth/auth.middleware.js';
import { authorizePermissions } from '../../../permission/permissions.middleware.js';

const router = Router({ mergeParams: true });

// middleware auxiliar para setar isActive no body
const setActiveFlag = (value) => (req, _res, next) => {
  req.body = { ...(req.body || {}), isActive: value };
  next();
};

// flat: /api/departments?establishmentId=...
router.get(
  '/',
  authenticateToken,
  authorizePermissions('department.read'),
  ctrl.list,
);

router.get(
  '/:id',
  authenticateToken,
  authorizePermissions('department.read'),
  ctrl.getById,
);

router.post(
  '/',
  authenticateToken,
  authorizePermissions('department.create'),
  ctrl.create,
);

router.put(
  '/:id',
  authenticateToken,
  authorizePermissions('department.update'),
  ctrl.update,
);

// soft delete (já implementado no controller.remove)
router.delete(
  '/:id',
  authenticateToken,
  authorizePermissions('department.delete'),
  ctrl.remove,
);

// ativar departamento (isActive = true)
router.post(
  '/:id/activate',
  authenticateToken,
  authorizePermissions('department.update'),
  setActiveFlag(true),
  ctrl.update,
);

// desativar departamento (isActive = false)
router.post(
  '/:id/deactivate',
  authenticateToken,
  authorizePermissions('department.update'),
  setActiveFlag(false),
  ctrl.update,
);

export default router;
