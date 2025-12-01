// src/middlewares/audit.middleware.js
import { Prisma } from '@prisma/client';
import prisma from '../../../prisma/client.js';
import logger from '../../utils/logger.js';

function mapMethodToEnum(method) {
  const allowedArr = Object.values(Prisma.AuditAction); // enum do Prisma
  const allowed = new Set(allowedArr);
  const m = String(method || '').toUpperCase();

  const guess =
    m === 'GET'    ? 'READ'   :
    m === 'POST'   ? 'CREATE' :
    m === 'PUT'    ? 'UPDATE' :
    m === 'PATCH'  ? 'UPDATE' :
    m === 'DELETE' ? 'DELETE' : null;

  if (guess && allowed.has(guess)) return guess;
  // fallback seguro: primeiro valor do enum (ex.: 'READ')
  return allowedArr[0];
}

function capDetailsString(s, limit = 8000) {
  if (!s) return null;
  if (s.length <= limit) return s;
  return s.slice(0, limit) + '…[truncated]';
}

export async function auditLog(req, res, next) {
  try {
    logger.info(`[AUDIT-MIDDLEWARE] Registrando log para ${req.method} ${req.originalUrl}`);

    const action = mapMethodToEnum(req.method);

    // IP real (respeita proxy)
    const ip =
      (req.headers['x-forwarded-for'] && String(req.headers['x-forwarded-for']).split(',')[0].trim()) ||
      req.ip ||
      null;

    const userAgent = req.headers['user-agent'] || null;

    // Monta detalhes e limita tamanho
    const detailPayload = {
      method: req.method,
      path: req.originalUrl,
      // Atenção: body pode ser grande; vamos stringificar e truncar
      body: req.body ?? null,
      query: req.query ?? null,
    };

    let details;
    try {
      details = capDetailsString(JSON.stringify(detailPayload));
    } catch {
      // Se algo falhar na serialização, guarda algo mínimo
      details = JSON.stringify({ method: req.method, path: req.originalUrl, body: '[unserializable]' });
    }

    try {
      await prisma.auditLog.create({
        data: {
          action,                 // ✅ sempre enum válido
          userId: req.user?.id ?? null,
          details,                // string JSON (truncada se necessário)
          ip,
          userAgent,
        },
      });
      logger.info('[AUDIT-MIDDLEWARE] Log registrado com sucesso');
    } catch (err) {
      // Nunca bloquear a request por falha no audit
      logger.warn(`[AUDIT-MIDDLEWARE] Falha ao registrar audit (ignorando e seguindo): ${err.message}`);
    }
  } catch (error) {
    // Nunca bloquear a request — apenas logar
    logger.warn(`[AUDIT-MIDDLEWARE] Erro inesperado no middleware (seguindo): ${error?.message || error}`);
  }

  next();
}

export default auditLog;
