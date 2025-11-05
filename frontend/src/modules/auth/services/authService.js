import api from '../../../api/axios';

/**
 * Realiza o login do usuário e retorna os dados com tokens
 * @param {string} email
 * @param {string} password
 * @returns {Promise<object>}
 */
export async function login(email, password) {
  try {
    console.log('[API] 📨 Enviando login...');
    const res = await api.post('/api/auth/login', { email, password });
    console.log('[API] ✅ Login bem-sucedido');
    return res.data;
  } catch (error) {
    console.error('[API] ❌ Erro no login:', error);
    throw error?.response?.data || new Error('Erro ao realizar login.');
  }
}

/**
 * Busca dados do usuário logado usando o token
 * @param {string} token
 * @returns {Promise<object>}
 */
export async function fetchMe(token) {
  try {
    console.log('[API] 🔎 Buscando /me...');
    const res = await api.get('/api/users/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log('[API] ✅ Dados do usuário carregados');
    return res.data;
  } catch (error) {
    console.error('[API] ❌ Erro ao buscar /me:', error);
    throw error?.response?.data || new Error('Erro ao carregar dados do usuário.');
  }
}
