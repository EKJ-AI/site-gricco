import { prismaErrorToHttp } from '../../infra/http/prismaError.js';
import bcrypt from 'bcrypt';
import prisma from '../../../prisma/client.js';
import logger from '../../utils/logger.js';
import { signJwt, signRefreshJwt, verifyRefreshJwt } from '../../utils/jwt.js';

// Opções de cookie reaproveitáveis (use MESMAS opções no clearCookie)
const REFRESH_COOKIE_NAME = 'refreshToken';
const isProd = process.env.NODE_ENV === 'production';

const REFRESH_COOKIE_OPTS = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'none' : 'lax',
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  ...(isProd ? { domain: '.gricco.com.br' } : {}),
};

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login do usuário
 *     tags: [Auth]
 */
export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email e senha são obrigatórios',
      });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        profile: {
          include: {
            permissions: { include: { permission: true } },
          },
        },
      },
    });

    if (!user) {
      logger.warn(`[AUTH] Login failed: user not found for ${email}`);
      return res
        .status(401)
        .json({ success: false, message: 'Credenciais inválidas' });
    }

    // ✅ Bloqueia usuário inativo
    if (!user.isActive) {
      logger.warn(
        `[AUTH] Login blocked: user inactive for ${email} (id=${user.id})`,
      );
      return res
        .status(403)
        .json({ success: false, message: 'Usuário inativo' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      logger.warn(`[AUTH] Login failed: invalid password for ${email}`);
      return res
        .status(401)
        .json({ success: false, message: 'Credenciais inválidas' });
    }

    const accessToken = signJwt({
      sub: user.id,
      email: user.email,
      profileId: user.profileId,
    });
    const refreshToken = signRefreshJwt({ sub: user.id });

    // Armazena o refresh token
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken },
    });

    const permissions = user.profile.permissions.map((p) => p.permission.name);

    res.cookie(REFRESH_COOKIE_NAME, refreshToken, REFRESH_COOKIE_OPTS);

    return res.json({
      success: true,
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        profile: {
          id: user.profile.id,
          name: user.profile.name,
          permissions,
        },
      },
    });
  } catch (err) {
    logger.error('[AUTH] Login error', err);
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
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Gera novos tokens usando o refresh token (cookie HttpOnly)
 *     tags: [Auth]
 */
export async function refresh(req, res) {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!refreshToken) {
      logger.warn('[AUTH] Refresh failed: no refreshToken cookie');
      return res.status(400).json({
        success: false,
        message: 'Refresh token obrigatório',
      });
    }

    const decoded = verifyRefreshJwt(refreshToken);
    if (!decoded) {
      logger.warn('[AUTH] Refresh token inválido ou expirado (JWT inválido)');
      res.clearCookie(REFRESH_COOKIE_NAME, REFRESH_COOKIE_OPTS);
      return res.status(401).json({
        success: false,
        message: 'Refresh token inválido ou expirado',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      include: {
        profile: {
          include: {
            permissions: { include: { permission: true } },
          },
        },
      },
    });

    if (!user || !user.refreshToken || user.refreshToken !== refreshToken) {
      logger.warn(`[AUTH] Refresh token não confere no banco para userId ${decoded.sub}`);
      await prisma.user
        .update({
          where: { id: decoded.sub },
          data: { refreshToken: null },
        })
        .catch(() => {});
      res.clearCookie(REFRESH_COOKIE_NAME, REFRESH_COOKIE_OPTS);
      return res.status(401).json({ success: false, message: 'Refresh token inválido' });
    }

    // ✅ Bloqueia refresh para usuário inativo
    if (!user.isActive) {
      logger.warn(`[AUTH] Refresh blocked: user inactive for userId ${user.id}`);

      await prisma.user
        .update({
          where: { id: user.id },
          data: { refreshToken: null },
        })
        .catch(() => {});

      res.clearCookie(REFRESH_COOKIE_NAME, REFRESH_COOKIE_OPTS);

      return res.status(403).json({ success: false, message: 'Usuário inativo' });
    }

    const newAccessToken = signJwt({
      sub: user.id,
      email: user.email,
      profileId: user.profileId,
    });
    const newRefreshToken = signRefreshJwt({ sub: user.id });

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: newRefreshToken },
    });

    const permissions = user.profile.permissions.map((p) => p.permission.name);

    res.cookie(REFRESH_COOKIE_NAME, newRefreshToken, REFRESH_COOKIE_OPTS);

    return res.json({
      success: true,
      accessToken: newAccessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        profile: {
          id: user.profile.id,
          name: user.profile.name,
          permissions,
        },
      },
    });
  } catch (err) {
    logger.error('[AUTH] Refresh error', err);
    res.clearCookie(REFRESH_COOKIE_NAME, REFRESH_COOKIE_OPTS);
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
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Efetua logout, invalida o refresh token e limpa o cookie.
 *     tags: [Auth]
 */
export async function logout(req, res) {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

    if (refreshToken) {
      const decoded = verifyRefreshJwt(refreshToken);
      if (decoded?.sub) {
        await prisma.user.update({
          where: { id: decoded.sub },
          data: { refreshToken: null },
        });
      }
    }

    res.clearCookie(REFRESH_COOKIE_NAME, REFRESH_COOKIE_OPTS);

    return res.json({ success: true, message: 'Logout efetuado' });
  } catch (err) {
    logger.error('[AUTH] Logout error', err);
    res.clearCookie(REFRESH_COOKIE_NAME, REFRESH_COOKIE_OPTS);
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
