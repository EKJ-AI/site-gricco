import jwt from 'jsonwebtoken';
import config from '../config/index.js';

/**
 * Gera um JWT assinado com expiração configurável
 * @param {*} payload - dados para o token
 * @returns token
 */
export function signJwt(payload) {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.expiration });
}

/**
 * Verifica um JWT
 * @param {*} token
 * @returns payload ou null
 */
export function verifyJwt(token) {
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch (err) {
    return null;
  }
}

/**
 * Gera um JWT de refresh com expiração configurável
 * @param {*} payload - dados para o token
 * @returns token
 */
export function signRefreshJwt(payload) {
  return jwt.sign(payload, config.refreshSecret, { expiresIn: config.expirationRefresh });
}

/**
 * Verifica um JWT de refresh
 * @param {*} token
 * @returns payload ou null
 */
export function verifyRefreshJwt(token) {
  try {
    return jwt.verify(token, config.refreshSecret);
  } catch (err) {
    return null;
  }
}
