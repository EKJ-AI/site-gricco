// src/modules/utils/documentAccessLog.js
import prisma from '../../prisma/client.js';

export async function registerDocumentVersionAccess({
  companyId,
  establishmentId,
  documentId,
  versionId,
  userId,
  action,
  ip,
  userAgent,
}) {
  if (!documentId || !action) return;

  try {
    await prisma.documentVersionAccessLog.create({
      data: {
        companyId,
        establishmentId,
        documentId,
        versionId: versionId || null,
        userId: userId || null,
        action,
        ip: ip || null,
        userAgent: userAgent || null,
      },
    });
  } catch (err) {
    // não quebra o fluxo por causa de log
    console.error('[DOC-ACCESS-LOG] Failed to register access', err);
  }
}
