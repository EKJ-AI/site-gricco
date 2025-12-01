// src/modules/companies/establishments/departments/department.controller.js
import prisma from '../../../../../prisma/client.js';
import { parsePagination } from '../../../../infra/http/pagination.js';
import { prismaErrorToHttp } from '../../../../infra/http/prismaError.js';
import { registerAudit } from '../../../../utils/audit.js';

export async function list(req, res) {
  try {
    // pode listar por establishmentId (query) ou aninhado /establishments/:establishmentId/departments
    const establishmentId = req.params.establishmentId || req.query.establishmentId || undefined;
    const { q } = req.query;
    const { skip, take, page, pageSize } = parsePagination(req);

    const where = {
      ...(establishmentId ? { establishmentId } : {}),
      ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
    };

    const [total, items] = await Promise.all([
      prisma.department.count({ where }),
      prisma.department.findMany({
        where, skip, take, orderBy: { createdAt: 'desc' },
      }),
    ]);

    return res.json({ success: true, data: { total, page, pageSize, items } });
  } catch (err) {
    const mapped = prismaErrorToHttp(err);
    if (mapped) return res.status(mapped.status).json({ success: false, error: mapped.code, message: mapped.message });
    return res.status(500).json({ success: false, message: 'Internal error' });
  }
}

export async function getById(req, res) {
  try {
    const { id } = req.params;
    const item = await prisma.department.findUnique({ where: { id } });
    if (!item) return res.status(404).json({ success: false, message: 'Department not found' });
    return res.json({ success: true, data: item });
  } catch (err) {
    const mapped = prismaErrorToHttp(err);
    if (mapped) return res.status(mapped.status).json({ success: false, error: mapped.code, message: mapped.message });
    return res.status(500).json({ success: false, message: 'Internal error' });
  }
}

export async function create(req, res) {
  try {
    const body = req.body || {};
    const establishmentId = req.params.establishmentId || body.establishmentId;
    if (!establishmentId) {
      return res.status(400).json({ success: false, message: 'establishmentId is required' });
    }

    // garante que o estabelecimento existe
    const exists = await prisma.establishment.findUnique({ where: { id: establishmentId } });
    if (!exists) return res.status(400).json({ success: false, message: 'Invalid establishmentId' });

    const data = {
      establishmentId,
      name: body.name,
      description: body.description ?? null,
      geoLat: body.geoLat ?? null,
      geoLng: body.geoLng ?? null,
      shift: body.shift ?? null,
      workload: body.workload ?? null,
    };

    const created = await prisma.department.create({ data });

    await registerAudit({
      userId: req.user?.id,
      action: 'CREATE',
      entity: 'Department',
      entityId: created.id,
      details: JSON.stringify({ establishmentId }),
    });

    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    const mapped = prismaErrorToHttp(err);
    if (mapped) return res.status(mapped.status).json({ success: false, error: mapped.code, message: mapped.message });
    return res.status(500).json({ success: false, message: 'Internal error' });
  }
}

export async function update(req, res) {
  try {
    const { id } = req.params;
    const body = req.body || {};

    if (body.establishmentId) {
      // impede mover para establishment inexistente
      const exists = await prisma.establishment.findUnique({ where: { id: body.establishmentId } });
      if (!exists) return res.status(400).json({ success: false, message: 'Invalid establishmentId' });
    }

    const data = {
      establishmentId: body.establishmentId ?? undefined,
      name: body.name ?? undefined,
      description: body.description ?? undefined,
      geoLat: body.geoLat ?? undefined,
      geoLng: body.geoLng ?? undefined,
      shift: body.shift ?? undefined,
      workload: body.workload ?? undefined,
    };

    const updated = await prisma.department.update({ where: { id }, data });

    await registerAudit({
      userId: req.user?.id,
      action: 'UPDATE',
      entity: 'Department',
      entityId: id,
      details: JSON.stringify(Object.keys(body)),
    });

    return res.json({ success: true, data: updated });
  } catch (err) {
    const mapped = prismaErrorToHttp(err);
    if (mapped) return res.status(mapped.status).json({ success: false, error: mapped.code, message: mapped.message });
    return res.status(500).json({ success: false, message: 'Internal error' });
  }
}

export async function remove(req, res) {
  try {
    const { id } = req.params;

    // bloqueia excluir se houver employees vinculados
    const count = await prisma.employee.count({ where: { departmentId: id } });
    if (count > 0) {
      return res.status(400).json({ success: false, message: 'Department has employees linked' });
    }

    await prisma.department.delete({ where: { id } });

    await registerAudit({
      userId: req.user?.id,
      action: 'DELETE',
      entity: 'Department',
      entityId: id,
      details: '',
    });

    return res.json({ success: true, message: 'Department removed' });
  } catch (err) {
    const mapped = prismaErrorToHttp(err);
    if (mapped) return res.status(mapped.status).json({ success: false, error: mapped.code, message: mapped.message });
    return res.status(500).json({ success: false, message: 'Internal error' });
  }
}
