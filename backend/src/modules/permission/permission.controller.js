import { parsePagination } from '../../infra/http/pagination.js';
import prisma from '../../../prisma/client.js';
import logger from '../../utils/logger.js';
import { registerAudit } from '../../utils/audit.js';
import { prismaErrorToHttp } from '../../infra/http/prismaError.js';

export async function list(req, res) {
  try {
    logger.info('📥 GET /permission chamado');

    const all = String(req.query.all ?? '').toLowerCase();
    const q = req.query.q ? String(req.query.q) : undefined;

    const where = q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {};

    // quando all=1/true -> retorna tudo sem paginação
    if (all === '1' || all === 'true') {
      const permissions = await prisma.permission.findMany({
        where,
        orderBy: { name: 'asc' },
      });

      return res.json({
        success: true,
        data: {
          total: permissions.length,
          page: 1,
          pageSize: permissions.length,
          items: permissions,
        },
      });
    }

    // modo paginado (comportamento atual)
    const { skip, take, page, pageSize } = parsePagination(req);

    const [total, permissions] = await Promise.all([
      prisma.permission.count({ where }),
      prisma.permission.findMany({
        where,
        skip,
        take,
        orderBy: [{ createdAt: 'desc' }, { name: 'asc' }],
      }),
    ]);

    res.json({
      success: true,
      data: {
        total,
        page,
        pageSize,
        items: permissions,
      },
    });
  } catch (err) {
    logger.error(`Erro ao listar permissões: ${err.message}`, err);
    const mapped = prismaErrorToHttp(err);
    if (mapped)
      return res
        .status(mapped.status)
        .json({ success: false, error: mapped.code, message: mapped.message });
    res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
}

export async function create(req, res) {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Nome é obrigatório' });
    }

    const exists = await prisma.permission.findUnique({ where: { name } });
    if (exists) {
      return res.status(400).json({ success: false, message: 'Permissão já existe' });
    }

    const permission = await prisma.permission.create({
      data: { name, description },
    });

    await registerAudit({
      userId: req.user?.id,
      action: 'CREATE_PERMISSION',
      entity: 'Permission',
      entityId: permission.id,
      details: `Permissão criada: ${permission.name}`,
    });

    res.status(201).json({ success: true, data: permission });
  } catch (err) {
    logger.error(`Erro ao criar permissão: ${err.message}`, err);
    const mapped = prismaErrorToHttp(err);
    if (mapped)
      return res
        .status(mapped.status)
        .json({ success: false, error: mapped.code, message: mapped.message });
    res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
}

export async function remove(req, res) {
  try {
    const { id } = req.params;

    await prisma.permission.delete({
      where: { id },
    });

    await registerAudit({
      userId: req.user?.id,
      action: 'DELETE_PERMISSION',
      entity: 'Permission',
      entityId: id,
      details: `Permissão deletada: ${id}`,
    });

    res.json({ success: true, message: 'Permissão deletada com sucesso' });
  } catch (err) {
    logger.error(`Erro ao deletar permissão: ${err.message}`, err);
    const mapped = prismaErrorToHttp(err);
    if (mapped)
      return res
        .status(mapped.status)
        .json({ success: false, error: mapped.code, message: mapped.message });
    res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
}
