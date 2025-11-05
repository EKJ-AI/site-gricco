import rateLimit from 'express-rate-limit';
import config from '../config/index.js';

/** * Middleware de limitação de taxa para proteger a API contra abusos
 * Limita o número de requisições por IP em um intervalo de tempo definido
 */
export const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    message: 'Muitas requisições – tente novamente mais tarde.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
