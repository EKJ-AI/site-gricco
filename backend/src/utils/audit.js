import prisma from '../../prisma/client.js';
import logger from './logger.js';

export async function registerAudit({ userId, action, entity, entityId, details }) {
  try {
    // Validação prévia básica
    if (!action || !entity) {
      logger.warn(`[AUDIT] Campos obrigatórios ausentes: action='${action}', entity='${entity}'`);
    }

    const auditData = {
      userId,
      action,
      entity,
      entityId,
      details
      
    };

    await prisma.auditLog.create({ data: auditData });

    logger.info(`[AUDIT] Log registrado com sucesso
      ✅ UserID: ${userId || 'N/A'}
      ✅ Action: ${action}
      ✅ Entity: ${entity}
      ✅ EntityID: ${entityId || 'N/A'}
      ✅ Details: ${details || 'N/A'}
    `);
  } catch (error) {
    logger.error(`[AUDIT] ❌ Falha ao registrar audit log: ${error.message}`, { stack: error.stack });
  }
}
