import prisma from '../../../prisma/client.js';
import logger from '../../utils/logger.js';

export async function auditLog(req, res, next) {
  try {
    logger.info(`[AUDIT-MIDDLEWARE] Registrando log para ${req.method} ${req.originalUrl}`);

    await prisma.auditLog.create({
      data: {
        action: `${req.method} ${req.originalUrl}`,
        userId: req.user?.id || null,
        details: JSON.stringify(req.body || {}),
        ip: req.ip || req.headers['x-forwarded-for'] || null,
        userAgent: req.headers['user-agent'] || null
      }
    });

    logger.info(`[AUDIT-MIDDLEWARE] Log registrado com sucesso`);
  } catch (error) {
    logger.error(`[AUDIT-MIDDLEWARE] Erro ao registrar audit log: ${error.message}`, error);
  }

  next();
}
