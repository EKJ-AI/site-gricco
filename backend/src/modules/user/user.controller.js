import { parsePagination } from '../../infra/http/pagination.js';
import prisma from '../../../prisma/client.js';
import bcrypt from 'bcrypt';
import logger from '../../utils/logger.js';
import { registerAudit } from '../../utils/audit.js';
import { prismaErrorToHttp } from '../../infra/http/prismaError.js';

export async function getMe(req, res) {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: {
          include: {
            permissions: { include: { permission: true } },
          },
        },
      },
    });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: 'Usuário não encontrado' });
    }

    const permissions = user.profile.permissions.map((p) => p.permission.name);

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        profileId: user.profileId,
        isActive: user.isActive,
        profile: {
          id: user.profile.id,
          name: user.profile.name,
          permissions,
        },
      },
    });
  } catch (error) {
    logger.error(`Erro em getMe: ${error.message}`, error);
    const mapped = prismaErrorToHttp(error);
    if (mapped) {
      return res.status(mapped.status).json({
        success: false,
        error: mapped.code,
        message: mapped.message,
      });
    }
    res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
}

export async function list(req, res) {
  try {
    logger.info('📥 GET /users chamado');

    const { skip, take, page, pageSize } = parsePagination(req);
    const { q, status, includeInactive, isActive } = req.query;

    const whereSearch = {};

    if (q && String(q).trim()) {
      const term = String(q).trim();
      whereSearch.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
      ];
    }

    // --------- Filtro de status unificado ---------
    let whereIsActive = {};

    if (typeof status === 'string') {
      const s = status.toLowerCase();
      if (s === 'active') whereIsActive = { isActive: true };
      else if (s === 'inactive') whereIsActive = { isActive: false };
      else if (s === 'all') whereIsActive = {};
    } else if (typeof isActive !== 'undefined') {
      const v = String(isActive).toLowerCase();
      if (v === 'true' || v === '1') whereIsActive = { isActive: true };
      else if (v === 'false' || v === '0') whereIsActive = { isActive: false };
    } else if (typeof includeInactive !== 'undefined') {
      const inc = String(includeInactive).toLowerCase();
      const showAll = inc === 'true' || inc === '1';
      whereIsActive = showAll ? {} : { isActive: true };
    } else {
      whereIsActive = { isActive: true };
    }

    const where = {
      ...whereSearch,
      ...whereIsActive,
    };

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take,
        include: { profile: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const items = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
        isActive: u.isActive,
      profileId: u.profileId,
      profile: u.profile ? { id: u.profile.id, name: u.profile.name } : null,
    }));

    res.json({
      success: true,
      data: {
        total,
        page,
        pageSize,
        items,
      },
    });
  } catch (err) {
    logger.error(`Erro ao listar usuários: ${err.message}`, err);
    const mapped = prismaErrorToHttp(err);
    if (mapped) {
      return res.status(mapped.status).json({
        success: false,
        error: mapped.code,
        message: mapped.message,
      });
    }
    res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
}

export async function getById(req, res) {
  const { id } = req.params;

  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id, 10) },
      include: {
        profile: true,
      },
    });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: 'Usuário não encontrado' });
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        profileId: user.profileId,
        profile: user.profile ? { id: user.profile.id, name: user.profile.name } : null,
        isActive: user.isActive,
      },
    });
  } catch (err) {
    logger.error('Erro em getById:', err);
    const mapped = prismaErrorToHttp(err);
    if (mapped) {
      return res.status(mapped.status).json({
        success: false,
        error: mapped.code,
        message: mapped.message,
      });
    }
    res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
}

