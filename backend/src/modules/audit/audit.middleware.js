// src/modules/audit/audit.middleware.js
import { AuditAction } from '@prisma/client';
import prisma from '../../../prisma/client.js';
import logger from '../../utils/logger.js';

function mapMethodToEnum(method) {
  const allowedArr = Object.values(AuditAction);
  const allowed = new Set(allowedArr);
  const m = String(method || '').toUpperCase();

  // Seu enum AuditAction (site) NÃO tem READ.
  const guess =
    m === 'GET' ? 'OTHER' :
    m === 'POST' ? 'CREATE' :
    m === 'PUT' ? 'UPDATE' :
    m === 'PATCH' ? 'UPDATE' :
    m === 'DELETE' ? 'DELETE' :
    null;

  if (guess && allowed.has(guess)) return guess;
  return 'OTHER';
}

function capDetailsString(s, limit = 8000) {
  if (!s) return null;
  if (s.length <= limit) return s;
  return s.slice(0, limit) + '…[truncated]';
}

export async function auditLog(req, res, next) {
  try {
    logger.info(
      `[AUDIT-MIDDLEWARE] Registrando log para ${req.method} ${req.originalUrl}`,
    );

    const action = mapMethodToEnum(req.method);

    const ip =
      (req.headers['x-forwarded-for'] &&
        String(req.headers['x-forwarded-for']).split(',')[0].trim()) ||
      req.ip ||
      null;

    const userAgent = req.headers['user-agent'] || null;

    const detailPayload = {
      method: req.method,
      path: req.originalUrl,
      body: req.body ?? null,
      query: req.query ?? null,
    };

    let details;
    try {
      details = capDetailsString(JSON.stringify(detailPayload));
    } catch {
      details = JSON.stringify({
        method: req.method,
        path: req.originalUrl,
        body: '[unserializable]',
      });
    }

    try {
      await prisma.auditLog.create({
        data: {
          action,
          userId: req.user?.id ?? null,
          details,
          ip,
          userAgent,
        },
      });
      logger.info('[AUDIT-MIDDLEWARE] Log registrado com sucesso');
    } catch (err) {
      logger.warn(
        `[AUDIT-MIDDLEWARE] Falha ao registrar audit (ignorando e seguindo): ${err.message}`,
      );
    }
  } catch (error) {
    logger.warn(
      `[AUDIT-MIDDLEWARE] Erro inesperado no middleware (seguindo): ${error?.message || error}`,
    );
  }

  next();
}

export default auditLog;
