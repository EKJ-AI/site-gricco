import prisma from '../../prisma/client.js';
import logger from './logger.js';

// Valores válidos do enum AuditAction em schema.prisma
const VALID_ACTIONS = new Set([
  'LOGIN',
  'LOGOUT',
  'CREATE',
  'UPDATE',
  'DELETE',
  'PERMISSION_CHANGE',
  'OTHER',
]);

function normalizeAction(raw) {
  if (!raw) return 'OTHER';

  const upper = String(raw).toUpperCase();

  // Se já for um valor exato do enum, usa direto
  if (VALID_ACTIONS.has(upper)) return upper;

  // Mapear alguns padrões antigos: CREATE_USER, UPDATE_PROFILE, DELETE_PERMISSION, etc.
  if (upper.startsWith('CREATE_')) return 'CREATE';
  if (upper.startsWith('UPDATE_')) return 'UPDATE';
  if (upper.startsWith('DELETE_')) return 'DELETE';
  if (upper.includes('PERMISSION')) return 'PERMISSION_CHANGE';

  return 'OTHER';
}

/**
 * API compatível com o código antigo, mas adequando ao novo AuditLog:
 * - entity / entityId são "embutidos" no campo details
 * - action é normalizada para o enum AuditAction
 * - ip / userAgent são gravados quando fornecidos
 */
export async function registerAudit({
  userId,
  action,
  entity,
  entityId,
  details,
  ip,
  userAgent,
}) {
  try {
    const normalizedAction = normalizeAction(action);

    let finalDetails = details || '';
    const metaParts = [];

    if (entity) metaParts.push(`entity=${entity}`);
    if (entityId != null) metaParts.push(`entityId=${entityId}`);
    if (action && action.toUpperCase() !== normalizedAction) {
      metaParts.push(`rawAction=${action}`);
    }

    if (metaParts.length) {
      const metaStr = metaParts.join(', ');
      finalDetails = finalDetails
        ? `${finalDetails} [${metaStr}]`
        : `[${metaStr}]`;
    }

    await prisma.auditLog.create({
      data: {
        userId: userId ?? null,
        action: normalizedAction,
        details: finalDetails || null,
        ip: ip ?? null,
        userAgent: userAgent ?? null,
      },
    });

    logger.info(
      `[AUDIT] Log registrado com sucesso; userId=${userId ?? 'N/A'}, action=${normalizedAction}`,
    );
  } catch (error) {
    logger.error(
      `[AUDIT] ❌ Falha ao registrar audit log: ${error.message}`,
      { stack: error.stack },
    );
  }
}
