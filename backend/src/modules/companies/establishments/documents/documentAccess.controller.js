// src/modules/companies/establishments/documents/documentAccess.controller.js
import prisma from '../../../../../prisma/client.js';
import { prismaErrorToHttp } from '../../../../infra/http/prismaError.js';
import { resolveDocumentAccess, canReadDocs } from './document.access.js';
import { registerDocumentVersionAccess } from '../../../../utils/documentAccessLog.js';
import { extractRequestMeta } from '../../../../utils/httpMeta.js';

/**
 * Helper: monta agregação por usuário a partir de uma lista de logs "crus".
 *
 * Espera rows no formato:
 * {
 *   userId,
 *   action,           // 'VIEW' | 'DOWNLOAD' | 'UPLOAD'
 *   createdAt,
 * }
 *
 * e um Map userId -> { id, name, email, isActive }.
 */
function buildPerUserSummary(rows, usersById) {
  const perUserMap = new Map();

  for (const row of rows) {
    const key = row.userId === null ? 'anonymous' : String(row.userId);

    if (!perUserMap.has(key)) {
      const u = row.userId !== null ? usersById.get(row.userId) : null;

      perUserMap.set(key, {
        userId: row.userId,
        userName: u?.name ?? null,
        userEmail: u?.email ?? null,
        isActive: u?.isActive ?? null,
        counts: {
          VIEW: 0,
          DOWNLOAD: 0,
          UPLOAD: 0,
        },
        total: 0,
        lastAccessAt: row.createdAt ?? null,
      });
    }

    const agg = perUserMap.get(key);

    if (!agg.counts[row.action]) {
      agg.counts[row.action] = 0;
    }

    agg.counts[row.action] += 1;
    agg.total += 1;

    if (
      !agg.lastAccessAt ||
      (row.createdAt && row.createdAt > agg.lastAccessAt)
    ) {
      agg.lastAccessAt = row.createdAt;
    }
  }

  const items = Array.from(perUserMap.values()).sort(
    (a, b) =>
      new Date(b.lastAccessAt || 0).getTime() -
      new Date(a.lastAccessAt || 0).getTime(),
  );

  return items;
}

/**
 * 📊 Lista acessos agrupados por usuário para um documento (todas as versões)
 * GET /api/companies/:companyId/establishments/:establishmentId/documents/:documentId/access-log
 */
export async function listByDocument(req, res) {
  try {
    const { documentId } = req.params;

    // 1) Garante que o documento existe e que o usuário pode LER
    const { doc, access } = await resolveDocumentAccess(
      req.user,
      documentId,
    );

    if (!doc) {
      return res
        .status(404)
        .json({ success: false, message: 'Document not found' });
    }

    if (!canReadDocs(access)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden (no access to this document)',
      });
    }

    // 2) Busca TODOS os logs desse documento (todas as versões)
    const logs = await prisma.documentAccessLog.findMany({
      where: {
        documentId: doc.id,
      },
      select: {
        userId: true,
        action: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 3) Busca usuários envolvidos
    const userIds = Array.from(
      new Set(
        logs
          .map((l) => l.userId)
          .filter((id) => id !== null),
      ),
    );

    const users = userIds.length
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: {
            id: true,
            name: true,
            email: true,
            isActive: true,
          },
        })
      : [];

    const usersById = new Map(users.map((u) => [u.id, u]));

    // 4) Agrega por usuário
    const items = buildPerUserSummary(logs, usersById);

    return res.json({
      success: true,
      data: {
        totalUsers: items.length,
        items,
      },
    });
  } catch (err) {
    const mapped = prismaErrorToHttp(err);
    if (mapped) {
      return res
        .status(mapped.status)
        .json({ success: false, ...mapped });
    }
    return res.status(500).json({
      success: false,
      message: 'Internal error',
    });
  }
}

/**
 * 📊 Lista acessos agrupados por usuário para UMA VERSÃO específica do documento
 * GET /api/companies/:companyId/establishments/:establishmentId/documents/:documentId/versions/:versionId/access-log
 */
