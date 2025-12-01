import { Router } from 'express';
import prisma from '../../../../prisma/client.js';

import * as estCtrl from './establishment.controller.js';
import * as deptCtrl from './departments/department.controller.js';
import * as empCtrl from './employees/employee.controller.js';
import * as docCtrl from './documents/document.controller.js';
import * as verCtrl from './documents/documentVersion.controller.js';

import { authenticateToken } from '../../auth/auth.middleware.js';
import { authorizePermissions } from '../../permission/permissions.middleware.js';

const router = Router({ mergeParams: true });

/**
 * Middlewares de vínculo e injeção de IDs
 */
async function bindCompany(req, res, next) {
  const { companyId } = req.params;
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true },
  });
  if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
  req.ctx = { ...(req.ctx || {}), company };
  return next();
}

async function bindEstablishment(req, res, next) {
  const { companyId, establishmentId } = req.params;
  const est = await prisma.establishment.findUnique({
    where: { id: establishmentId },
    select: { id: true, companyId: true },
  });
  if (!est) return res.status(404).json({ success: false, message: 'Establishment not found' });
  if (est.companyId !== companyId) {
    return res.status(400).json({ success: false, message: 'Establishment does not belong to this Company' });
  }
  req.ctx = { ...(req.ctx || {}), establishment: est };
  return next();
}

// injeta companyId/establishmentId no body quando necessário (POST/PUT)
function injectIdsToBody(req, _res, next) {
  const { companyId, establishmentId } = req.params;
  req.body = req.body || {};
  if (companyId && !req.body.companyId) req.body.companyId = companyId;
  if (establishmentId && !req.body.establishmentId) req.body.establishmentId = establishmentId;
  return next();
}

// ---------------------- Establishments (da Company) ----------------------
// LIST: /api/companies/:companyId/establishments
router.get(
  '/',
  authenticateToken,
  authorizePermissions('establishment.read'),
  bindCompany,
  estCtrl.list // já lê companyId de req.params
);

// CREATE: /api/companies/:companyId/establishments
router.post(
  '/',
  authenticateToken,
  authorizePermissions('establishment.create'),
  bindCompany,
  injectIdsToBody,
  estCtrl.create
);

// GET one: /api/companies/:companyId/establishments/:establishmentId
router.get(
  '/:establishmentId',
  authenticateToken,
  authorizePermissions('establishment.read'),
  bindCompany,
  bindEstablishment,
  estCtrl.getById
);

// UPDATE: /api/companies/:companyId/establishments/:establishmentId
router.put(
  '/:establishmentId',
  authenticateToken,
  authorizePermissions('establishment.update'),
  bindCompany,
  bindEstablishment,
  injectIdsToBody,
  estCtrl.update
);

// DELETE: /api/companies/:companyId/establishments/:establishmentId
router.delete(
  '/:establishmentId',
  authenticateToken,
  authorizePermissions('establishment.delete'),
  bindCompany,
  bindEstablishment,
  estCtrl.remove
);

// ---------------------- Departments (sempre do Establishment) ----------------------
// LIST: /:companyId/establishments/:establishmentId/departments
router.get(
  '/:establishmentId/departments',
  authenticateToken,
  authorizePermissions('department.read'),
  bindCompany,
  bindEstablishment,
  (req, res) => deptCtrl.list(req, res) // controller já espera establishmentId em params/query
);

// CREATE
router.post(
  '/:establishmentId/departments',
  authenticateToken,
  authorizePermissions('department.create'),
  bindCompany,
  bindEstablishment,
  injectIdsToBody,
  (req, res) => deptCtrl.create(req, res)
);

// GET/PUT/DELETE by id
router.get(
  '/:establishmentId/departments/:id',
  authenticateToken,
  authorizePermissions('department.read'),
  bindCompany,
  bindEstablishment,
  (req, res) => deptCtrl.getById(req, res)
);
router.put(
  '/:establishmentId/departments/:id',
  authenticateToken,
  authorizePermissions('department.update'),
  bindCompany,
  bindEstablishment,
  injectIdsToBody,
  (req, res) => deptCtrl.update(req, res)
);
router.delete(
  '/:establishmentId/departments/:id',
  authenticateToken,
  authorizePermissions('department.delete'),
  bindCompany,
  bindEstablishment,
  (req, res) => deptCtrl.remove(req, res)
);

