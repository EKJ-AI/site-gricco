/**
 * Decode a JWT payload safely
 * Handles Base64Url and errors
 */
export function decodeJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(base64Url.length + (4 - (base64Url.length % 4)) % 4, '=');

    const jsonPayload = atob(base64);
    return JSON.parse(jsonPayload);
  } catch (err) {
    console.error('[decodeJwt] Invalid token', err);
    return null;
  }
}
