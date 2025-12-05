// src/modules/companies/establishments/documents/document.access.js
import prisma from '../../../../../prisma/client.js';

export const ACCESS_LEVEL = {
  GLOBAL: 'GLOBAL',
  COMPANY_ADMIN: 'COMPANY_ADMIN',
  MEMBER: 'MEMBER',
  VIEWER: 'VIEWER',
  ASSISTANT: 'ASSISTANT',
};

// Permissões relacionadas a documentos (perfil / RBAC)
const DOC_READ_PERMS = [
  'document.read',
  'document.view',
  'documentVersion.read',
  'document.download',
];

const DOC_WRITE_PERMS = [
  'document.create',
  'document.update',
  'document.delete',
  'documentVersion.create',
  'documentVersion.activate',
  'documentVersion.archive',
];

/**
 * Resolve o "papel efetivo" do usuário em um estabelecimento.
 *
 * Regras:
 *  - GLOBAL          → system.admin.global
 *  - COMPANY_ADMIN   → company.admin da empresa dona do estabelecimento
 *  - ASSISTANT       → tem permissão de escrita de documentos (document.* / documentVersion.*)
 *  - VIEWER          → tem só leitura de documentos OU é colaborador do estabelecimento (Employee.portalUserId)
 *  - MEMBER          → sem acesso a documentos
 *
 * Retorna um objeto do tipo:
 * {
 *   level,
 *   userId,
 *   establishmentId,
 *   companyId,
 *   isGlobalAdmin,
 *   isCompanyAdmin,
 *   isOwnerCompany,
 *   isPortalEmployee,
 *   hasDocRead,
 *   hasDocWrite,
 *   perms: [...]
 * }
 */
export async function resolveEstablishmentAccess(user, establishmentId) {
  if (!user) return null;

  const perms = user.permissions || [];
  const permSet = new Set(perms);
  const estId = String(establishmentId);

  const isGlobalAdmin = permSet.has('system.admin.global');
  const isCompanyAdmin = permSet.has('company.admin');

  // Carrega o estabelecimento + empresa (para checar se a empresa foi criada por este usuário)
  const est = await prisma.establishment.findUnique({
    where: { id: estId },
    select: {
      id: true,
      companyId: true,
      company: {
        select: {
          createdByUserId: true,
        },
      },
    },
  });

  if (!est) {
    // estabelecimento inexistente → sem acesso
    return null;
  }

  const companyId = est.companyId;
  const isOwnerCompany =
    !!isCompanyAdmin &&
    !!est.company?.createdByUserId &&
    String(est.company.createdByUserId) === String(user.id);

  // Permissões de documento pelo perfil
  const hasDocWrite = DOC_WRITE_PERMS.some((p) => permSet.has(p));
  const hasDocRead = hasDocWrite || DOC_READ_PERMS.some((p) => permSet.has(p));

  // Colaborador vinculado ao estabelecimento (Employee.portalUserId)
  const employee = await prisma.employee.findFirst({
    where: {
      establishmentId: estId,
      companyId,
      portalUserId: user.id,
    },
    select: { id: true },
  });
  const isPortalEmployee = !!employee;

  // Deriva o "level" amigável
  let level = ACCESS_LEVEL.MEMBER;

  if (isGlobalAdmin) {
    level = ACCESS_LEVEL.GLOBAL;
  } else if (isOwnerCompany) {
    level = ACCESS_LEVEL.COMPANY_ADMIN;
  } else if (hasDocWrite) {
    // perfil com permissão de escrita de documentos
    level = ACCESS_LEVEL.ASSISTANT;
  } else if (hasDocRead || isPortalEmployee) {
    // leitura via permissão OU por ser colaborador do estabelecimento
    level = ACCESS_LEVEL.VIEWER;
  } else {
    level = ACCESS_LEVEL.MEMBER;
  }

  return {
    level,
    userId: user.id,
    establishmentId: est.id,
    companyId,
    isGlobalAdmin,
    isCompanyAdmin,
    isOwnerCompany,
    isPortalEmployee,
    hasDocRead,
    hasDocWrite,
    perms,
  };
}

export function canReadDocs(access) {
  if (!access) return false;

  // Níveis que enxergam documentos
  return [
    ACCESS_LEVEL.GLOBAL,
    ACCESS_LEVEL.COMPANY_ADMIN,
    ACCESS_LEVEL.VIEWER,
    ACCESS_LEVEL.ASSISTANT,
  ].includes(access.level);
}

export function canWriteDocs(access) {
  if (!access) return false;

  // Apenas quem realmente pode alterar documentos
  return [
    ACCESS_LEVEL.GLOBAL,
    ACCESS_LEVEL.COMPANY_ADMIN,
    ACCESS_LEVEL.ASSISTANT,
  ].includes(access.level);
}

/**
 * Utilitário para quando você só tem o documentId.
 * Retorna { doc, access }.
 */
export async function resolveDocumentAccess(user, documentId) {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    select: {
      id: true,
      establishmentId: true,
    },
  });

  if (!doc) {
    return { doc: null, access: null };
  }

  const access = await resolveEstablishmentAccess(user, doc.establishmentId);
  return { doc, access };
}