// ---------------------- Employees (sempre do Establishment) ----------------------
// LIST: /:companyId/establishments/:establishmentId/employees
router.get(
  '/:establishmentId/employees',
  authenticateToken,
  authorizePermissions('employee.read'),
  bindCompany,
  bindEstablishment,
  (req, res) => empCtrl.listByEstablishment(req, res)
);

// CREATE
router.post(
  '/:establishmentId/employees',
  authenticateToken,
  authorizePermissions('employee.create'),
  bindCompany,
  bindEstablishment,
  injectIdsToBody,
  (req, res) => empCtrl.create(req, res) // controller aceita ids via params/body
);

// GET/PUT/DELETE por employeeId (param esperado: :id no controller)
router.get(
  '/:establishmentId/employees/:id',
  authenticateToken,
  authorizePermissions('employee.read'),
  bindCompany,
  bindEstablishment,
  (req, res) => empCtrl.getById(req, res)
);
router.put(
  '/:establishmentId/employees/:id',
  authenticateToken,
  authorizePermissions('employee.update'),
  bindCompany,
  bindEstablishment,
  injectIdsToBody,
  (req, res) => empCtrl.update(req, res)
);
router.delete(
  '/:establishmentId/employees/:id',
  authenticateToken,
  authorizePermissions('employee.delete'),
  bindCompany,
  bindEstablishment,
  (req, res) => empCtrl.remove(req, res)
);

// ---------------------- Documents (sempre do Establishment) ----------------------
// LIST: /:companyId/establishments/:establishmentId/documents
router.get(
  '/:establishmentId/documents',
  authenticateToken,
  authorizePermissions('document.read'),
  bindCompany,
  bindEstablishment,
  (req, res) => docCtrl.list(req, res)
);

// CREATE
router.post(
  '/:establishmentId/documents',
  authenticateToken,
  authorizePermissions('document.create'),
  bindCompany,
  bindEstablishment,
  injectIdsToBody,
  (req, res) => docCtrl.create(req, res)
);

// GET/PUT/DELETE doc (param :id no controller)
router.get(
  '/:establishmentId/documents/:id',
  authenticateToken,
  authorizePermissions('document.read'),
  bindCompany,
  bindEstablishment,
  (req, res) => docCtrl.getById(req, res)
);
router.put(
  '/:establishmentId/documents/:id',
  authenticateToken,
  authorizePermissions('document.update'),
  bindCompany,
  bindEstablishment,
  injectIdsToBody,
  (req, res) => docCtrl.update(req, res)
);
router.delete(
  '/:establishmentId/documents/:id',
  authenticateToken,
  authorizePermissions('document.delete'),
  bindCompany,
  bindEstablishment,
  (req, res) => docCtrl.remove(req, res)
);

// ---------------------- Document Versions (sempre do Establishment) ----------------------
router.get(
  '/:establishmentId/documents/:documentId/versions',
  authenticateToken,
  authorizePermissions('documentVersion.read'),
  bindCompany,
  bindEstablishment,
  (req, res) => verCtrl.listByDocument(req, res)
);

router.post(
  '/:establishmentId/documents/:documentId/versions',
  authenticateToken,
  authorizePermissions('documentVersion.create'),
  bindCompany,
  bindEstablishment,
  injectIdsToBody,
  (req, res) => verCtrl.create(req, res)
);

router.post(
  '/:establishmentId/documents/:documentId/versions/:versionId/activate',
  authenticateToken,
  authorizePermissions('documentVersion.activate'),
  bindCompany,
  bindEstablishment,
  (req, res) => verCtrl.activate(req, res)
);

router.post(
  '/:establishmentId/documents/:documentId/versions/:versionId/archive',
  authenticateToken,
  authorizePermissions('documentVersion.archive'),
  bindCompany,
  bindEstablishment,
  (req, res) => verCtrl.archive(req, res)
);

export default router;
