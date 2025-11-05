import api from '../../../api/axios';

/**
 * Busca lista de usuários com paginação
 * @param {string} token
 * @param {number} page
 * @param {number} pageSize
 * @returns {Promise<object>}
 */
export async function getUsers(token, page = 1, pageSize = 10) {
  try {
    console.log(`[API] 🔎 GET /users?page=${page}&pageSize=${pageSize}`);
    const res = await api.get(`/api/users?page=${page}&pageSize=${pageSize}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log('[API] ✅ Usuários carregados');
    return res.data;
  } catch (error) {
    console.error('[API] ❌ Erro ao buscar usuários:', error);
    throw error?.response?.data || new Error('Erro ao carregar usuários.');
  }
}

/**
 * Cria um novo usuário
 * @param {string} token
 * @param {object} userData
 * @returns {Promise<object>}
 */
export async function createUser(token, userData) {
  try {
    console.log('[API] 📨 POST /users', userData);
    const res = await api.post('/api/users', userData, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log('[API] ✅ Usuário criado');
    return res.data;
  } catch (error) {
    console.error('[API] ❌ Erro ao criar usuário:', error);
    throw error?.response?.data || new Error('Erro ao criar usuário.');
  }
}
