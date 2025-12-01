// src/modules/companies/establishments/establishment.child.routes.js
import { Router } from 'express';
import prisma from '../../../../prisma/client.js';

import * as estCtrl from './establishment.controller.js';
import * as deptCtrl from './departments/department.controller.js';
import * as empCtrl from './employees/employee.controller.js';
import * as docCtrl from './documents/document.controller.js';
import * as verCtrl from './documents/documentVersion.controller.js';
import * as relCtrl from './documents/documentRelation.controller.js';

import { authenticateToken } from '../../auth/auth.middleware.js';
import { authorizePermissions } from '../../permission/permissions.middleware.js';
import { uploadDocumentVersion } from '../../uploads/upload.storage.js';

import { auditLog } from '../../audit/audit.middleware.js';

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
  if (!company) {
    return res
      .status(404)
      .json({ success: false, message: 'Company not found' });
  }
  req.ctx = { ...(req.ctx || {}), company };
  return next();
}

async function bindEstablishment(req, res, next) {
  const { companyId, establishmentId } = req.params;
  const est = await prisma.establishment.findUnique({
    where: { id: establishmentId },
    select: { id: true, companyId: true },
  });
  if (!est) {
    return res
      .status(404)
      .json({ success: false, message: 'Establishment not found' });
  }
  if (est.companyId !== companyId) {
    return res.status(400).json({
      success: false,
      message: 'Establishment does not belong to this Company',
    });
  }
  req.ctx = { ...(req.ctx || {}), establishment: est };
  return next();
}

// garante que o documento pertence ao estabelecimento da rota
async function bindDocument(req, res, next) {
  const { establishmentId } = req.params;
  const documentId = req.params.documentId || req.params.id;

  if (!documentId) {
    return next();
  }

  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    select: { id: true, establishmentId: true },
  });

  if (!doc) {
    return res
      .status(404)
      .json({ success: false, message: 'Document not found' });
  }

  if (doc.establishmentId !== establishmentId) {
    return res.status(400).json({
      success: false,
      message: 'Document does not belong to this Establishment',
    });
  }

  req.ctx = { ...(req.ctx || {}), document: doc };
  return next();
}

// injeta companyId/establishmentId no body quando necessário (POST/PUT)
function injectIdsToBody(req, _res, next) {
  const { companyId, establishmentId } = req.params;
  req.body = req.body || {};
  if (companyId && !req.body.companyId) req.body.companyId = companyId;
  if (establishmentId && !req.body.establishmentId) {
    req.body.establishmentId = establishmentId;
  }
  return next();
}

// ---------------------- Establishments (da Company) ----------------------
// LIST: /api/companies/:companyId/establishments
router.get(
  '/',
  authenticateToken,
  authorizePermissions('establishment.read'),
  bindCompany,
  estCtrl.list // já lê companyId de req.params/query
);

// CREATE: /api/companies/:companyId/establishments
router.post(
  '/',
  authenticateToken,
  auditLog,
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
  auditLog,
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
  auditLog,
  authorizePermissions('establishment.delete'),
  bindCompany,
  bindEstablishment,
  estCtrl.remove
);

// ---------------------- Departments (sempre do Establishment) ----------------------
router.get(
  '/:establishmentId/departments',
  authenticateToken,
  authorizePermissions('department.read'),
  bindCompany,
  bindEstablishment,
  (req, res) => deptCtrl.list(req, res)
);

router.post(
  '/:establishmentId/departments',
  authenticateToken,
  auditLog,
  authorizePermissions('department.create'),
  bindCompany,
  bindEstablishment,
  injectIdsToBody,
  (req, res) => deptCtrl.create(req, res)
);

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
  auditLog,
  authorizePermissions('department.update'),
  bindCompany,
  bindEstablishment,
  injectIdsToBody,
  (req, res) => deptCtrl.update(req, res)
);

router.delete(
  '/:establishmentId/departments/:id',
  authenticateToken,
  auditLog,
  authorizePermissions('department.delete'),
  bindCompany,
  bindEstablishment,
  (req, res) => deptCtrl.remove(req, res)
);

// ---------------------- Employees (sempre do Establishment) ----------------------
router.get(
  '/:establishmentId/employees',
  authenticateToken,
  authorizePermissions('employee.read'),
  bindCompany,
  bindEstablishment,
  (req, res) => empCtrl.listByEstablishment(req, res)
);

