// src/modules/companies/documents/documentVersion.controller.js
import fs from 'node:fs';
import path from 'node:path';
import prisma from '../../../../../prisma/client.js';
import { parsePagination } from '../../../../infra/http/pagination.js';
import { prismaErrorToHttp } from '../../../../infra/http/prismaError.js';
import { registerAudit } from '../../../../utils/audit.js';
import {
  sanitizeFilename,
  sha256OfBuffer,
  buildStoragePath,
} from '../../../uploads/upload.utils.js';

export async function list(req, res) {
  try {
    const { documentId } = req.params;
    const { skip, take, page, pageSize } = parsePagination(req);

    const where = { documentId, deletedAt: null };

    const [total, items] = await Promise.all([
      prisma.documentVersion.count({ where }),
      prisma.documentVersion.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          uploadedBy: { select: { id: true, name: true, email: true } },
        },
      }),
    ]);

    res.json({ success: true, data: { total, page, pageSize, items } });
  } catch (err) {
    const mapped = prismaErrorToHttp(err);
    if (mapped) {
      return res.status(mapped.status).json({ success: false, ...mapped });
    }
    res
      .status(500)
      .json({ success: false, message: 'Internal error' });
  }
}

// upload nova versão (já com arquivo salvo pelo Multer)
export async function uploadNew(req, res) {
  try {
    const { documentId } = req.params;
    const establishmentIdParam = req.params.establishmentId || null;
    let companyId = req.params.companyId || null;

    const doc = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        establishment: {
          select: { id: true, companyId: true },
        },
      },
    });

    if (!doc) {
      return res
        .status(404)
        .json({ success: false, message: 'Document not found' });
    }

    const establishmentIdFromDoc =
      doc.establishmentId || doc.establishment?.id || null;

    if (
      establishmentIdParam &&
      establishmentIdFromDoc &&
      establishmentIdParam !== establishmentIdFromDoc
    ) {
      return res.status(400).json({
        success: false,
        message: 'Document does not belong to this Establishment',
      });
    }

    const effectiveEstablishmentId =
      establishmentIdParam || establishmentIdFromDoc;

    if (!companyId) {
      companyId = doc.establishment?.companyId || null;
    }

    if (!companyId || !effectiveEstablishmentId) {
      return res.status(400).json({
        success: false,
        message: 'Unable to resolve company/establishment for document',
      });
    }

    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: 'File is required' });
    }

    const buf = fs.readFileSync(req.file.path);
    const sha = sha256OfBuffer(buf);

    // pega próximo versionNumber
    const last = await prisma.documentVersion.findFirst({
      where: { documentId },
      orderBy: { versionNumber: 'desc' },
      select: { versionNumber: true },
    });
    const versionNumber = (last?.versionNumber ?? 0) + 1;

    const filename = sanitizeFilename(req.file.originalname);

    // cria a versão (para obter id)
    const created = await prisma.documentVersion.create({
      data: {
        documentId,
        versionNumber,
        versionStatus: 'ARCHIVED', // só vira vigente quando ativar
        filename,
        storagePath: '', // será preenchido após renomear/mover
        mimetype: req.file.mimetype,
        size: req.file.size,
        sha256: sha,
        uploadedByUserId: req.user?.id ?? null,
      },
    });

    // renomeia arquivo físico para incluir o id da versão no nome
    const newName = `${created.id}__${filename}`;
    const newPath = path.join(path.dirname(req.file.path), newName);
    fs.renameSync(req.file.path, newPath);

    const storagePath = buildStoragePath({
      companyId,
      establishmentId: effectiveEstablishmentId,
      documentId,
      versionId: created.id,
      originalName: filename,
    });

    const updated = await prisma.documentVersion.update({
      where: { id: created.id },
      data: { storagePath },
    });

    await registerAudit({
      userId: req.user?.id,
      action: 'CREATE',
      entity: 'DocumentVersion',
      entityId: updated.id,
      details: JSON.stringify({ documentId, versionNumber }),
    });

    res.status(201).json({ success: true, data: updated });
  } catch (err) {
    try {
      if (req?.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    } catch {
      // ignore
    }
    const mapped = prismaErrorToHttp(err);
    if (mapped) {
      return res
        .status(mapped.status)
        .json({ success: false, ...mapped });
    }
    res
      .status(500)
      .json({ success: false, message: 'Internal error' });
  }
}

export async function getById(req, res) {
  try {
    const { id } = req.params;
    const ver = await prisma.documentVersion.findUnique({
      where: { id },
      include: {
        uploadedBy: { select: { id: true, name: true, email: true } },
      },
    });
    if (!ver) {
      return res
        .status(404)
        .json({ success: false, message: 'Version not found' });
    }
    res.json({ success: true, data: ver });
  } catch (err) {
    const mapped = prismaErrorToHttp(err);
    if (mapped) {
      return res
        .status(mapped.status)
        .json({ success: false, ...mapped });
    }
    res
      .status(500)
      .json({ success: false, message: 'Internal error' });
  }
}

