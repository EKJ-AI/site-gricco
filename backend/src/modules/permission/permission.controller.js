import prisma from '../../../prisma/client.js';
import logger from '../../utils/logger.js';
import { registerAudit } from '../../utils/audit.js';

export async function list(req, res) {
  try {
    logger.info('📥 GET /permission chamado');

    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;

    const [total, permissions] = await Promise.all([
      prisma.permission.count(),
      prisma.permission.findMany({
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' }
      })
    ]);

    res.json({
      success: true,
      data: {
        total,
        page,
        pageSize,
        items: permissions
      }
    });
  } catch (err) {
    logger.error(`Erro ao listar permissões: ${err.message}`, err);
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
      data: { name, description }
    });

    await registerAudit({
      userId: req.user?.id,
      action: 'CREATE_PERMISSION',
      entity: 'Permission',
      entityId: permission.id,
      details: `Permissão criada: ${permission.name}`
    });

    res.status(201).json({ success: true, data: permission });
  } catch (err) {
    logger.error(`Erro ao criar permissão: ${err.message}`, err);
    res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
}

export async function remove(req, res) {
  try {
    const { id } = req.params;

    await prisma.permission.delete({
      where: { id }
    });

    await registerAudit({
      userId: req.user?.id,
      action: 'DELETE_PERMISSION',
      entity: 'Permission',
      entityId: id,
      details: `Permissão deletada: ${id}`
    });

    res.json({ success: true, message: 'Permissão deletada com sucesso' });
  } catch (err) {
    logger.error(`Erro ao deletar permissão: ${err.message}`, err);
    res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
}
