import prisma from '../../../prisma/client.js';
import logger from '../../utils/logger.js';
import { registerAudit } from '../../utils/audit.js';

export async function list(req, res) {
  try {
    logger.info('📥 GET /profile chamado');

    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;

    const [total, profiles] = await Promise.all([
      prisma.profile.count(),
      prisma.profile.findMany({
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          permissions: {
            include: { permission: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    // const result = profiles.map(p => ({
    //   id: p.id,
    //   name: p.name,
    //   description: p.description,
    //   permissions: p.permissions.map(pp => pp.permission.name)
    // }));

    const result = profiles.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      permissions: p.permissions.map(pp => ({
        id: pp.permission.id,
        name: pp.permission.name
      }))
    }));

    // res.json({
    //   success: true,
    //   data: {
    //     total,
    //     page,
    //     pageSize,
    //     items: result
    //   }
    // });
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
    logger.error(`Erro ao listar perfis: ${err.message}`, err);
    res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
}

export async function create(req, res) {
  try {
    const { name, description, permissions } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Nome é obrigatório' });
    }

    const newProfile = await prisma.profile.create({
      data: {
        name,
        description,
        permissions: {
          create: permissions?.map(pid => ({ permissionId: pid })) || []
        }
      }
    });

    await registerAudit({
      userId: req.user?.id,
      action: 'CREATE_PROFILE',
      entity: 'Profile',
      entityId: newProfile.id,
      details: `Perfil criado: ${newProfile.name}`
    });

    res.status(201).json({ success: true, data: newProfile });
  } catch (err) {
    logger.error(`Erro ao criar perfil: ${err.message}`, err);
    res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
}

export async function update(req, res) {
  try {
    const { id } = req.params;
    const { name, description, permissions } = req.body;

    const updatedProfile = await prisma.profile.update({
      where: { id },
      data: {
        name,
        description,
        permissions: {
          deleteMany: {},
          create: permissions?.map(pid => ({ permissionId: pid })) || []
        }
      }
    });

    await registerAudit({
      userId: req.user?.id,
      action: 'UPDATE_PROFILE',
      entity: 'Profile',
      entityId: id,
      details: `Perfil atualizado: ${name}`
    });

    res.json({ success: true, data: updatedProfile, message: 'Perfil atualizado com sucesso' });
  } catch (err) {
    logger.error(`Erro ao atualizar perfil: ${err.message}`, err);
    res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
}

export async function remove(req, res) {
  try {
    const { id } = req.params;

    await prisma.profile.delete({
      where: { id }
    });

    await registerAudit({
      userId: req.user?.id,
      action: 'DELETE_PROFILE',
      entity: 'Profile',
      entityId: id,
      details: `Perfil deletado: ${id}`
    });

    res.json({ success: true, message: 'Perfil deletado com sucesso' });
  } catch (err) {
    logger.error(`Erro ao deletar perfil: ${err.message}`, err);
    res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
}