router.post(
  '/:establishmentId/employees',
  authenticateToken,
  auditLog,
  authorizePermissions('employee.create'),
  bindCompany,
  bindEstablishment,
  injectIdsToBody,
  (req, res) => empCtrl.create(req, res)
);

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
  auditLog,
  authorizePermissions('employee.update'),
  bindCompany,
  bindEstablishment,
  injectIdsToBody,
  (req, res) => empCtrl.update(req, res)
);

router.delete(
  '/:establishmentId/employees/:id',
  authenticateToken,
  auditLog,
  authorizePermissions('employee.delete'),
  bindCompany,
  bindEstablishment,
  (req, res) => empCtrl.remove(req, res)
);

// ---------------------- Documents (sempre do Establishment) ----------------------
router.get(
  '/:establishmentId/documents',
  authenticateToken,
  authorizePermissions('document.read'),
  bindCompany,
  bindEstablishment,
  (req, res) => docCtrl.list(req, res)
);

router.post(
  '/:establishmentId/documents',
  authenticateToken,
  auditLog,
  authorizePermissions('document.create'),
  bindCompany,
  bindEstablishment,
  injectIdsToBody,
  (req, res) => docCtrl.create(req, res)
);

router.get(
  '/:establishmentId/documents/:id',
  authenticateToken,
  authorizePermissions('document.read'),
  bindCompany,
  bindEstablishment,
  bindDocument,
  (req, res) => docCtrl.getById(req, res)
);

router.put(
  '/:establishmentId/documents/:id',
  authenticateToken,
  auditLog,
  authorizePermissions('document.update'),
  bindCompany,
  bindEstablishment,
  bindDocument,
  injectIdsToBody,
  (req, res) => docCtrl.update(req, res)
);

router.delete(
  '/:establishmentId/documents/:id',
  authenticateToken,
  auditLog,
  authorizePermissions('document.delete'),
  bindCompany,
  bindEstablishment,
  bindDocument,
  (req, res) => docCtrl.remove(req, res)
);

// ---------------------- Document Versions (sempre do Establishment) ----------------------
router.get(
  '/:establishmentId/documents/:documentId/versions',
  authenticateToken,
  authorizePermissions('documentVersion.read'),
  bindCompany,
  bindEstablishment,
  bindDocument,
  (req, res) => verCtrl.list(req, res)
);

router.post(
  '/:establishmentId/documents/:documentId/versions',
  authenticateToken,
  auditLog,
  authorizePermissions('documentVersion.create'),
  bindCompany,
  bindEstablishment,
  bindDocument,
  uploadDocumentVersion.single('file'),
  (req, res) => verCtrl.uploadNew(req, res)
);

// aliases (opcionais) de ativar/arquivar no escopo do estabelecimento
router.post(
  '/:establishmentId/documents/:documentId/versions/:versionId/activate',
  authenticateToken,
  auditLog,
  authorizePermissions('documentVersion.activate'),
  bindCompany,
  bindEstablishment,
  bindDocument,
  (req, res) => verCtrl.activateFromDocument(req, res)
);

router.post(
  '/:establishmentId/documents/:documentId/versions/:versionId/archive',
  authenticateToken,
  auditLog,
  authorizePermissions('documentVersion.archive'),
  bindCompany,
  bindEstablishment,
  bindDocument,
  (req, res) => verCtrl.archiveFromDocument(req, res)
);

// ---------------------- Document Relations (sempre do Establishment) ----------------------
router.get(
  '/:establishmentId/documents/:documentId/relations',
  authenticateToken,
  authorizePermissions('document.read'),
  bindCompany,
  bindEstablishment,
  (req, res) => relCtrl.list(req, res)
);

router.post(
  '/:establishmentId/documents/:documentId/relations',
  authenticateToken,
  auditLog,
  authorizePermissions('document.update'),
  bindCompany,
  bindEstablishment,
  (req, res) => relCtrl.create(req, res)
);

router.delete(
  '/:establishmentId/documents/:documentId/relations/:relationId',
  authenticateToken,
  auditLog,
  authorizePermissions('document.update'),
  bindCompany,
  bindEstablishment,
  (req, res) => relCtrl.remove(req, res)
);

export default router;
