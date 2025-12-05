// src/modules/companies/establishments/documents/documentAccess.controller.js
import prisma from '../../../../../prisma/client.js';
import { prismaErrorToHttp } from '../../../../infra/http/prismaError.js';
import { resolveDocumentAccess, canReadDocs } from './document.access.js';
import { registerDocumentVersionAccess } from '../../../../utils/documentAccessLog.js';
import { extractRequestMeta } from '../../../../utils/httpMeta.js';

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

    // se veio versionId, valida que pertence ao doc
    let version = null;
    if (versionId) {
      version = await prisma.documentVersion.findUnique({
        where: { id: versionId },
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
      return res.status(mapped.status).json({ success: false, ...mapped });
    }
    return res
      .status(500)
      .json({ success: false, message: 'Internal error' });
  }
}
