import api from '../../../../api/axios';

export async function listCompanies(
  { page = 1, pageSize = 12, q = '', status = 'all' } = {},
  token,
) {
  const res = await api.get('/api/companies', {
    params: { page, pageSize, q, status },
    headers: { Authorization: `Bearer ${token}` },
  });

  console.log('listCompanies ', res);

  return res.data?.data;
}

export async function getCompany(id, token) {
  const res = await api.get(`/api/companies/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  console.log('getCompany: ', res);

  return res.data?.data;
}

export async function createCompany(payload, token) {
  const res = await api.post('/api/companies', payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data?.data;
}

export async function updateCompany(id, payload, token) {
  const res = await api.put(`/api/companies/${id}`, payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data?.data;
}

export async function deleteCompany(id, token) {
  const res = await api.delete(`/api/companies/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data?.data;
}
