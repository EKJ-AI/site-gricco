// src/modules/companies/establishments/documents/document.controller.js
import prisma from '../../../../../prisma/client.js';
import { parsePagination } from '../../../../infra/http/pagination.js';
import { prismaErrorToHttp } from '../../../../infra/http/prismaError.js';
import { registerAudit } from '../../../../utils/audit.js';

const DOCUMENT_STATUS = ['DRAFT', 'ACTIVE', 'INACTIVE'];

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
      ...(status && DOCUMENT_STATUS.includes(status)
        ? { status }
        : {}),
      ...(typeId ? { typeId } : {}),
      ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
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

    res.json({ success: true, data: { total, page, pageSize, items } });
  } catch (err) {
    const mapped = prismaErrorToHttp(err);
    if (mapped)
      return res.status(mapped.status).json({ success: false, ...mapped });
    res.status(500).json({ success: false, message: 'Internal error' });
  }
}

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
    if (!doc)
      return res
        .status(404)
        .json({ success: false, message: 'Document not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    const mapped = prismaErrorToHttp(err);
    if (mapped)
      return res.status(mapped.status).json({ success: false, ...mapped });
    res.status(500).json({ success: false, message: 'Internal error' });
  }
}

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

    // garante que o establishment existe
    const est = await prisma.establishment.findUnique({
      where: { id: establishmentId },
      select: { id: true, companyId: true },
    });
    if (!est) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid establishmentId' });
    }

    // garante que o tipo existe (melhor mensagem do que erro de FK)
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
        // currentVersionId é nulo por default
      },
    });

    await registerAudit({
      userId: req.user?.id,
      action: 'CREATE',
      entity: 'Document',
      entityId: created.id,
      details: created.name,
    });

    res.status(201).json({ success: true, data: created });
  } catch (err) {
    const mapped = prismaErrorToHttp(err);
    if (mapped)
      return res.status(mapped.status).json({ success: false, ...mapped });
    res.status(500).json({ success: false, message: 'Internal error' });
  }
}

export async function update(req, res) {
  try {
    const { id } = req.params;
    const data = req.body || {};

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
        return res.status(400).json({
          success: false,
          message: 'Invalid status',
        });
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
    res.json({ success: true, data: updated });
  } catch (err) {
    const mapped = prismaErrorToHttp(err);
    if (mapped)
      return res.status(mapped.status).json({ success: false, ...mapped });
    res.status(500).json({ success: false, message: 'Internal error' });
  }
}

export async function remove(req, res) {
  try {
    const { id } = req.params;
    // soft-delete: marca deletedAt e deixa status INACTIVE
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
    res.json({
      success: true,
      data: deleted,
      message: 'Document soft-deleted',
    });
  } catch (err) {
    const mapped = prismaErrorToHttp(err);
    if (mapped)
      return res.status(mapped.status).json({ success: false, ...mapped });
    res.status(500).json({ success: false, message: 'Internal error' });
  }
}

// troca a versão "vigente" (currentVersionId)
export async function setCurrentVersion(req, res) {
  try {
    const { id, versionId } = req.params;
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
    res.json({ success: true, data: updated });
  } catch (err) {
    const mapped = prismaErrorToHttp(err);
    if (mapped)
      return res.status(mapped.status).json({ success: false, ...mapped });
    res.status(500).json({ success: false, message: 'Internal error' });
  }
}
