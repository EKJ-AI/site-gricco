import api from './axios';

/**
 * Lista posts de blog
 * - Admin: usa /api/blog (qualquer status, com permissão)
 * - Público (site): usa /api/blog/public (apenas PUBLISHED)
 */
export async function fetchBlogPosts({
  page = 1,
  pageSize = 10,
  search,
  status,
  type,
  onlyPublished = false,
} = {}) {
  const params = { page, pageSize };

  if (search) params.search = search;

  // Para listagem ADMIN, pode filtrar por status
  if (!onlyPublished && status) {
    params.status = status;
  }

  if (type) params.type = type;

  // 🔥 Decide a rota conforme o uso
  const baseUrl = onlyPublished ? '/api/blog/public' : '/api/blog';

  const { data } = await api.get(baseUrl, { params });
  return data?.data ?? { total: 0, page, pageSize, items: [] };
}

/**
 * Busca post por ID (admin)
 */
export async function getBlogPostById(id) {
  const { data } = await api.get(`/api/blog/${id}`);
  return data?.data;
}

/**
 * Busca post publicado por slug (área pública)
 */
export async function getPublicBlogPost(slug) {
  const { data } = await api.get(`/api/blog/slug/${slug}`);
  return data?.data;
}

/**
 * Cria um novo post (admin)
 */
export async function createBlogPost(payload) {
  const { data } = await api.post('/api/blog', payload);
  return data?.data;
}

/**
 * Atualiza um post (admin)
 */
export async function updateBlogPost(id, payload) {
  const { data } = await api.put(`/api/blog/${id}`, payload);
  return data?.data;
}

/**
 * Publica um post (admin)
 */
export async function publishBlogPost(id, date) {
  const body = date ? { date } : {};
  const { data } = await api.patch(`/api/blog/${id}/publish`, body);
  return data?.data;
}

/**
 * Despublica um post (admin) → volta para DRAFT
 */
export async function unpublishBlogPost(id) {
  const { data } = await api.patch(`/api/blog/${id}/unpublish`);
  return data?.data;
}

/**
 * Soft delete de um post (admin)
 */
export async function deleteBlogPost(id) {
  const { data } = await api.delete(`/api/blog/${id}`);
  return data;
}
