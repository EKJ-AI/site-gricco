// src/api/translations.js
import api from './axios';

export async function fetchCultures(q) {
  const params = {};
  if (q) params.q = q;
  const { data } = await api.get('/api/translations/cultures', { params });
  return data?.data?.items ?? [];
}

export async function fetchTranslations({ cultureId, q, page = 1, pageSize = 20 }) {
  const params = { cultureId, page, pageSize };
  if (q) params.q = q;
  const { data } = await api.get('/api/translations', { params });
  return data?.data ?? { total: 0, page, pageSize, items: [] };
}

export async function getTranslationById(id) {
  const { data } = await api.get(`/api/translations/${id}`);
  return data?.data;
}

export async function createTranslation(payload) {
  const { data } = await api.post('/api/translations', payload);
  return data?.data;
}

export async function updateTranslation(id, payload) {
  const { data } = await api.put(`/api/translations/${id}`, payload);
  return data;
}

export async function deleteTranslation(id) {
  const { data } = await api.delete(`/api/translations/${id}`);
  return data;
}

// ===== Cultures (CRUD) =====
export async function createCulture(data) {
  const res = await api.post('/api/translations/cultures', data);
  return res.data?.data;
}
export async function updateCulture(id, data) {
  const res = await api.put(`/api/translations/cultures/${id}`, data);
  return res.data?.data;
}
export async function deleteCultureApi(id) {
  const res = await api.delete(`/api/translations/cultures/${id}`);
  return res.data;
}

// Público (para montar dicionários rapidamente):
export async function fetchPublicDict(cultureId) {
  const res = await api.get(`/api/public/i18n/${cultureId}`);
  return res.data?.data || {};
}