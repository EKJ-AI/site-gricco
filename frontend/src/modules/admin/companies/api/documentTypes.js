// src/modules/admin/companies/api/documentTypes.js
import api from '../../../../api/axios';

/**
 * Lista Tipos de Documento (com paginação + busca)
 */
export async function listDocumentTypes({ page = 1, pageSize = 20, q = '' }, token) {
  const res = await api.get('/api/documentTypes', {
    params: { page, pageSize, q },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  // backend retorna: { success, data: { total, page, pageSize, items } }
  return res.data?.data;
}

/**
 * Busca um Tipo de Documento por ID
 */
export async function getDocumentType(id, token) {
  const res = await api.get(`/api/documentTypes/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.data?.data;
}

/**
 * Cria Tipo de Documento
 */
export async function createDocumentType(payload, token) {
  const res = await api.post('/api/documentTypes', payload, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.data?.data;
}

/**
 * Atualiza Tipo de Documento
 */
export async function updateDocumentType(id, payload, token) {
  const res = await api.put(`/api/documentTypes/${id}`, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.data?.data;
}

/**
 * Remove Tipo de Documento
 */
export async function deleteDocumentType(id, token) {
  const res = await api.delete(`/api/documentTypes/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.data?.data;
}
