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
import {
  resolveEstablishmentAccess,
  resolveDocumentAccess,
  canReadDocs,
  canWriteDocs,
} from './document.access.js';
import logger from '../../../../utils/logger.js';

/**
 * Helper centralizado para registrar logs de acesso a documentos
 * (VIEW / DOWNLOAD / UPLOAD).
 */
async function registerDocumentAccess(req, { documentId, documentVersionId = null, action }) {
  try {
    await prisma.documentAccessLog.create({
      data: {
        documentId,
        documentVersionId,
        userId: req.user?.id ?? null,
        action,
        ip: req.ip || null,
        userAgent: req.get('user-agent') || null,
      },
    });
  } catch (err) {
    logger.warn(
      `[DOC_ACCESS_LOG] Failed to register ${action} for doc=${documentId} version=${documentVersionId}: ${err.message}`,
      err,
    );
  }
}

export async function list(req, res) {
  try {
    const { documentId } = req.params;
    const { skip, take, page, pageSize } = parsePagination(req);

    // 🔹 Autorização de leitura já foi garantida por ensureDocumentAccess({ mode: 'read' })
    // Aqui apenas garantimos que o documento existe.
    const doc = await prisma.document.findUnique({
      where: { id: documentId },
      select: { id: true },
    });

    if (!doc) {
      return res
        .status(404)
        .json({ success: false, message: 'Document not found' });
    }

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

																										 
    // ✅ Permissão já foi garantida por ensureDocumentAccess({ mode: 'write' })
    // Aqui apenas garantimos se o doc pertence ao estabelecimento da rota.

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

    // 🔹 descrição do upload / o que mudou nesta versão
    const rawChangeDesc = req.body?.changeDescription;
    const changeDescription =
      typeof rawChangeDesc === 'string' && rawChangeDesc.trim()
        ? rawChangeDesc.trim().slice(0, 2000)
        : null;

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
        changeDescription, // 👈 grava descrição da mudança
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

    // 🔹 LOG: UPLOAD
    await registerDocumentAccess(req, {
      documentId,
      documentVersionId: updated.id,
      action: 'UPLOAD',
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
        document: { select: { id: true, establishmentId: true } },
      },
    });
    if (!ver) {
      return res
        .status(404)
        .json({ success: false, message: 'Version not found' });
    }

    const access = await resolveEstablishmentAccess(
      req.user,
      ver.document.establishmentId,
    );
    if (!canReadDocs(access)) {
      return res
        .status(403)
        .json({ success: false, message: 'Forbidden (no access to this document)' });
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

    const access = await resolveEstablishmentAccess(
      req.user,
      ver.document.establishmentId,
    );
    if (!canWriteDocs(access)) {
      return res
        .status(403)
        .json({ success: false, message: 'Forbidden (no write access to this document)' });
    }

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
      include: {
        document: true,
      },
    });
    if (!ver) {
      return res
        .status(404)
        .json({ success: false, message: 'Version not found' });
    }

    const access = await resolveEstablishmentAccess(
      req.user,
      ver.document.establishmentId,
    );
    if (!canWriteDocs(access)) {
      return res
        .status(403)
        .json({ success: false, message: 'Forbidden (no write access to this document)' });
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

    const access = await resolveEstablishmentAccess(
      req.user,
      ver.document.establishmentId,
    );
    if (!canWriteDocs(access)) {
      return res
        .status(403)
        .json({ success: false, message: 'Forbidden (no write access to this document)' });
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
      include: {
        document: true,
      },
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

    const access = await resolveEstablishmentAccess(
      req.user,
      ver.document.establishmentId,
    );
    if (!canWriteDocs(access)) {
      return res
        .status(403)
        .json({ success: false, message: 'Forbidden (no write access to this document)' });
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

/**
 * Atualizar apenas metadados da versão (hoje: changeDescription).
 * Rota sugerida:
 * PUT /api/companies/:companyId/establishments/:establishmentId/documents/:documentId/versions/:versionId
 */
export async function updateFromDocument(req, res) {
  try {
    const { documentId, versionId } = req.params;
    const { changeDescription } = req.body || {};

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

    const access = await resolveEstablishmentAccess(
      req.user,
      ver.document.establishmentId,
    );
    if (!canWriteDocs(access)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden (no write access to this document)',
      });
    }

    const normalizedDescription =
      typeof changeDescription === 'string' && changeDescription.trim()
        ? changeDescription.trim().slice(0, 2000)
        : null;

    const updated = await prisma.documentVersion.update({
      where: { id: versionId },
      data: { changeDescription: normalizedDescription },
    });

    await registerAudit({
      userId: req.user?.id,
      action: 'UPDATE',
      entity: 'DocumentVersion',
      entityId: versionId,
      details: 'UPDATE_DESCRIPTION',
    });

    return res.json({ success: true, data: updated });
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
 * Novo endpoint: acesso ao arquivo (VIEW / DOWNLOAD).
 * GET /api/companies/:companyId/establishments/:establishmentId/documents/:documentId/versions/:versionId/file?mode=view|download
 */
export async function accessFile(req, res) {
  try {
    const { companyId, establishmentId, documentId, versionId } = req.params;
    const mode = req.query.mode === 'download' ? 'download' : 'view';

    const ver = await prisma.documentVersion.findUnique({
      where: { id: versionId },
      include: {
        document: true,
      },
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

    if (String(ver.document.establishmentId) !== String(establishmentId)) {
      return res.status(400).json({
        success: false,
        message: 'Document does not belong to this Establishment',
      });
    }

    // 🔐 Usa a MESMA lógica de acesso que o resto (resolveDocumentAccess + canReadDocs)
    const { doc, access } = await resolveDocumentAccess(req.user, documentId);

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

    if (!ver.storagePath) {
      return res
        .status(404)
        .json({ success: false, message: 'File not available' });
    }

    // 🔹 LOG: VIEW ou DOWNLOAD
    await registerDocumentAccess(req, {
      documentId,
      documentVersionId: ver.id,
      action: mode === 'download' ? 'DOWNLOAD' : 'VIEW',
    });

    // redireciona para o arquivo físico
    return res.redirect(ver.storagePath);
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
