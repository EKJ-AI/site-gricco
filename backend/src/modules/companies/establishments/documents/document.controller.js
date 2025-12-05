// src/modules/companies/establishments/documents/document.controller.js
import prisma from '../../../../../prisma/client.js';
import { parsePagination } from '../../../../infra/http/pagination.js';
import { prismaErrorToHttp } from '../../../../infra/http/prismaError.js';
import { registerAudit } from '../../../../utils/audit.js';

const DOCUMENT_STATUS = ['DRAFT', 'ACTIVE', 'INACTIVE'];

/**
 * LIST: documentos do estabelecimento
 * GET /api/companies/:companyId/establishments/:establishmentId/documents
 *
 * Controle de acesso já foi feito em:
 *  - authenticateToken
 *  - bindCompany
 *  - bindEstablishment
 *  - ensureDocumentAccess({ mode: 'read' })
 */
export async function list(req, res) {
  try {
    const { establishmentId } = req.params;
    const { q, status, typeId } = req.query;
    const { skip, take, page, pageSize } = parsePagination(req);

    if (!establishmentId) {
      return res
        .status(400)
        .json({ success: false, message: 'establishmentId is required' });
    }

    const where = {
      establishmentId,
      deletedAt: null,
      ...(status && DOCUMENT_STATUS.includes(status) ? { status } : {}),
      ...(typeId ? { typeId } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { description: { contains: q, mode: 'insensitive' } },
              {
                type: {
                  name: { contains: q, mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      prisma.document.count({ where }),
      prisma.document.findMany({
        where,
        skip,
        take,
        orderBy: { updatedAt: 'desc' },
        include: {
          type: true,
          currentVersion: true,
        },
      }),
    ]);

    return res.json({
      success: true,
      data: { total, page, pageSize, items },
    });
  } catch (err) {
    console.error('[DOCUMENT] list error', err);
    const mapped = prismaErrorToHttp(err);
    if (mapped) {
      return res.status(mapped.status).json({ success: false, ...mapped });
    }
    return res
      .status(500)
      .json({ success: false, message: 'Internal error' });
  }
}

/**
 * GET: documento específico
 * GET /api/companies/:companyId/establishments/:establishmentId/documents/:id
 *
 * bindDocument já garante que o documento pertence ao estabelecimento.
 * Permissão já checada em ensureDocumentAccess({ mode: 'read' }).
 */
export async function getById(req, res) {
  try {
    const { id } = req.params;

    const doc = await prisma.document.findUnique({
      where: { id },
      include: {
        type: true,
        currentVersion: true,
        versions: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!doc) {
      return res
        .status(404)
        .json({ success: false, message: 'Document not found' });
    }

    return res.json({ success: true, data: doc });
  } catch (err) {
    console.error('[DOCUMENT] getById error', err);
    const mapped = prismaErrorToHttp(err);
    if (mapped) {
      return res.status(mapped.status).json({ success: false, ...mapped });
    }
    return res
      .status(500)
      .json({ success: false, message: 'Internal error' });
  }
}

/**
 * CREATE
 * POST /api/companies/:companyId/establishments/:establishmentId/documents
 *
 * injectIdsToBody já injetou companyId/establishmentId.
 * Permissão já checada em ensureDocumentAccess({ mode: 'write' }).
 */
export async function create(req, res) {
  try {
    const data = req.body || {};
    const establishmentId =
      req.params.establishmentId || data.establishmentId || null;

    if (!establishmentId) {
      return res
        .status(400)
        .json({ success: false, message: 'establishmentId is required' });
    }

    if (!data.name || typeof data.name !== 'string') {
      return res
        .status(400)
        .json({ success: false, message: 'name is required' });
    }

    if (!data.typeId || typeof data.typeId !== 'string') {
      return res
        .status(400)
        .json({ success: false, message: 'typeId is required' });
    }

    // garante que o establishment existe (melhor erro que FK quebrada)
    const est = await prisma.establishment.findUnique({
      where: { id: establishmentId },
      select: { id: true },
    });
    if (!est) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid establishmentId' });
    }

    // garante que o tipo existe
    const docType = await prisma.documentType.findUnique({
      where: { id: data.typeId },
      select: { id: true },
    });
    if (!docType) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid typeId' });
    }

    const status =
      data.status && DOCUMENT_STATUS.includes(data.status)
        ? data.status
        : 'DRAFT';

    const created = await prisma.document.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        establishmentId: est.id,
        typeId: data.typeId,
        status,
        // currentVersionId continua nulo até subir/ativar versão
      },
    });

    await registerAudit({
      userId: req.user?.id,
      action: 'CREATE',
      entity: 'Document',
      entityId: created.id,
      details: created.name,
    });

    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    console.error('[DOCUMENT] create error', err);
    const mapped = prismaErrorToHttp(err);
    if (mapped) {
      return res.status(mapped.status).json({ success: false, ...mapped });
    }
    return res
      .status(500)
      .json({ success: false, message: 'Internal error' });
  }
}

