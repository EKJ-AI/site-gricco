import prisma from '../../../prisma/client.js';
import bcrypt from 'bcrypt';
import logger from '../../utils/logger.js';
import { registerAudit } from '../../utils/audit.js';

export async function getMe(req, res) {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: {
          include: {
            permissions: { include: { permission: true } }
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
    }

    const permissions = user.profile.permissions.map(p => p.permission.name);

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        profileId: user.profileId,
        profile: {
          id: user.profile.id,
          name: user.profile.name,
          permissions
        }
      }
    });
  } catch (error) {
    logger.error(`Erro em getMe: ${error.message}`, error);
    res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
}

export async function list(req, res) {
  try {
    logger.info('📥 GET /users chamado');
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;

    const [total, users] = await Promise.all([
      prisma.user.count(),
      prisma.user.findMany({
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { profile: true },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    const result = users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      profile: u.profile?.name
    }));

    res.json({
      success: true,
      data: {
        total,
        page,
        pageSize,
        items: result
      }
    });
  } catch (err) {
    logger.error(`Erro ao listar usuários: ${err.message}`, err);
    res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
}

export async function getById(req, res) {
  const { id } = req.params;

  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      include: {
        profile: true
      }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        profileId: user.profileId,
        profile: user.profile?.name
      }
    });
  } catch (err) {
    logger.error('Erro em getById:', err);
    res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
}

export async function create(req, res) {
  try {
    const { name, email, password, profileId } = req.body;

    if (!name || !email || !password || !profileId) {
      return res.status(400).json({ success: false, message: 'Campos obrigatórios faltando' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        profileId
      }
    });

    await registerAudit({
      userId: req.user?.id,
      action: 'CREATE_USER',
      entity: 'User',
      entityId: user.id,
      details: `Usuário criado: ${user.email}`
    });

    res.status(201).json({ success: true, user });
  } catch (err) {
    logger.error(`Erro ao criar usuário: ${err.message}`, err);
    res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
}

export async function update(req, res) {
  try {
    const { id } = req.params;
    const { name, email, password, profileId } = req.body;

    if (!name || !email || !profileId) {
      return res.status(400).json({ success: false, message: 'Campos obrigatórios faltando' });
    }

    const dataToUpdate = { name, email, profileId };

    if (password) {
      dataToUpdate.passwordHash = await bcrypt.hash(password, 10);
    }

    await prisma.user.update({
      where: { id: parseInt(id, 10) },
      data: dataToUpdate
    });

    await registerAudit({
      userId: req.user?.id,
      action: 'UPDATE_USER',
      entity: 'User',
      entityId: parseInt(id),
      details: `Usuário atualizado: ${email}`
    });

    res.json({ success: true, message: 'Usuário atualizado com sucesso' });
  } catch (err) {
    logger.error(`Erro ao atualizar usuário: ${err.message}`, err);
    res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
}

export async function remove(req, res) {
  try {
    const { id } = req.params;

    await prisma.user.delete({
      where: { id: parseInt(id) }
    });

    await registerAudit({
      userId: req.user?.id,
      action: 'DELETE_USER',
      entity: 'User',
      entityId: parseInt(id),
      details: `Usuário deletado`
    });

    res.json({ success: true, message: 'Usuário deletado com sucesso' });
  } catch (err) {
    logger.error(`Erro ao deletar usuário: ${err.message}`, err);
    res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
}

