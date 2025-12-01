// src/modules/admin/companies/api/establishments.js
import api from '../../../../api/axios';

// lista estabelecimentos de uma company
export async function listEstablishments(
  companyId,
  { page = 1, pageSize = 12, q = '' },
  token
) {
  const res = await api.get(`/api/companies/${companyId}/establishments`, {
    params: { page, pageSize, q },
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data?.data;
}

// pega UM estabelecimento (sempre com companyId + establishmentId)
export async function getEstablishment(companyId, establishmentId, token) {
  const res = await api.get(
    `/api/companies/${companyId}/establishments/${establishmentId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return res.data?.data;
}

// cria estabelecimento dentro da company
export async function createEstablishment(companyId, payload, token) {
  const res = await api.post(
    `/api/companies/${companyId}/establishments`,
    payload,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return res.data?.data;
}

// atualiza estabelecimento dentro da company
export async function updateEstablishment(
  companyId,
  establishmentId,
  payload,
  token
) {
  const res = await api.put(
    `/api/companies/${companyId}/establishments/${establishmentId}`,
    payload,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return res.data?.data;
}

// remove estabelecimento
export async function deleteEstablishment(companyId, establishmentId, token) {
  const res = await api.delete(
    `/api/companies/${companyId}/establishments/${establishmentId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return res.data?.data;
}
