// src/modules/companies/api/departments.js
import api from '../../../../api/axios';

// LISTA departamentos de um estabelecimento
export async function listDepartments(
  establishmentId,
  { page = 1, pageSize = 20, q = '' },
  token
) {
  const res = await api.get('/api/departments', {
    params: { page, pageSize, q, establishmentId },
    headers: { Authorization: `Bearer ${token}` },
  });

  // backend devolve: { success, data: { total, page, pageSize, items } }
  return res.data?.data;
}

// OBTÉM 1 departamento
export async function getDepartment(id, token) {
  const res = await api.get(`/api/departments/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data?.data;
}

// CRIA departamento dentro de um estabelecimento
export async function createDepartment(establishmentId, payload, token) {
  const res = await api.post(
    '/api/departments',
    {
      ...payload,
      establishmentId, // o controller lê de req.params.establishmentId OU body.establishmentId
    },
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return res.data?.data;
}

// ATUALIZA departamento
export async function updateDepartment(id, payload, token) {
  const res = await api.put(`/api/departments/${id}`, payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data?.data;
}

// REMOVE departamento
export async function deleteDepartment(id, token) {
  const res = await api.delete(`/api/departments/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data?.data;
}
