// src/modules/utils/httpMeta.js
export function extractRequestMeta(req) {
  const ip =
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    null;

  const userAgent = req.headers['user-agent'] || null;

  return { ip, userAgent };
}
