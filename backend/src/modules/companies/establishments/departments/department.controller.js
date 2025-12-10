import prisma from '../../../../../prisma/client.js';
import { parsePagination } from '../../../../infra/http/pagination.js';
import { prismaErrorToHttp } from '../../../../infra/http/prismaError.js';
import { registerAudit } from '../../../../utils/audit.js';

export async function list(req, res) {
  try {
    // pode listar por establishmentId (query) ou aninhado /establishments/:establishmentId/departments
    const establishmentId =
      req.params.establishmentId || req.query.establishmentId || undefined;
    const { q, includeInactive, isActive, status } = req.query;
    const { skip, take, page, pageSize } = parsePagination(req);

    // Mesmo padrão dos employees:
    // 1) isActive explícito → usa
    // 2) status (se vier) → converte
    // 3) senão, includeInactive (legado) → default só ativos
    let activeFilter;
    if (typeof isActive !== 'undefined') {
      const v = String(isActive).toLowerCase();
      if (v === 'true' || v === '1') activeFilter = true;
      else if (v === 'false' || v === '0') activeFilter = false;
    } else if (typeof status === 'string' && status) {
      if (status === 'active') activeFilter = true;
      else if (status === 'inactive') activeFilter = false;
    } else {
      const showInactive =
        includeInactive === 'true' || includeInactive === '1';
      if (!showInactive) activeFilter = true;
    }

    const where = {
      ...(establishmentId ? { establishmentId } : {}),
      ...(activeFilter !== undefined ? { isActive: activeFilter } : {}),
      ...(q
        ? {
            name: {
              contains: q,
              mode: 'insensitive',
            },
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      prisma.department.count({ where }),
      prisma.department.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return res.json({
      success: true,
      data: { total, page, pageSize, items },
    });
  } catch (err) {
    const mapped = prismaErrorToHttp(err);
    if (mapped)
      return res
        .status(mapped.status)
        .json({
          success: false,
          error: mapped.code,
          message: mapped.message,
        });
    return res
      .status(500)
      .json({ success: false, message: 'Internal error' });
  }
}

export async function getById(req, res) {
  try {
    const { id } = req.params;
    const item = await prisma.department.findUnique({ where: { id } });
    if (!item)
      return res
        .status(404)
        .json({ success: false, message: 'Department not found' });
    return res.json({ success: true, data: item });
  } catch (err) {
    const mapped = prismaErrorToHttp(err);
    if (mapped)
      return res
        .status(mapped.status)
        .json({
          success: false,
          error: mapped.code,
          message: mapped.message,
        });
    return res
      .status(500)
      .json({ success: false, message: 'Internal error' });
  }
}

export async function create(req, res) {
  try {
    const body = req.body || {};
    const establishmentId =
      req.params.establishmentId || body.establishmentId;
    if (!establishmentId) {
      return res.status(400).json({
        success: false,
        message: 'establishmentId is required',
      });
    }

    // garante que o estabelecimento existe
    const exists = await prisma.establishment.findUnique({
      where: { id: establishmentId },
    });
    if (!exists)
      return res
        .status(400)
        .json({ success: false, message: 'Invalid establishmentId' });

    const data = {
      establishmentId,
      name: body.name,
      description: body.description ?? null,
      geoLat: body.geoLat ?? null,
      geoLng: body.geoLng ?? null,
      shift: body.shift ?? null,
      workload: body.workload ?? null,
      isActive: true,
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
    if (mapped)
      return res
        .status(mapped.status)
        .json({
          success: false,
          error: mapped.code,
          message: mapped.message,
        });
    return res
      .status(500)
      .json({ success: false, message: 'Internal error' });
  }
}

export async function update(req, res) {
  try {
    const { id } = req.params;
    const body = req.body || {};

    if (body.establishmentId) {
      // impede mover para establishment inexistente
      const exists = await prisma.establishment.findUnique({
        where: { id: body.establishmentId },
      });
      if (!exists)
        return res
          .status(400)
          .json({ success: false, message: 'Invalid establishmentId' });
    }

    const data = {
      establishmentId: body.establishmentId ?? undefined,
      name: body.name ?? undefined,
      description: body.description ?? undefined,
      geoLat: body.geoLat ?? undefined,
      geoLng: body.geoLng ?? undefined,
      shift: body.shift ?? undefined,
      workload: body.workload ?? undefined,
      isActive:
        typeof body.isActive === 'boolean'
          ? body.isActive
          : undefined,
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
    if (mapped)
      return res
        .status(mapped.status)
        .json({
          success: false,
          error: mapped.code,
          message: mapped.message,
        });
    return res
      .status(500)
      .json({ success: false, message: 'Internal error' });
  }
}

export async function remove(req, res) {
  try {
    const { id } = req.params;

    // bloqueia excluir (mesmo soft) se houver employees vinculados
    const count = await prisma.employee.count({
      where: { departmentId: id },
    });
    if (count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Department has employees linked',
      });
    }

    // soft delete: apenas marca isActive = false
    await prisma.department.update({
      where: { id },
      data: { isActive: false },
    });

    await registerAudit({
      userId: req.user?.id,
      action: 'DELETE',
      entity: 'Department',
      entityId: id,
      details: '',
    });

    return res.json({
      success: true,
      message: 'Department removed (soft delete)',
    });
  } catch (err) {
    const mapped = prismaErrorToHttp(err);
    if (mapped)
      return res
        .status(mapped.status)
        .json({
          success: false,
          error: mapped.code,
          message: mapped.message,
        });
    return res
      .status(500)
      .json({ success: false, message: 'Internal error' });
  }
}
