import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { prisma } from '../../infra/prismaClient.js';

const UPLOAD_ROOT = process.env.UPLOAD_ROOT || path.join(process.cwd(), 'uploads');

function ensureDirSync(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function hashBufferSHA256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Lista documentos de um estabelecimento com paginação + busca q
 */
export async function listDocumentsByEstablishment(establishmentId, { page = 1, pageSize = 20, q = '' }) {
  const where = {
    establishmentId,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { type: { name: { contains: q, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };

  const [total, items] = await Promise.all([
    prisma.document.count({ where }),
    prisma.document.findMany({
      where,
      include: {
        type: true,
        currentVersion: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return { items, total, page, pageSize };
}

/**
 * Busca um documento por id, com tipo + currentVersion
 */
export async function getDocumentById(id) {
  const document = await prisma.document.findUnique({
    where: { id },
    include: {
      type: true,
      currentVersion: true,
    },
  });

  return document;
}

/**
 * Cria documento em um estabelecimento.
 * companyId é derivado do Establishment.
 */
export async function createDocument(establishmentId, { name, typeId }) {
  const est = await prisma.establishment.findUnique({
    where: { id: establishmentId },
    select: { id: true, companyId: true },
  });
  if (!est) {
    throw new Error('Establishment not found');
  }

  const doc = await prisma.document.create({
    data: {
      name,
      typeId,
      establishmentId: est.id,
      companyId: est.companyId,
      status: 'DRAFT',
    },
  });

  return doc;
}

/**
 * Atualiza documento
 */
export async function updateDocument(id, data) {
  const { name, typeId, status } = data;
  const doc = await prisma.document.update({
    where: { id },
    data: {
      ...(name != null ? { name } : {}),
      ...(typeId != null ? { typeId } : {}),
      ...(status != null ? { status } : {}),
    },
  });
  return doc;
}

/**
 * Remove documento + versões (e arquivos físicos)
 */
export async function deleteDocument(id) {
  const versions = await prisma.documentVersion.findMany({
    where: { documentId: id },
    select: { storagePath: true },
  });

  await prisma.$transaction([
    prisma.documentVersion.deleteMany({ where: { documentId: id } }),
    prisma.document.delete({ where: { id } }),
  ]);

  // Remove arquivos físicos (best effort)
  for (const v of versions) {
    if (!v.storagePath) continue;
    const full = path.join(process.cwd(), v.storagePath.replace(/^\//, ''));
    try {
      if (fs.existsSync(full)) {
        fs.unlinkSync(full);
      }
    } catch {
      // log se quiser
    }
  }
}

/**
 * Lista versões de um documento
 */
export async function listVersions(documentId) {
  const versions = await prisma.documentVersion.findMany({
    where: { documentId },
    include: {
      uploadedBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { versionNumber: 'desc' },
  });

  return versions;
}

/**
 * Cria nova versão para um documento (upload).
 * - calcula próximo versionNumber
 * - grava arquivo em /uploads/companyId/establishmentId/documentId/versionId/filename
 * - grava sha256, size, storagePath
 * - marca como currentVersion
 */
export async function createDocumentVersion(establishmentId, documentId, file, userId) {
  if (!file) throw new Error('File not provided');

  const document = await prisma.document.findFirst({
    where: { id: documentId, establishmentId },
    select: { id: true, companyId: true, establishmentId: true },
  });

  if (!document) {
    throw new Error('Document not found for this establishment');
  }

  const buffer = file.buffer;
  const sha256 = hashBufferSHA256(buffer);
  const size = file.size;
  const filename = file.originalname;
  const mimeType = file.mimetype || 'application/octet-stream';

  return prisma.$transaction(async (tx) => {
    const agg = await tx.documentVersion.aggregate({
      where: { documentId },
      _max: { versionNumber: true },
    });
    const nextVersion = (agg._max.versionNumber || 0) + 1;

    // Cria registro da versão sem storagePath ainda
    const created = await tx.documentVersion.create({
      data: {
        documentId,
        versionNumber: nextVersion,
        filename,
        mimeType,
        size,
        sha256,
        uploadedByUserId: userId || null,
        versionStatus: 'PUBLISHED',
      },
    });

    // Monta path físico
    const relativeDir = path.posix.join(
      'uploads',
      String(document.companyId),
      String(document.establishmentId),
      String(document.id),
      String(created.id)
    );

    const relativePath = path.posix.join(relativeDir, filename);
    const fullDir = path.join(process.cwd(), relativeDir);
    const fullPath = path.join(process.cwd(), relativePath);

    ensureDirSync(fullDir);
    fs.writeFileSync(fullPath, buffer);

    // Atualiza storagePath + currentVersion do documento
    const updatedVersion = await tx.documentVersion.update({
      where: { id: created.id },
      data: {
        storagePath: `/${relativePath.replace(/\\/g, '/')}`,
        activatedAt: new Date(),
      },
    });

    await tx.document.update({
      where: { id: documentId },
      data: {
        currentVersionId: updatedVersion.id,
        status: 'PUBLISHED',
      },
    });

    return updatedVersion;
  });
}

/**
 * Ativa uma versão específica como currentVersion do documento
 */
export async function activateDocumentVersion(documentId, versionId, userId) {
  const version = await prisma.documentVersion.findFirst({
    where: { id: versionId, documentId },
  });
  if (!version) throw new Error('Version not found for document');

  const now = new Date();

  return prisma.$transaction(async (tx) => {
    // desativar outras se quiser (ex: marcar como ARCHIVED) – aqui só ativa a nova
    const updated = await tx.documentVersion.update({
      where: { id: versionId },
      data: {
        versionStatus: 'PUBLISHED',
        activatedAt: now,
      },
    });

    await tx.document.update({
      where: { id: documentId },
      data: {
        currentVersionId: versionId,
        status: 'PUBLISHED',
      },
    });

    return updated;
  });
}
