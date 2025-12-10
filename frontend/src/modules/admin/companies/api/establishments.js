import api from '../../../../api/axios';

// lista estabelecimentos de uma company
export async function listEstablishments(
  companyId,
  { page = 1, pageSize = 12, q = '', status = 'all' } = {},
  token,
) {
  if (!companyId) {
    throw new Error('companyId is required to list establishments');
  }

  const res = await api.get(`/api/companies/${companyId}/establishments`, {
    params: { page, pageSize, q, status },
    headers: { Authorization: `Bearer ${token}` },
  });

  return res.data?.data || res.data;
}

// pega UM estabelecimento (sempre com companyId + establishmentId)
export async function getEstablishment(companyId, establishmentId, token) {
  if (!companyId || !establishmentId) {
    throw new Error('companyId and establishmentId are required to get establishment');
  }

  const res = await api.get(
    `/api/companies/${companyId}/establishments/${establishmentId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  return res.data?.data || res.data;
}

export async function createEstablishment(companyId, payload, token) {
  if (!companyId) {
    throw new Error('companyId is required to create establishment');
  }

  const res = await api.post(
    `/api/companies/${companyId}/establishments`,
    payload,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  return res.data?.data || res.data;
}

export async function updateEstablishment(
  companyId,
  establishmentId,
  payload,
  token,
) {
  if (!companyId || !establishmentId) {
    throw new Error('companyId and establishmentId are required to update establishment');
  }

  const res = await api.put(
    `/api/companies/${companyId}/establishments/${establishmentId}`,
    payload,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  return res.data?.data || res.data;
}

export async function deleteEstablishment(companyId, establishmentId, token) {
  if (!companyId || !establishmentId) {
    throw new Error('companyId and establishmentId are required to delete establishment');
  }

  const res = await api.delete(
    `/api/companies/${companyId}/establishments/${establishmentId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  return res.data?.data || res.data;
}