// arquivar explicitamente uma versão (rota antiga: PUT /:id/archive)
export async function archive(req, res) {
  try {
    const { id } = req.params;

    const ver = await prisma.documentVersion.findUnique({
      where: { id },
      include: {
        document: true,
      },
    });

    if (!ver) {
      return res
        .status(404)
        .json({ success: false, message: 'Version not found' });
    }

    const now = new Date();

    const [updatedVersion, updatedDoc] = await prisma.$transaction(
      async (tx) => {
        const v = await tx.documentVersion.update({
          where: { id },
          data: { versionStatus: 'ARCHIVED', deletedAt: ver.deletedAt ?? null },
        });

        let d = null;

        if (ver.document.currentVersionId === ver.id) {
          d = await tx.document.update({
            where: { id: ver.documentId },
            data: {
              currentVersionId: null,
              status: 'INACTIVE',
            },
          });
        }

        return [v, d];
      }
    );

    await registerAudit({
      userId: req.user?.id,
      action: 'UPDATE',
      entity: 'DocumentVersion',
      entityId: id,
      details: 'ARCHIVED',
    });

    res.json({ success: true, data: updatedVersion, document: updatedDoc });
  } catch (err) {
    const mapped = prismaErrorToHttp(err);
    if (mapped) {
      return res
        .status(mapped.status)
        .json({ success: false, ...mapped });
    }
    res
      .status(500)
      .json({ success: false, message: 'Internal error' });
  }
}

// ativar (rota antiga: PUT /:id/activate)
export async function activate(req, res) {
  try {
    const { id } = req.params;
    const ver = await prisma.documentVersion.findUnique({
      where: { id },
    });
    if (!ver) {
      return res
        .status(404)
        .json({ success: false, message: 'Version not found' });
    }

    const now = new Date();

    const updatedDoc = await prisma.$transaction(async (tx) => {
      // arquiva todas as outras versões do documento
      await tx.documentVersion.updateMany({
        where: { documentId: ver.documentId, id: { not: id } },
        data: { versionStatus: 'ARCHIVED' },
      });

      await tx.documentVersion.update({
        where: { id },
        data: {
          versionStatus: 'PUBLISHED',
          activatedAt: now,
        },
      });

      return tx.document.update({
        where: { id: ver.documentId },
        data: {
          currentVersionId: ver.id,
          status: 'ACTIVE',
        },
      });
    });

    await registerAudit({
      userId: req.user?.id,
      action: 'UPDATE',
      entity: 'Document',
      entityId: updatedDoc.id,
      details: `activate version ${id}`,
    });

    res.json({ success: true, data: updatedDoc });
  } catch (err) {
    const mapped = prismaErrorToHttp(err);
    if (mapped) {
      return res
        .status(mapped.status)
        .json({ success: false, ...mapped });
    }
    res
      .status(500)
      .json({ success: false, message: 'Internal error' });
  }
}

// -------- rotas novas, com documentId + versionId ---------

export async function archiveFromDocument(req, res) {
  try {
    const { documentId, versionId } = req.params;
    const ver = await prisma.documentVersion.findUnique({
      where: { id: versionId },
      include: { document: true },
    });
    if (!ver || ver.documentId !== documentId) {
      return res.status(400).json({
        success: false,
        message: 'Version does not belong to document',
      });
    }

    const [updatedVersion, updatedDoc] = await prisma.$transaction(
      async (tx) => {
        const v = await tx.documentVersion.update({
          where: { id: versionId },
          data: { versionStatus: 'ARCHIVED' },
        });

        let d = null;
        if (ver.document.currentVersionId === ver.id) {
          d = await tx.document.update({
            where: { id: documentId },
            data: {
              currentVersionId: null,
              status: 'INACTIVE',
            },
          });
        }

        return [v, d];
      }
    );

    await registerAudit({
      userId: req.user?.id,
      action: 'UPDATE',
      entity: 'DocumentVersion',
      entityId: versionId,
      details: 'ARCHIVED',
    });

    res.json({ success: true, data: updatedVersion, document: updatedDoc });
  } catch (err) {
    const mapped = prismaErrorToHttp(err);
    if (mapped) {
      return res
        .status(mapped.status)
        .json({ success: false, ...mapped });
    }
    res
      .status(500)
      .json({ success: false, message: 'Internal error' });
  }
}

export async function activateFromDocument(req, res) {
  try {
    const { documentId, versionId } = req.params;
    const ver = await prisma.documentVersion.findUnique({
      where: { id: versionId },
    });
    if (!ver) {
      return res
        .status(404)
        .json({ success: false, message: 'Version not found' });
    }
    if (ver.documentId !== documentId) {
      return res.status(400).json({
        success: false,
        message: 'Version does not belong to document',
      });
    }

    const now = new Date();

    const updatedDoc = await prisma.$transaction(async (tx) => {
      await tx.documentVersion.updateMany({
        where: { documentId, id: { not: versionId } },
        data: { versionStatus: 'ARCHIVED' },
      });

      await tx.documentVersion.update({
        where: { id: versionId },
        data: {
          versionStatus: 'PUBLISHED',
          activatedAt: now,
        },
      });

      return tx.document.update({
        where: { id: documentId },
        data: {
          currentVersionId: ver.id,
          status: 'ACTIVE',
        },
      });
    });

    await registerAudit({
      userId: req.user?.id,
      action: 'UPDATE',
      entity: 'Document',
      entityId: updatedDoc.id,
      details: `activate version ${versionId}`,
    });

    res.json({ success: true, data: updatedDoc });
  } catch (err) {
    const mapped = prismaErrorToHttp(err);
    if (mapped) {
      return res
        .status(mapped.status)
        .json({ success: false, ...mapped });
    }
    res
      .status(500)
      .json({ success: false, message: 'Internal error' });
  }
}
