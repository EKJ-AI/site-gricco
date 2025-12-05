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
 * Helpers de permissão / papéis
 */
function buildPermSet(req) {
  return new Set(req.user?.permissions || []);
}

function hasAnyPermission(req, perms = []) {
  const set = buildPermSet(req);
  return perms.some((p) => set.has(p));
}

function isGlobalAdmin(req) {
  return buildPermSet(req).has('system.admin.global');
}

function isCompanyAdmin(req) {
  return buildPermSet(req).has('company.admin');
}

/**
 * Resolve (ou reaproveita) vínculo de colaborador de portal para o estabelecimento
 * usando Employee.portalUserId.
 *
 * Qualquer colaborador vinculado a (companyId, establishmentId) terá pelo menos
 * permissão de LEITURA de documentos deste estabelecimento.
 */
async function getPortalEmployeeForEstablishment(req) {
  if (req.ctx?.portalEmployee) return req.ctx.portalEmployee;

  const { companyId, establishmentId } = req.params;
  if (!companyId || !establishmentId || !req.user?.id) {
    console.log('[PORTAL-ACCESS] Faltando dados para lookup', {
      companyId,
      establishmentId,
      userId: req.user?.id,
    });
    return null;
  }

  console.log('[PORTAL-ACCESS] Procurando Employee portal para:', {
    userId: req.user.id,
    companyId: String(companyId),
    establishmentId: String(establishmentId),
  });

  const emp = await prisma.employee.findFirst({
    where: {
      portalUserId: req.user.id,
      companyId: String(companyId),
      establishmentId: String(establishmentId),
    },
    select: {
      id: true,
      companyId: true,
      establishmentId: true,
    },
  });

  if (!emp) {
    console.log('[PORTAL-ACCESS] Nenhum Employee encontrado para este user/empresa/estabelecimento');
    return null;
  }

  console.log('[PORTAL-ACCESS] Employee portal encontrado:', emp);

  req.ctx = { ...(req.ctx || {}), portalEmployee: emp };
  return emp;
}

/**
 * Middleware genérico de acesso a DOCUMENTOS / VERSÕES / RELAÇÕES
 *
 * Regras:
 *  - Admin Global  ✅ sempre
 *  - Company Admin ✅ na empresa que criou (checado em bindCompany)
 *  - Usuário com permissões de documento:
 *      - READ  → document.read OU document.view OU documentVersion.read OU document.download
 *      - WRITE → document.create/update/delete OU documentVersion.create/activate/archive
 *  - Colaborador de estabelecimento (Employee.portalUserId):
 *      - Sempre pode LEITURA de documentos do seu estabelecimento,
 *        mesmo que não tenha permissões de documento no perfil.
 */
function ensureDocumentAccess({ mode = 'read' } = {}) {
  // Permissões que liberam leitura / escrita
  const DOC_READ_PERMS = [
    'document.read',
    'document.view',
    'documentVersion.read',
    'document.download', // se já tiver criado essa perm
  ];

  const DOC_WRITE_PERMS = [
    'document.create',
    'document.update',
    'document.delete',
    'documentVersion.create',
    'documentVersion.activate',
    'documentVersion.archive',
  ];

  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res
          .status(401)
          .json({ success: false, message: 'Usuário não autenticado.' });
      }

      const permSet = buildPermSet(req);
      console.log('[DOC-ACCESS] Checando acesso:', {
        userId: req.user.id,
        mode,
        perms: Array.from(permSet),
        path: req.method + ' ' + req.originalUrl,
      });

      // 1) Admin Global sempre pode
      if (permSet.has('system.admin.global')) {
        console.log('[DOC-ACCESS] Liberado: system.admin.global');
        return next();
      }

      // 2) Company Admin pode, escopo já filtrado em bindCompany
      if (permSet.has('company.admin')) {
        console.log('[DOC-ACCESS] Liberado: company.admin');
        return next();
      }

      // 3) Perfis com permissões de documento
      const hasDocRead = DOC_READ_PERMS.some((p) => permSet.has(p));
      const hasDocWrite = DOC_WRITE_PERMS.some((p) => permSet.has(p));

      console.log('[DOC-ACCESS] Flags documento:', {
        hasDocRead,
        hasDocWrite,
      });

      if (mode === 'read' && (hasDocRead || hasDocWrite)) {
        console.log('[DOC-ACCESS] Liberado por permissões de documento (READ)');
        return next();
      }

      if (mode === 'write' && hasDocWrite) {
        console.log('[DOC-ACCESS] Liberado por permissões de documento (WRITE)');
        return next();
      }

      // 4) Colaborador de estabelecimento (Employee.portalUserId)
      //    → sempre concede LEITURA no estabelecimento vinculado
      const portalEmp = await getPortalEmployeeForEstablishment(req);
      console.log('[DOC-ACCESS] Resultado portalEmployee:', portalEmp);

      if (portalEmp && mode === 'read') {
        console.log('[DOC-ACCESS] Liberado como colaborador do estabelecimento.');
        return next();
      }

      // 5) Falhou tudo → 403 com mensagem amigável
      const message =
        mode === 'read'
          ? 'Você não tem permissão para visualizar os documentos deste estabelecimento.'
          : 'Você não tem permissão para alterar documentos neste estabelecimento.';

      console.warn('[DOC-ACCESS] BLOQUEADO. Motivo:', {
        userId: req.user.id,
        mode,
        hasDocRead,
        hasDocWrite,
        isPortalEmployee: !!portalEmp,
      });

      return res.status(403).json({
        success: false,
        message,
      });
    } catch (err) {
      console.error('[ensureDocumentAccess] erro:', err);
      return res.status(500).json({
        success: false,
        message: 'Erro interno na verificação de acesso a documentos.',
      });
    }
  };
}