export async function create(req, res) {
  try {
    const { name, email, password, profileId, isActive } = req.body;

    if (!name || !email || !password || !profileId) {
      return res.status(400).json({
        success: false,
        message: 'Campos obrigatórios faltando',
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.trim(),
        passwordHash,
        profileId,
        isActive: typeof isActive === 'boolean' ? isActive : true,
      },
    });

    await registerAudit({
      userId: req.user?.id,
      action: 'CREATE_USER',
      entity: 'User',
      entityId: user.id,
      details: `Usuário criado: ${user.email}`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(201).json({ success: true, user });
  } catch (err) {
    logger.error(`Erro ao criar usuário: ${err.message}`, err);
    const mapped = prismaErrorToHttp(err);
    if (mapped) {
      return res.status(mapped.status).json({
        success: false,
        error: mapped.code,
        message: mapped.message,
      });
    }
    res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
}

export async function update(req, res) {
  try {
    const { id } = req.params;
    const { name, email, password, profileId, isActive } = req.body;

    if (!name || !email || !profileId) {
      return res.status(400).json({
        success: false,
        message: 'Campos obrigatórios faltando',
      });
    }

    const dataToUpdate = {
      name: name.trim(),
      email: email.trim(),
      profileId,
    };

    if (password) {
      dataToUpdate.passwordHash = await bcrypt.hash(password, 10);
    }

    if (typeof isActive === 'boolean') {
      dataToUpdate.isActive = isActive;
      if (isActive === false) {
        dataToUpdate.refreshToken = null;
      }
    }

    const updated = await prisma.user.update({
      where: { id: parseInt(id, 10) },
      data: dataToUpdate,
    });

    await registerAudit({
      userId: req.user?.id,
      action: 'UPDATE_USER',
      entity: 'User',
      entityId: updated.id,
      details: `Usuário atualizado: ${updated.email}`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({
      success: true,
      message: 'Usuário atualizado com sucesso',
    });
  } catch (err) {
    logger.error(`Erro ao atualizar usuário: ${err.message}`, err);
    const mapped = prismaErrorToHttp(err);
    if (mapped) {
      return res.status(mapped.status).json({
        success: false,
        error: mapped.code,
        message: mapped.message,
      });
    }
    res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
}

/**
 * Soft delete: marca isActive = false em vez de deletar.
 */
export async function remove(req, res) {
  try {
    const { id } = req.params;
    const userId = parseInt(id, 10);

    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, isActive: true },
    });

    if (!existing) {
      return res
        .status(404)
        .json({ success: false, message: 'Usuário não encontrado' });
    }

    if (!existing.isActive) {
      return res.json({
        success: true,
        message: 'Usuário já estava inativo (soft delete aplicado anteriormente)',
      });
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: false,
        refreshToken: null,
      },
    });

    await registerAudit({
      userId: req.user?.id,
      action: 'DELETE_USER',
      entity: 'User',
      entityId: userId,
      details: `Usuário marcado como inativo (soft delete): ${existing.email}`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({
      success: true,
      message: 'Usuário marcado como inativo com sucesso',
    });
  } catch (err) {
    logger.error(`Erro ao inativar (soft delete) usuário: ${err.message}`, err);
    const mapped = prismaErrorToHttp(err);
    if (mapped) {
      return res.status(mapped.status).json({
        success: false,
        error: mapped.code,
        message: mapped.message,
      });
    }
    res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
}

export async function setActive(req, res) {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Campo isActive (boolean) é obrigatório',
      });
    }

    const userId = parseInt(id, 10);

    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, isActive: true },
    });

    if (!existing) {
      return res
        .status(404)
        .json({ success: false, message: 'Usuário não encontrado' });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        isActive,
        ...(isActive === false ? { refreshToken: null } : {}),
      },
    });

    await registerAudit({
      userId: req.user?.id,
      action: 'UPDATE_USER',
      entity: 'User',
      entityId: updated.id,
      details: `Usuário ${isActive ? 'ativado' : 'desativado'}: ${updated.email}`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({
      success: true,
      message: `Usuário ${isActive ? 'ativado' : 'desativado'} com sucesso`,
    });
  } catch (err) {
    logger.error(`Erro em setActive usuário: ${err.message}`, err);
    const mapped = prismaErrorToHttp(err);
    if (mapped) {
      return res.status(mapped.status).json({
        success: false,
        error: mapped.code,
        message: mapped.message,
      });
    }
    res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
}
