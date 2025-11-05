// src/modules/auth/auth.controller.js
import bcrypt from 'bcrypt';
import prisma from '../../../prisma/client.js';
import logger from '../../utils/logger.js';
import { signJwt, signRefreshJwt, verifyJwt, verifyRefreshJwt } from '../../utils/jwt.js';

// Opções de cookie reaproveitáveis (use MESMAS opções no clearCookie)
const REFRESH_COOKIE_NAME = 'refreshToken';
const REFRESH_COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  //sameSite: 'strict',           // se front/back estiverem em domínios diferentes, considere 'lax' ou configurar CORS + domain
  sameSite: 'none',       // cross-site
  domain: '.gricco.com.br', // permite api. e site. (opcional, mas recomendado)
  path: '/',                    // garanta limpar em toda a app
  maxAge: 7 * 24 * 60 * 60 * 1000
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
      return res.status(400).json({ success: false, message: 'Email e senha são obrigatórios' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        profile: { include: { permissions: { include: { permission: true } } } }
      }
    });

    if (!user) {
      logger.warn(`[AUTH] Login failed: user not found for ${email}`);
      return res.status(401).json({ success: false, message: 'Credenciais inválidas' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      logger.warn(`[AUTH] Login failed: invalid password for ${email}`);
      return res.status(401).json({ success: false, message: 'Credenciais inválidas' });
    }

    const accessToken = signJwt({ sub: user.id, email: user.email, profileId: user.profileId });
    const refreshToken = signRefreshJwt({ sub: user.id });

    // Armazene o refresh token (ideal seria armazená-lo com hash; aqui mantemos compatibilidade)
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken }
    });

    const permissions = user.profile.permissions.map(p => p.permission.name);

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
          permissions
        }
      }
    });
  } catch (err) {
    logger.error('[AUTH] Login error', err);
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
    // 🔒 Aceite SOMENTE do cookie para evitar abuso via body
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!refreshToken) {
      logger.warn('[AUTH] Refresh failed: no refreshToken cookie');
      return res.status(400).json({ success: false, message: 'Refresh token obrigatório' });
    }

    const decoded = verifyRefreshJwt(refreshToken);
    if (!decoded) {
      logger.warn('[AUTH] Refresh token inválido ou expirado (JWT inválido)');
      // Limpa cookie para não ficar tentando em loop
      res.clearCookie(REFRESH_COOKIE_NAME, REFRESH_COOKIE_OPTS);
      return res.status(401).json({ success: false, message: 'Refresh token inválido ou expirado' });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      include: {
        profile: { include: { permissions: { include: { permission: true } } } }
      }
    });

    if (!user || !user.refreshToken || user.refreshToken !== refreshToken) {
      logger.warn(`[AUTH] Refresh token não confere no banco para userId ${decoded.sub}`);
      // Zera no banco por segurança e limpa cookie
      await prisma.user.update({
        where: { id: decoded.sub },
        data: { refreshToken: null }
      }).catch(() => {});
      res.clearCookie(REFRESH_COOKIE_NAME, REFRESH_COOKIE_OPTS);
      return res.status(401).json({ success: false, message: 'Refresh token inválido' });
    }

    // Rotaciona ambos os tokens
    const newAccessToken = signJwt({ sub: user.id, email: user.email, profileId: user.profileId });
    const newRefreshToken = signRefreshJwt({ sub: user.id });

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: newRefreshToken }
    });

    const permissions = user.profile.permissions.map(p => p.permission.name);

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
          permissions
        }
      }
    });
  } catch (err) {
    logger.error('[AUTH] Refresh error', err);
    // Em qualquer erro inesperado, limpe o cookie para parar loops de refresh
    res.clearCookie(REFRESH_COOKIE_NAME, REFRESH_COOKIE_OPTS);
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
        // Invalida o token salvo no banco
        await prisma.user.update({
          where: { id: decoded.sub },
          data: { refreshToken: null }
        });
      }
    }

    // Limpa o cookie SEMPRE usando as MESMAS opções
    res.clearCookie(REFRESH_COOKIE_NAME, REFRESH_COOKIE_OPTS);

    return res.json({ success: true, message: 'Logout efetuado' });
  } catch (err) {
    logger.error('[AUTH] Logout error', err);
    // Mesmo em erro, limpe o cookie para não manter sessão
    res.clearCookie(REFRESH_COOKIE_NAME, REFRESH_COOKIE_OPTS);
    res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
}