export async function listByDocumentVersion(req, res) {
  try {
    const { documentId, versionId } = req.params;

    // 1) Garante que o documento existe e que o usuário pode LER
    const { doc, access } = await resolveDocumentAccess(
      req.user,
      documentId,
    );

    if (!doc) {
      return res
        .status(404)
        .json({ success: false, message: 'Document not found' });
    }

    if (!canReadDocs(access)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden (no access to this document)',
      });
    }

    // 2) Garante que a versão existe e pertence a este documento
    const version = await prisma.documentVersion.findUnique({
      where: { id: versionId }, // CUID / string
      select: {
        id: true,
        documentId: true,
      },
    });

    if (!version || version.documentId !== doc.id) {
      return res.status(404).json({
        success: false,
        message: 'Document version not found for this document',
      });
    }

    // 3) Busca TODOS os logs dessa versão específica
    const logs = await prisma.documentAccessLog.findMany({
      where: {
        documentId: doc.id,
        documentVersionId: version.id, // 👈 CORRIGIDO AQUI
      },
      select: {
        userId: true,
        action: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 4) Busca usuários envolvidos
    const userIds = Array.from(
      new Set(
        logs
          .map((l) => l.userId)
          .filter((id) => id !== null),
      ),
    );

    const users = userIds.length
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: {
            id: true,
            name: true,
            email: true,
            isActive: true,
          },
        })
      : [];

    const usersById = new Map(users.map((u) => [u.id, u]));

    // 5) Agrega por usuário
    const items = buildPerUserSummary(logs, usersById);

    return res.json({
      success: true,
      data: {
        totalUsers: items.length,
        items,
      },
    });
  } catch (err) {
    const mapped = prismaErrorToHttp(err);
    if (mapped) {
      return res
        .status(mapped.status)
        .json({ success: false, ...mapped });
    }
    return res.status(500).json({
      success: false,
      message: 'Internal error',
    });
  }
}

/**
 * POST: registra um acesso (VIEW/DOWNLOAD) manualmente
 * (caso o frontend queira registrar algum evento além do accessFile)
 */
export async function registerAccess(req, res) {
  try {
    const { documentId } = req.params;
    const { versionId, action } = req.body || {};

    if (!['VIEW', 'DOWNLOAD'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'action must be VIEW or DOWNLOAD',
      });
    }

    // garante que o doc existe e que o cara pode pelo menos ler
    const { doc, access } = await resolveDocumentAccess(
      req.user,
      documentId,
    );
    if (!doc) {
      return res
        .status(404)
        .json({ success: false, message: 'Document not found' });
    }
    if (!canReadDocs(access)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden (no access to this document)',
      });
    }

    // se veio versionId, valida que pertence ao doc
    let version = null;
    if (versionId) {
      version = await prisma.documentVersion.findUnique({
        where: { id: versionId }, // string CUID aqui também
        select: { id: true, documentId: true },
      });
      if (!version || version.documentId !== doc.id) {
        return res
          .status(400)
          .json({ success: false, message: 'Invalid versionId' });
      }
    }

    // 🔎 Resolve companyId e establishmentId via relacionamento
    const fullDoc = await prisma.document.findUnique({
      where: { id: doc.id },
      include: {
        establishment: {
          select: { id: true, companyId: true },
        },
      },
    });

    const establishmentId =
      fullDoc?.establishment?.id ?? doc.establishmentId ?? null;
    const companyId = fullDoc?.establishment?.companyId ?? null;

    const { ip, userAgent } = extractRequestMeta(req);

    await registerDocumentVersionAccess({
      companyId,
      establishmentId,
      documentId: doc.id,
      versionId: version?.id || null,
      userId: req.user?.id || null,
      action,
      ip,
      userAgent,
    });

    return res.status(204).send();
  } catch (err) {
    const mapped = prismaErrorToHttp(err);
    if (mapped) {
      return res
        .status(mapped.status)
        .json({ success: false, ...mapped });
    }
    return res
      .status(500)
      .json({ success: false, message: 'Internal error' });
  }
}
