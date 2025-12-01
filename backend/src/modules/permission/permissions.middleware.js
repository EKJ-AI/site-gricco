// src/infra/http/authorizePermissions.js
import prisma from '../../../prisma/client.js';
import logger from '../../utils/logger.js';

// Normaliza o parâmetro exigido:
// - string -> { all: [string], any: [] }
// - array  -> { all: array,  any: [] }
// - objeto -> { all?: string[], any?: string[] }
function normalizeRequired(required) {
  if (required == null) return { all: [], any: [] };
  if (typeof required === 'string') return { all: [required], any: [] };
  if (Array.isArray(required)) return { all: required.filter(Boolean), any: [] };
  if (typeof required === 'object') {
    const all = Array.isArray(required.all) ? required.all.filter(Boolean) : [];
    const any = Array.isArray(required.any) ? required.any.filter(Boolean) : [];
    return { all, any };
  }
  // fallback defensivo
  return { all: [], any: [] };
}

async function resolveUserPermissions(req) {
  // 1) Se já estiverem no token/contexto
  if (Array.isArray(req.user?.permissions)) {
    return req.user.permissions.map(String);
  }

  // 2) Busca via profile -> profilePermission -> permission
  if (req.user?.profileId) {
    const profile = await prisma.profile.findUnique({
      where: { id: req.user.profileId },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });

    if (!profile) return [];
    return (
      profile.permissions
        ?.map((pp) => pp.permission?.name)
        .filter(Boolean) || []
    );
  }

  return [];
}

/**
 * Uso:
 * authorizePermissions('company.create')
 * authorizePermissions(['company.create', 'company.update'])
 * authorizePermissions({ all: ['company.update'], any: ['company.manage', 'admin'] })
 */
export function authorizePermissions(required) {
  const norm = normalizeRequired(required);

  return async (req, res, next) => {
    try {
      logger.info(`[AUTHORIZE] Rota: ${req.method} ${req.originalUrl}`);

      if (!req.user || !req.user.profileId) {
        logger.warn('[AUTHORIZE] Falha: Usuário não autenticado ou sem profileId');
        return res.status(403).json({ success: false, message: 'Usuário não autenticado' });
      }

      const { all, any } = norm;
      const reqDesc = [
        all.length ? `ALL[${all.join(', ')}]` : null,
        any.length ? `ANY[${any.join(', ')}]` : null,
      ].filter(Boolean).join(' + ');
      logger.info(`[AUTHORIZE] Permissões exigidas: ${reqDesc || '(nenhuma)'}`);

      const userPermissions = await resolveUserPermissions(req);
      logger.info(`[AUTHORIZE] Permissões do usuário: ${userPermissions.join(', ') || '(vazio)'}`);

      // Se nada for exigido, libera
      if (all.length === 0 && any.length === 0) {
        logger.info('[AUTHORIZE] Nenhuma permissão exigida, acesso liberado ✅');
        return next();
      }

      const set = new Set(userPermissions);
      const hasAll = all.every((p) => set.has(p));
      const hasAny = any.length === 0 ? true : any.some((p) => set.has(p));

      if (hasAll && hasAny) {
        logger.info('[AUTHORIZE] Permissão concedida ✅');
        return next();
      }

      const missingAll = all.filter((p) => !set.has(p));
      const missingAny = any.length > 0 && !hasAny ? any : [];

      logger.warn(`[AUTHORIZE] Permissão insuficiente. Faltam (ALL): ${missingAll.join(', ') || '-'}; (ANY): ${missingAny.join(', ') || '-'}`);
      return res.status(403).json({
        success: false,
        message: 'Permissão insuficiente',
        required: { all, any },
        granted: userPermissions,
        missing: { all: missingAll, any: missingAny },
      });
    } catch (error) {
      logger.error(`[AUTHORIZE] Erro interno: ${error.message}`, error);
      return res.status(500).json({ success: false, message: 'Erro interno no servidor' });
    }
  };
}

export default authorizePermissions;
