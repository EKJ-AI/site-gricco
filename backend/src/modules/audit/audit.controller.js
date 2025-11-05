import prisma from '../../../prisma/client.js';
import logger from '../../utils/logger.js';

export async function list(req, res) {
  try {
    logger.info('[AUDIT] 📥 GET /audit chamado');

    const logs = await prisma.auditLog.findMany({
      include: {
        user: {
          select: { id: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    logger.info(`[AUDIT] Retornados ${logs.length} logs`);
    res.json({
      success: true,
      data: {
        total: logs.length,
        items: logs
      }
    });
  } catch (error) {
    logger.error(`[AUDIT] Erro ao listar logs: ${error.message}`, error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar logs de auditoria.'
    });
  }
}

export async function create(req, res) {
  try {
    const { action, details } = req.body;

    if (!action || !details) {
      logger.warn('[AUDIT] Criação falhou: campos obrigatórios ausentes');
      return res.status(400).json({
        success: false,
        message: 'Ação e detalhes são obrigatórios.'
      });
    }

    const newLog = await prisma.auditLog.create({
      data: {
        action,
        details,
        userId: req.user?.id || null,
        ip: req.ip || req.headers['x-forwarded-for'] || null,
        userAgent: req.headers['user-agent'] || null
      }
    });

    logger.info(`[AUDIT] Log criado: id ${newLog.id}, action ${newLog.action}`);
    res.status(201).json({
      success: true,
      data: newLog
    });
  } catch (error) {
    logger.error(`[AUDIT] Erro ao criar log: ${error.message}`, error);
    res.status(500).json({
      success: false,
      message: 'Erro ao registrar log de auditoria.'
    });
  }
}