/**
 * Middlewares de vínculo e injeção de IDs
 */
async function bindCompany(req, res, next) {
  const { companyId } = req.params;

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, createdByUserId: true },
  });

  if (!company) {
    return res
      .status(404)
      .json({ success: false, message: 'Company not found' });
  }

  // Escopo multi-tenant:
  // - Admin Global -> pode tudo
  // - Company Admin -> somente empresas que ele criou
  const permSet = buildPermSet(req);
  const isGlobal = permSet.has('system.admin.global');
  const isCompanyAdm = permSet.has('company.admin');

  if (isCompanyAdm && !isGlobal) {
    if (!company.createdByUserId || company.createdByUserId !== req.user?.id) {
      return res.status(403).json({
        success: false,
        message: 'Você não tem acesso a esta empresa.',
      });
    }
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

  // Comparação protegida contra diferenças de tipo (number vs string)
  if (String(est.companyId) !== String(companyId)) {
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

  if (String(doc.establishmentId) !== String(establishmentId)) {
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
  estCtrl.list, // já lê companyId de req.params/query
);

// CREATE: /api/companies/:companyId/establishments
router.post(
  '/',
  authenticateToken,
  auditLog,
  authorizePermissions('establishment.create'),
  bindCompany,
  injectIdsToBody,
  estCtrl.create,
);

// GET one: /api/companies/:companyId/establishments/:establishmentId
router.get(
  '/:establishmentId',
  authenticateToken,
  authorizePermissions('establishment.read'),
  bindCompany,
  bindEstablishment,
  estCtrl.getById,
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
  estCtrl.update,
);

// DELETE: /api/companies/:companyId/establishments/:establishmentId
router.delete(
  '/:establishmentId',
  authenticateToken,
  auditLog,
  authorizePermissions('establishment.delete'),
  bindCompany,
  bindEstablishment,
  estCtrl.remove,
);

// ---------------------- Departments (sempre do Establishment) ----------------------
router.get(
  '/:establishmentId/departments',
  authenticateToken,
  authorizePermissions('department.read'),
  bindCompany,
  bindEstablishment,
  (req, res) => deptCtrl.list(req, res),
);

router.post(
  '/:establishmentId/departments',
  authenticateToken,
  auditLog,
  authorizePermissions('department.create'),
  bindCompany,
  bindEstablishment,
  injectIdsToBody,
  (req, res) => deptCtrl.create(req, res),
);

router.get(
  '/:establishmentId/departments/:id',
  authenticateToken,
  authorizePermissions('department.read'),
  bindCompany,
  bindEstablishment,
  (req, res) => deptCtrl.getById(req, res),
);

router.put(
  '/:establishmentId/departments/:id',
  authenticateToken,
  auditLog,
  authorizePermissions('department.update'),
  bindCompany,
  bindEstablishment,
  injectIdsToBody,
  (req, res) => deptCtrl.update(req, res),
);

router.delete(
  '/:establishmentId/departments/:id',
  authenticateToken,
  auditLog,
  authorizePermissions('department.delete'),
  bindCompany,
  bindEstablishment,
  (req, res) => deptCtrl.remove(req, res),
);

// ---------------------- Employees (sempre do Establishment) ----------------------
router.get(
  '/:establishmentId/employees',
  authenticateToken,
  authorizePermissions('employee.read'),
  bindCompany,
  bindEstablishment,
  (req, res) => empCtrl.listByEstablishment(req, res),
);

router.post(
  '/:establishmentId/employees',
  authenticateToken,
  auditLog,
  authorizePermissions('employee.create'),
  bindCompany,
  bindEstablishment,
  injectIdsToBody,
  (req, res) => empCtrl.create(req, res),
);

router.get(
  '/:establishmentId/employees/:id',
  authenticateToken,
  authorizePermissions('employee.read'),
  bindCompany,
  bindEstablishment,
  (req, res) => empCtrl.getById(req, res),
);

router.put(
  '/:establishmentId/employees/:id',
  authenticateToken,
  auditLog,
  authorizePermissions('employee.update'),
  bindCompany,
  bindEstablishment,
  injectIdsToBody,
  (req, res) => empCtrl.update(req, res),
);

router.delete(
  '/:establishmentId/employees/:id',
  authenticateToken,
  auditLog,
  authorizePermissions('employee.delete'),
  bindCompany,
  bindEstablishment,
  (req, res) => empCtrl.remove(req, res),
);

// ---------------------- Documents (sempre do Establishment) ----------------------
router.get(
  '/:establishmentId/documents',
  authenticateToken,
  bindCompany,
  bindEstablishment,
  ensureDocumentAccess({ mode: 'read' }),
  (req, res) => docCtrl.list(req, res),
);

router.post(
  '/:establishmentId/documents',
  authenticateToken,
  auditLog,
  bindCompany,
  bindEstablishment,
  ensureDocumentAccess({ mode: 'write' }),
  injectIdsToBody,
  (req, res) => docCtrl.create(req, res),
);

router.get(
  '/:establishmentId/documents/:id',
  authenticateToken,
  bindCompany,
  bindEstablishment,
  bindDocument,
  ensureDocumentAccess({ mode: 'read' }),
  (req, res) => docCtrl.getById(req, res),
);

router.put(
  '/:establishmentId/documents/:id',
  authenticateToken,
  auditLog,
  bindCompany,
  bindEstablishment,
  bindDocument,
  ensureDocumentAccess({ mode: 'write' }),
  injectIdsToBody,
  (req, res) => docCtrl.update(req, res),
);

router.delete(
  '/:establishmentId/documents/:id',
  authenticateToken,
  auditLog,
  bindCompany,
  bindEstablishment,
  bindDocument,
  ensureDocumentAccess({ mode: 'write' }),
  (req, res) => docCtrl.remove(req, res),
);

// ---------------------- Document Versions (sempre do Establishment) ----------------------
router.get(
  '/:establishmentId/documents/:documentId/versions',
  authenticateToken,
  bindCompany,
  bindEstablishment,
  bindDocument,
  ensureDocumentAccess({ mode: 'read' }),
  (req, res) => verCtrl.list(req, res),
);

router.post(
  '/:establishmentId/documents/:documentId/versions',
  authenticateToken,
  auditLog,
  bindCompany,
  bindEstablishment,
  bindDocument,
  ensureDocumentAccess({ mode: 'write' }),
  uploadDocumentVersion.single('file'),
  (req, res) => verCtrl.uploadNew(req, res),
);

// aliases (opcionais) de ativar/arquivar no escopo do estabelecimento
router.post(
  '/:establishmentId/documents/:documentId/versions/:versionId/activate',
  authenticateToken,
  auditLog,
  bindCompany,
  bindEstablishment,
  bindDocument,
  ensureDocumentAccess({ mode: 'write' }),
  (req, res) => verCtrl.activateFromDocument(req, res),
);

router.post(
  '/:establishmentId/documents/:documentId/versions/:versionId/archive',
  authenticateToken,
  auditLog,
  bindCompany,
  bindEstablishment,
  bindDocument,
  ensureDocumentAccess({ mode: 'write' }),
  (req, res) => verCtrl.archiveFromDocument(req, res),
);

// ✅ NOVO: rota para VIEW / DOWNLOAD do arquivo
router.get(
  '/:establishmentId/documents/:documentId/versions/:versionId/file',
  authenticateToken,
  bindCompany,
  bindEstablishment,
  bindDocument,
  ensureDocumentAccess({ mode: 'read' }),
  (req, res) => verCtrl.accessFile(req, res),
);

// ---------------------- Document Relations (sempre do Establishment) ----------------------
router.get(
  '/:establishmentId/documents/:documentId/relations',
  authenticateToken,
  bindCompany,
  bindEstablishment,
  bindDocument,
  ensureDocumentAccess({ mode: 'read' }),
  (req, res) => relCtrl.list(req, res),
);

router.post(
  '/:establishmentId/documents/:documentId/relations',
  authenticateToken,
  auditLog,
  bindCompany,
  bindEstablishment,
  bindDocument,
  ensureDocumentAccess({ mode: 'write' }),
  (req, res) => relCtrl.create(req, res),
);

router.delete(
  '/:establishmentId/documents/:documentId/relations/:relationId',
  authenticateToken,
  auditLog,
  bindCompany,
  bindEstablishment,
  bindDocument,
  ensureDocumentAccess({ mode: 'write' }),
  (req, res) => relCtrl.remove(req, res),
);

export default router;
