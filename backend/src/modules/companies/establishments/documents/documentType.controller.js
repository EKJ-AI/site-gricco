// src/modules/companies/documents/documentType.controller.js
import prisma from '../../../../../prisma/client.js';
import { parsePagination } from '../../../../infra/http/pagination.js';
import { prismaErrorToHttp } from '../../../../infra/http/prismaError.js';
import { registerAudit } from '../../../../utils/audit.js';

export async function list(req, res) {
  try {
    const { q, kind } = req.query;
    const { skip, take, page, pageSize } = parsePagination(req);

    const where = {
      ...(q
        ? { name: { contains: q, mode: 'insensitive' } }
        : {}),
      ...(kind
        ? { kind } // MAIN / EVIDENCE / OTHER
        : {}),
    };

    const [total, items] = await Promise.all([
      prisma.documentType.count({ where }),
      prisma.documentType.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
      }),
    ]);

    res.json({ success: true, data: { total, page, pageSize, items } });
  } catch (err) {
    const mapped = prismaErrorToHttp(err);
    if (mapped) return res.status(mapped.status).json({ success: false, ...mapped });
    return res.status(500).json({ success: false, message: 'Internal error' });
  }
}

export async function getById(req, res) {
  try {
    const { id } = req.params;
    const item = await prisma.documentType.findUnique({ where: { id } });
    if (!item) return res.status(404).json({ success: false, message: 'DocumentType not found' });
    res.json({ success: true, data: item });
  } catch (err) {
    const mapped = prismaErrorToHttp(err);
    if (mapped) return res.status(mapped.status).json({ success: false, ...mapped });
    return res.status(500).json({ success: false, message: 'Internal error' });
  }
}

export async function create(req, res) {
  try {
    const data = req.body || {};
    const created = await prisma.documentType.create({ data });
    await registerAudit({
      userId: req.user?.id,
      action: 'CREATE',
      entity: 'DocumentType',
      entityId: created.id,
      details: created.name,
    });
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    const mapped = prismaErrorToHttp(err);
    if (mapped) return res.status(mapped.status).json({ success: false, ...mapped });
    return res.status(500).json({ success: false, message: 'Internal error' });
  }
}

export async function update(req, res) {
  try {
    const { id } = req.params;
    const data = req.body || {};
    const updated = await prisma.documentType.update({ where: { id }, data });
    await registerAudit({
      userId: req.user?.id,
      action: 'UPDATE',
      entity: 'DocumentType',
      entityId: id,
      details: JSON.stringify(Object.keys(data)),
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    const mapped = prismaErrorToHttp(err);
    if (mapped) return res.status(mapped.status).json({ success: false, ...mapped });
    return res.status(500).json({ success: false, message: 'Internal error' });
  }
}

export async function remove(req, res) {
  try {
    const { id } = req.params;
    await prisma.documentType.delete({ where: { id } });
    await registerAudit({
      userId: req.user?.id,
      action: 'DELETE',
      entity: 'DocumentType',
      entityId: id,
      details: '',
    });
    res.json({ success: true, message: 'DocumentType removed' });
  } catch (err) {
    const mapped = prismaErrorToHttp(err);
    if (mapped) return res.status(mapped.status).json({ success: false, ...mapped });
    return res.status(500).json({ success: false, message: 'Internal error' });
  }
}
