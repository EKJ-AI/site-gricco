import { parsePagination } from '../../infra/http/pagination.js';
import prisma from '../../../prisma/client.js';
import logger from '../../utils/logger.js';
import { registerAudit } from '../../utils/audit.js';
import { prismaErrorToHttp } from '../../infra/http/prismaError.js';

function normalizePermissionIds(input) {
  if (!Array.isArray(input)) return [];
  return input
    .map((x) => {
      // pode vir string id, ou objeto {id,name}
      if (x == null) return null;
      if (typeof x === 'string') return x;
      if (typeof x === 'object' && x.id) return String(x.id);
      return String(x);
    })
    .filter(Boolean);
}

export async function list(req, res) {
  try {
    logger.info('📥 GET /profile chamado');

    const { skip, take, page, pageSize } = parsePagination(req);

    const [total, profiles] = await Promise.all([
      prisma.profile.count(),
      prisma.profile.findMany({
        skip,
        take,
        include: {
          permissions: {
            include: { permission: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const result = profiles.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      permissions: (p.permissions || []).map((pp) => ({
        id: pp.permission.id,
        name: pp.permission.name,
      })),
    }));

    return res.json({
      success: true,
      data: {
        total,
        page,
        pageSize,
        items: result,
      },
    });
  } catch (err) {
    logger.error(`Erro ao listar perfis: ${err.message}`, err);
    const mapped = prismaErrorToHttp(err);
    if (mapped)
      return res
        .status(mapped.status)
        .json({ success: false, error: mapped.code, message: mapped.message });
    return res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
}

export async function create(req, res) {
  try {
    const { name, description } = req.body;
    const permissions = normalizePermissionIds(req.body?.permissions);

    if (!name) {
      return res.status(400).json({ success: false, message: 'Nome é obrigatório' });
    }

    const newProfile = await prisma.profile.create({
      data: {
        name,
        description,
        permissions: {
          create: permissions.map((pid) => ({ permissionId: pid })),
        },
      },
      include: {
        permissions: { include: { permission: true } },
      },
    });

    await registerAudit({
      userId: req.user?.id,
      action: 'CREATE_PROFILE',
      entity: 'Profile',
      entityId: newProfile.id,
      details: `Perfil criado: ${newProfile.name}`,
    });

    // devolve no mesmo shape do list (pra facilitar front)
    return res.status(201).json({
      success: true,
      data: {
        id: newProfile.id,
        name: newProfile.name,
        description: newProfile.description,
        permissions: (newProfile.permissions || []).map((pp) => ({
          id: pp.permission.id,
          name: pp.permission.name,
        })),
      },
    });
  } catch (err) {
    logger.error(`Erro ao criar perfil: ${err.message}`, err);
    const mapped = prismaErrorToHttp(err);
    if (mapped)
      return res
        .status(mapped.status)
        .json({ success: false, error: mapped.code, message: mapped.message });
    return res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
}

export async function update(req, res) {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const permissions = normalizePermissionIds(req.body?.permissions);

    const updatedProfile = await prisma.profile.update({
      where: { id },
      data: {
        name,
        description,
        permissions: {
          deleteMany: {},
          create: permissions.map((pid) => ({ permissionId: pid })),
        },
      },
      include: {
        permissions: { include: { permission: true } },
      },
    });

    await registerAudit({
      userId: req.user?.id,
      action: 'UPDATE_PROFILE',
      entity: 'Profile',
      entityId: id,
      details: `Perfil atualizado: ${name ?? updatedProfile.name}`,
    });

    return res.json({
      success: true,
      message: 'Perfil atualizado com sucesso',
      data: {
        id: updatedProfile.id,
        name: updatedProfile.name,
        description: updatedProfile.description,
        permissions: (updatedProfile.permissions || []).map((pp) => ({
          id: pp.permission.id,
          name: pp.permission.name,
        })),
      },
    });
  } catch (err) {
    logger.error(`Erro ao atualizar perfil: ${err.message}`, err);
    const mapped = prismaErrorToHttp(err);
    if (mapped)
      return res
        .status(mapped.status)
        .json({ success: false, error: mapped.code, message: mapped.message });
    return res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
}

export async function remove(req, res) {
  try {
    const { id } = req.params;

    // tenta apagar (vai falhar se tiver FK, ex: User.profileId)
    await prisma.profile.delete({ where: { id } });

    await registerAudit({
      userId: req.user?.id,
      action: 'DELETE_PROFILE',
      entity: 'Profile',
      entityId: id,
      details: `Perfil deletado: ${id}`,
    });

    return res.json({ success: true, message: 'Perfil deletado com sucesso' });
  } catch (err) {
    logger.error(`Erro ao deletar perfil: ${err.message}`, err);

    // ✅ mensagens melhores pros casos reais
    // Prisma: FK constraint -> P2003; Not found -> P2025
    if (err?.code === 'P2003') {
      return res.status(400).json({
        success: false,
        error: 'PROFILE_IN_USE',
        message: 'Não é possível excluir este perfil porque existem usuários vinculados a ele.',
      });
    }
    if (err?.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'PROFILE_NOT_FOUND',
        message: 'Perfil não encontrado.',
      });
    }

    const mapped = prismaErrorToHttp(err);
    if (mapped)
      return res
        .status(mapped.status)
        .json({ success: false, error: mapped.code, message: mapped.message });

    return res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
}
