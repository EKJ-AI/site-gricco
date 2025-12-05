// src/modules/auth/auth.middleware.js
import { verifyJwt } from '../../utils/jwt.js';
import prisma from '../../../prisma/client.js';
import logger from '../../utils/logger.js';

export async function authenticateToken(req, res, next) {
  try {
    logger.info(
      `[AUTH-MIDDLEWARE] Iniciando autenticação para ${req.method} ${req.originalUrl}`,
    );

    const authHeader = req.headers['authorization'];
    const headerToken = authHeader && authHeader.split(' ')[1];

    // 👇 Novo: aceita token também pela query string (?token=...)
    const queryToken =
      typeof req.query?.token === 'string' && req.query.token.trim()
        ? req.query.token.trim()
        : null;

    const token = headerToken || queryToken;

    if (!token) {
      logger.warn('[AUTH-MIDDLEWARE] Falha: token não fornecido (header nem query)');
      return res.status(401).json({ message: 'Token não fornecido' });
    }

    const decoded = verifyJwt(token);
    if (!decoded) {
      logger.warn('[AUTH-MIDDLEWARE] Falha: token inválido ou expirado');
      return res.status(401).json({ message: 'Token inválido ou expirado' });
    }

    logger.info(`[AUTH-MIDDLEWARE] Token válido para userId=${decoded.sub}`);

    const permissions = await prisma.profilePermission.findMany({
      where: { profileId: decoded.profileId },
      include: { permission: true },
    });

    const permissionNames = permissions
      .filter((p) => p.permission && p.permission.name)
      .map((p) => p.permission.name);

    req.user = {
      id: decoded.sub,
      email: decoded.email,
      profileId: decoded.profileId,
      permissions: permissionNames,
    };

    next();
  } catch (error) {
    logger.error(
      `[AUTH-MIDDLEWARE] Erro ao autenticar token: ${error.message}`,
      error,
    );
    res.status(500).json({ message: 'Erro ao autenticar token.' });
  }
}
