// src/modules/companies/api/employees.js
import api from '../../../../api/axios';

// --- LISTAGEM ---
export async function listEmployeesByCompany(
  companyId,
  { page = 1, pageSize = 20, q = '' } = {},
  token
) {
  const res = await api.get(`/api/employees/company/${companyId}`, {
    params: { page, pageSize, q },
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data?.data;
}

export async function listEmployeesByEstablishment(
  establishmentId,
  { page = 1, pageSize = 20, q = '' } = {},
  token
) {
  const res = await api.get(`/api/employees/establishment/${establishmentId}`, {
    params: { page, pageSize, q },
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data?.data;
}

// --- CRUD ---
export async function getEmployee(id, token) {
  const res = await api.get(`/api/employees/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data?.data;
}

/**
 * Criação centralizada
 * payload deve ter { companyId, establishmentId, ... }
 */
export async function createEmployee(payload, token) {
  const res = await api.post('/api/employees', payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data?.data;
}

export async function updateEmployee(id, payload, token) {
  const res = await api.put(`/api/employees/${id}`, payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data?.data;
}

export async function deleteEmployee(id, token) {
  const res = await api.delete(`/api/employees/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data?.data;
}

// Wrappers opcionais (só azuçar o DX)
export async function createEmployeeByCompany(companyId, payload, token) {
  return createEmployee({ ...payload, companyId }, token);
}

export async function createEmployeeByEstablishment(establishmentId, payload, token) {
  return createEmployee({ ...payload, establishmentId }, token);
}