/**
 * UPDATE
 * PUT /api/companies/:companyId/establishments/:establishmentId/documents/:id
 *
 * Permissão já checada em ensureDocumentAccess({ mode: 'write' }).
 */
export async function update(req, res) {
  try {
    const { id } = req.params;
    const data = req.body || {};

    const doc = await prisma.document.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!doc) {
      return res
        .status(404)
        .json({ success: false, message: 'Document not found' });
    }

    const updateData = {};

    if (data.name !== undefined) {
      updateData.name = data.name;
    }
    if (data.description !== undefined) {
      updateData.description = data.description;
    }
    if (data.typeId !== undefined) {
      updateData.typeId = data.typeId;
    }
    if (data.status !== undefined) {
      if (!DOCUMENT_STATUS.includes(data.status)) {
        return res
          .status(400)
          .json({ success: false, message: 'Invalid status' });
      }
      updateData.status = data.status;
    }

    const updated = await prisma.document.update({
      where: { id },
      data: updateData,
    });

    await registerAudit({
      userId: req.user?.id,
      action: 'UPDATE',
      entity: 'Document',
      entityId: id,
      details: JSON.stringify(Object.keys(updateData)),
    });

    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('[DOCUMENT] update error', err);
    const mapped = prismaErrorToHttp(err);
    if (mapped) {
      return res.status(mapped.status).json({ success: false, ...mapped });
    }
    return res
      .status(500)
      .json({ success: false, message: 'Internal error' });
  }
}

/**
 * DELETE (soft-delete)
 * DELETE /api/companies/:companyId/establishments/:establishmentId/documents/:id
 *
 * Permissão já checada em ensureDocumentAccess({ mode: 'write' }).
 */
export async function remove(req, res) {
  try {
    const { id } = req.params;

    const doc = await prisma.document.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!doc) {
      return res
        .status(404)
        .json({ success: false, message: 'Document not found' });
    }

    const deleted = await prisma.document.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: 'INACTIVE',
      },
    });

    await registerAudit({
      userId: req.user?.id,
      action: 'DELETE',
      entity: 'Document',
      entityId: id,
      details: '',
    });

    return res.json({
      success: true,
      data: deleted,
      message: 'Document soft-deleted',
    });
  } catch (err) {
    console.error('[DOCUMENT] remove error', err);
    const mapped = prismaErrorToHttp(err);
    if (mapped) {
      return res.status(mapped.status).json({ success: false, ...mapped });
    }
    return res
      .status(500)
      .json({ success: false, message: 'Internal error' });
  }
}

/**
 * setCurrentVersion
 * (se você ainda estiver usando essa rota custom; normalmente hoje usamos
 * as rotas do documentVersion.controller para ativar/arquivar versões)
 *
 * Permissão deve ser garantida na rota com ensureDocumentAccess({ mode: 'write' })
 * + bindDocument.
 */
export async function setCurrentVersion(req, res) {
  try {
    const { id, versionId } = req.params;

    const doc = await prisma.document.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!doc) {
      return res
        .status(404)
        .json({ success: false, message: 'Document not found' });
    }

    const ver = await prisma.documentVersion.findUnique({
      where: { id: versionId },
    });

    if (!ver || ver.documentId !== id) {
      return res.status(400).json({
        success: false,
        message: 'Version does not belong to document',
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      // arquiva todas as outras versões desse documento
      await tx.documentVersion.updateMany({
        where: { documentId: id, id: { not: versionId } },
        data: { versionStatus: 'ARCHIVED' },
      });

      // marca a escolhida como PUBLISHED + ativa
      await tx.documentVersion.update({
        where: { id: versionId },
        data: {
          versionStatus: 'PUBLISHED',
          activatedAt: new Date(),
        },
      });

      // documento passa a estar ACTIVE com essa currentVersionId
      return tx.document.update({
        where: { id },
        data: {
          currentVersionId: versionId,
          status: 'ACTIVE',
        },
      });
    });

    await registerAudit({
      userId: req.user?.id,
      action: 'UPDATE',
      entity: 'Document',
      entityId: id,
      details: `currentVersionId=${versionId}`,
    });

    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('[DOCUMENT] setCurrentVersion error', err);
    const mapped = prismaErrorToHttp(err);
    if (mapped) {
      return res.status(mapped.status).json({ success: false, ...mapped });
    }
    return res
      .status(500)
      .json({ success: false, message: 'Internal error' });
  }
}
