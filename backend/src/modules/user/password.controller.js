import prisma from '../../../prisma/client.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { sendEmail } from '../../services/email.service.js';
import logger from '../../utils/logger.js';
import { prismaErrorToHttp } from '../../infra/http/prismaError.js';
import { registerAudit } from '../../utils/audit.js';

const JWT_SECRET = process.env.JWT_SECRET;
const RESET_EXPIRATION = process.env.RESET_TOKEN_EXPIRATION || '15m';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001';

function isStrongPassword(password) {
  return (
    typeof password === 'string' &&
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password)
  );
}

export async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    logger.info(`[PASSWORD] Forgot requested for email: ${email}`);

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      logger.warn(`[PASSWORD] Email not found (but faking success for security): ${email}`);
      return res.json({ success: true, message: 'Se existir, enviamos o link para o email.' });
    }

    const payload = { sub: user.id, email: user.email };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: RESET_EXPIRATION });
    const resetLink = `${FRONTEND_URL}/reset-password?token=${token}`;

    await sendEmail(
      email,
      'Redefinição de senha',
      `
        <h2>Olá ${user.name || ''}</h2>
        <p>Você solicitou a redefinição da sua senha.</p>
        <p><a href="${resetLink}">Clique aqui para redefinir sua senha</a></p>
        <p>Este link expira em ${RESET_EXPIRATION}.</p>
      `,
    );

    logger.info(`[PASSWORD] Reset link enviado para ${email}`);
    res.json({ success: true, message: 'Se existir, enviamos o link para o email.' });
  } catch (error) {
    logger.error(`[PASSWORD] Erro no forgotPassword: ${error.message}`, error);
    const mapped = prismaErrorToHttp(error);
    if (mapped) {
      return res
        .status(mapped.status)
        .json({ success: false, error: mapped.code, message: mapped.message });
    }
    res.status(500).json({ success: false, message: 'Erro ao processar solicitação.' });
  }
}

export async function resetPassword(req, res) {
  let userId = null;

  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      logger.warn('[PASSWORD] Reset request missing token or password');

      await registerAudit({
        userId: null,
        action: 'UPDATE',
        entity: 'User',
        details: 'Tentativa de reset de senha sem token ou senha',
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });

      return res.status(400).json({
        success: false,
        message: 'Token e nova senha são obrigatórios.',
      });
    }

    if (!isStrongPassword(newPassword)) {
      logger.warn('[PASSWORD] Weak password provided');

      await registerAudit({
        userId: null,
        action: 'UPDATE',
        entity: 'User',
        details: 'Tentativa de reset de senha com senha fraca',
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });

      return res.status(400).json({
        success: false,
        message:
          'A senha deve ter no mínimo 8 caracteres, incluindo maiúscula, minúscula e número.',
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    userId = decoded.sub;

    const hashed = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashed },
    });

    await registerAudit({
      userId,
      action: 'UPDATE',
      entity: 'User',
      entityId: userId,
      details: 'Senha redefinida com sucesso',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    logger.info(`[PASSWORD] Senha redefinida para userId ${userId}`);
    res.json({ success: true, message: 'Senha redefinida com sucesso!' });
  } catch (error) {
    logger.error(`[PASSWORD] Erro ao resetar senha: ${error.message}`, error);

    try {
      await registerAudit({
        userId,
        action: 'UPDATE',
        entity: 'User',
        entityId: userId,
        details: 'Falha ao redefinir senha (token inválido ou expirado)',
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });
    } catch (auditErr) {
      logger.error(
        `[PASSWORD] Falha ao registrar audit log: ${auditErr.message}`,
        auditErr,
      );
    }

    res.status(400).json({ success: false, message: 'Token inválido ou expirado.' });
  }
}

export const create = async (req, res) => {
  try {
    const { name, email, password, profileId } = req.body;

    const user = await prisma.user.createUser({ name, email, password, profileId });

    res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      profileId: user.profileId,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
