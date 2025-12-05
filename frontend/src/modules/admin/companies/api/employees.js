// src/modules/companies/api/employees.js
import api from '../../../../api/axios';

/**
 * ⚠️ LEGADO:
 * Rotas centrais /api/employees /api/employees/company/:id /api/employees/establishment/:id
 * Mantidas por compatibilidade, mas o fluxo novo recomendado é via
 * rotas aninhadas em /api/companies/:companyId/establishments/:establishmentId/employees
 */

// --- LISTAGEM LEGACY ---
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

// --- CRUD LEGACY ---
export async function getEmployee(id, token) {
  const res = await api.get(`/api/employees/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data?.data;
}

/**
 * Criação “centralizada”
 *
 * Regra:
 *  - Se vierem companyId e establishmentId no payload → usa rota NOVA aninhada:
 *      /api/companies/:companyId/establishments/:establishmentId/employees
 *  - Senão → tenta rota LEGACY /api/employees (se estiver montada no backend)
 */
export async function createEmployee(payload, token) {
  const { companyId, establishmentId, ...rest } = payload || {};

  if (companyId && establishmentId) {
    // ✅ Caminho novo, alinhado com SST (sempre dentro do estabelecimento)
    const res = await api.post(
      `/api/companies/${companyId}/establishments/${establishmentId}/employees`,
      rest,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return res.data?.data;
  }

  // ⚠️ Fallback legado: só use se ainda tiver backend expondo /api/employees
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

// Açúcar sintático legacy
export async function createEmployeeByCompany(companyId, payload, token) {
  // continua usando a lógica de createEmployee (fallback legado)
  return createEmployee({ ...payload, companyId }, token);
}

export async function createEmployeeByEstablishment(
  establishmentId,
  payload,
  token
) {
  // idem acima; se você quiser forçar por estabelecimento,
  // pode passar companyId também aqui mais pra frente.
  return createEmployee({ ...payload, establishmentId }, token);
}

/**
 * 🔐 NOVO (RECOMENDADO):
 * Rotas aninhadas alinhadas com SST:
 *   /api/companies/:companyId/establishments/:establishmentId/employees
 */

export async function listEmployeesInEstablishment(
  companyId,
  establishmentId,
  { page = 1, pageSize = 20, q = '' } = {},
  token
) {
  const res = await api.get(
    `/api/companies/${companyId}/establishments/${establishmentId}/employees`,
    {
      params: { page, pageSize, q },
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return res.data?.data;
}

export async function getEmployeeInEstablishment(
  companyId,
  establishmentId,
  employeeId,
  token
) {
  const res = await api.get(
    `/api/companies/${companyId}/establishments/${establishmentId}/employees/${employeeId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return res.data?.data;
}

export async function createEmployeeInEstablishment(
  companyId,
  establishmentId,
  payload,
  token
) {
  const res = await api.post(
    `/api/companies/${companyId}/establishments/${establishmentId}/employees`,
    payload,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return res.data?.data;
}

export async function updateEmployeeInEstablishment(
  companyId,
  establishmentId,
  employeeId,
  payload,
  token
) {
  const res = await api.put(
    `/api/companies/${companyId}/establishments/${establishmentId}/employees/${employeeId}`,
    payload,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return res.data?.data;
}

export async function deleteEmployeeInEstablishment(
  companyId,
  establishmentId,
  employeeId,
  token
) {
  const res = await api.delete(
    `/api/companies/${companyId}/establishments/${establishmentId}/employees/${employeeId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return res.data?.data;
}
