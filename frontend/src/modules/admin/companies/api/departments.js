import api from '../../../../api/axios';

/**
 * ⚠️ LEGADO:
 * Usa /api/departments com filtro por establishmentId.
 * Mantido por compatibilidade, mas ideal é usar as funções aninhadas
 * com companyId + establishmentId (multi-tenant + RBAC por empresa).
 */
export async function listDepartments(
  establishmentId,
  { page = 1, pageSize = 20, q = '', status = 'all' } = {},
  token,
) {
  const isActive =
    status === 'active' ? true : status === 'inactive' ? false : undefined;

  const params = {
    page,
    pageSize,
    q,
    establishmentId,
  };

  if (isActive !== undefined) {
    params.isActive = isActive;
  }

  const res = await api.get('/api/departments', {
    params,
    headers: { Authorization: `Bearer ${token}` },
  });

  // backend devolve: { success, data: { total, page, pageSize, items } }
  return res.data?.data;
}

export async function getDepartment(id, token) {
  const res = await api.get(`/api/departments/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data?.data;
}

export async function createDepartment(establishmentId, payload, token) {
  const res = await api.post(
    '/api/departments',
    {
      ...payload,
      establishmentId, // controller lê de body.establishmentId
    },
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  return res.data?.data;
}

export async function updateDepartment(id, payload, token) {
  const res = await api.put(`/api/departments/${id}`, payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data?.data;
}

export async function deleteDepartment(id, token) {
  const res = await api.delete(`/api/departments/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data?.data;
}

/**
 * 🔐 NOVO (RECOMENDADO):
 * Versão multi-tenant, alinhada ao establishment.child.routes.js:
 *   /api/companies/:companyId/establishments/:establishmentId/departments
 */

export async function listDepartmentsInEstablishment(
  companyId,
  establishmentId,
  { page = 1, pageSize = 20, q = '', status = 'all' } = {},
  token,
) {
  const isActive =
    status === 'active' ? true : status === 'inactive' ? false : undefined;

  const params = { page, pageSize, q };
  if (isActive !== undefined) {
    params.isActive = isActive;
  }

  const res = await api.get(
    `/api/companies/${companyId}/establishments/${establishmentId}/departments`,
    {
      params,
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  return res.data?.data;
}

export async function getDepartmentInEstablishment(
  companyId,
  establishmentId,
  departmentId,
  token,
) {
  const res = await api.get(
    `/api/companies/${companyId}/establishments/${establishmentId}/departments/${departmentId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  return res.data?.data;
}

export async function createDepartmentInEstablishment(
  companyId,
  establishmentId,
  payload,
  token,
) {
  const res = await api.post(
    `/api/companies/${companyId}/establishments/${establishmentId}/departments`,
    payload,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  return res.data?.data;
}

export async function updateDepartmentInEstablishment(
  companyId,
  establishmentId,
  departmentId,
  payload,
  token,
) {
  const res = await api.put(
    `/api/companies/${companyId}/establishments/${establishmentId}/departments/${departmentId}`,
    payload,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  return res.data?.data;
}

export async function deleteDepartmentInEstablishment(
  companyId,
  establishmentId,
  departmentId,
  token,
) {
  const res = await api.delete(
    `/api/companies/${companyId}/establishments/${establishmentId}/departments/${departmentId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  return res.data?.data;
}
