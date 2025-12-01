// src/modules/companies/establishments/documents/documentRelation.controller.js
import prisma from '../../../../../prisma/client.js';
import { parsePagination } from '../../../../infra/http/pagination.js';
import { prismaErrorToHttp } from '../../../../infra/http/prismaError.js';
import { registerAudit } from '../../../../utils/audit.js';

/**
 * Lista relações de um documento
 * direction:
 *  - parent (default): fromDocumentId = documentId (este doc é o principal)
 *  - child: toDocumentId = documentId
 *  - all: qualquer relação onde esse doc está envolvido
 * relationType: opcional (EVIDENCE, SUPPORTING, REPLACES, DERIVED_FROM)
 */
export async function list(req, res) {
  try {
    const { documentId } = req.params;
    const { direction = 'parent', relationType } = req.query;
    const { skip, take, page, pageSize } = parsePagination(req);

    const where = {};

    if (relationType) {
      where.relationType = relationType;
    }

    if (direction === 'child') {
      where.toDocumentId = documentId;
    } else if (direction === 'all') {
      where.OR = [
        { fromDocumentId: documentId },
        { toDocumentId: documentId },
      ];
    } else {
      // parent (padrão): doc atual é o principal (from), lista evidências (to)
      where.fromDocumentId = documentId;
    }

    const [total, items] = await Promise.all([
      prisma.documentRelation.count({ where }),
      prisma.documentRelation.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          fromDocument: { include: { type: true } },
          toDocument: { include: { type: true } },
        },
      }),
    ]);

    return res.json({
      success: true,
      data: { total, page, pageSize, items },
    });
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

/**
 * Cria uma relação a partir deste documento (fromDocumentId) para outro (toDocumentId).
 *
 * Corpo aceito (para compatibilidade com o frontend):
 *  - { childDocumentId, relationType? = 'EVIDENCE' }
 *  - { targetDocumentId, relationType? = 'EVIDENCE' }
 */
export async function create(req, res) {
  try {
    const { companyId, establishmentId, documentId } = req.params;

    const {
      // usado no frontend (DocumentDetail.jsx)
      childDocumentId,
      // nome original (legado)
      targetDocumentId: legacyTargetId,
      relationType = 'EVIDENCE',
    } = req.body || {};

    const targetId = childDocumentId || legacyTargetId;

    if (!targetId) {
      return res.status(400).json({
        success: false,
        message: 'childDocumentId or targetDocumentId is required',
      });
    }

    if (targetId === documentId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot relate a document to itself',
      });
    }

    // Busca os dois documentos e valida vínculo com company/establishment
    const docs = await prisma.document.findMany({
      where: {
        id: { in: [documentId, targetId] },
      },
      include: {
        establishment: {
          select: { id: true, companyId: true },
        },
        type: {
          select: { id: true, name: true, kind: true },
        },
      },
    });

    const fromDoc = docs.find((d) => d.id === documentId);
    const toDoc = docs.find((d) => d.id === targetId);

    if (!fromDoc || !toDoc) {
      return res.status(400).json({
        success: false,
        message: 'Document(s) not found',
      });
    }

    if (
      fromDoc.establishment.companyId !== companyId ||
      fromDoc.establishment.id !== establishmentId
    ) {
      return res.status(400).json({
        success: false,
        message: 'Document does not belong to this Company/Establishment',
      });
    }

    // Por segurança, o destino também deve estar no mesmo estabelecimento
    if (
      toDoc.establishment.companyId !== companyId ||
      toDoc.establishment.id !== establishmentId
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Target document does not belong to this Company/Establishment',
      });
    }

    // ⚠️ Evita duplicidade e relação invertida:
    // se já existe (A -> B) OU (B -> A) com o mesmo relationType, não deixa criar.
    const existing = await prisma.documentRelation.findFirst({
      where: {
        relationType,
        OR: [
          { fromDocumentId: documentId, toDocumentId: targetId },
          { fromDocumentId: targetId, toDocumentId: documentId },
        ],
      },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message:
          'Relation between these documents already exists for this type',
      });
    }

    const created = await prisma.documentRelation.create({
      data: {
        fromDocumentId: documentId,
        toDocumentId: targetId,
        relationType,
      },
      include: {
        fromDocument: { include: { type: true } },
        toDocument: { include: { type: true } },
      },
    });

    await registerAudit({
      userId: req.user?.id,
      action: 'CREATE',
      entity: 'DocumentRelation',
      entityId: created.id,
      details: JSON.stringify({
        fromDocumentId: documentId,
        toDocumentId: targetId,
        relationType,
      }),
    });

    return res.status(201).json({ success: true, data: created });
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

/**
 * Remove uma relação específica ligada a este documento
 * Rota: DELETE /.../documents/:documentId/relations/:relationId
 */
export async function remove(req, res) {
  try {
    const { documentId, relationId } = req.params;

    const rel = await prisma.documentRelation.findUnique({
      where: { id: relationId },
      include: {
        fromDocument: true,
        toDocument: true,
      },
    });

    if (!rel) {
      return res.status(404).json({
        success: false,
        message: 'Relation not found',
      });
    }

    if (rel.fromDocumentId !== documentId && rel.toDocumentId !== documentId) {
      return res.status(400).json({
        success: false,
        message: 'Relation does not belong to this document',
      });
    }

    await prisma.documentRelation.delete({
      where: { id: relationId },
    });

    await registerAudit({
      userId: req.user?.id,
      action: 'DELETE',
      entity: 'DocumentRelation',
      entityId: relationId,
      details: JSON.stringify({
        fromDocumentId: rel.fromDocumentId,
        toDocumentId: rel.toDocumentId,
        relationType: rel.relationType,
      }),
    });

    return res.json({
      success: true,
      message: 'Relation removed',
    });
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
