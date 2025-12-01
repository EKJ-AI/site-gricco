// src/modules/admin/companies/api/documents.js
import api from '../../../../api/axios';

// ----------------- DOCUMENTS (CRUD + list) -----------------

export async function listDocuments(
  companyId,
  establishmentId,
  { page = 1, pageSize = 20, q = '', status, typeId } = {},
  token
) {
  const params = { page, pageSize, q };
  if (status) params.status = status;
  if (typeId) params.typeId = typeId;

  const res = await api.get(
    `/api/companies/${companyId}/establishments/${establishmentId}/documents`,
    {
      params,
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return res.data?.data;
}

export async function getDocument(
  companyId,
  establishmentId,
  documentId,
  token
) {
  const res = await api.get(
    `/api/companies/${companyId}/establishments/${establishmentId}/documents/${documentId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return res.data?.data;
}

export async function createDocument(
  companyId,
  establishmentId,
  payload,
  token
) {
  const res = await api.post(
    `/api/companies/${companyId}/establishments/${establishmentId}/documents`,
    payload,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return res.data?.data;
}

export async function updateDocument(
  companyId,
  establishmentId,
  documentId,
  payload,
  token
) {
  const res = await api.put(
    `/api/companies/${companyId}/establishments/${establishmentId}/documents/${documentId}`,
    payload,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return res.data?.data;
}

export async function deleteDocument(
  companyId,
  establishmentId,
  documentId,
  token
) {
  const res = await api.delete(
    `/api/companies/${companyId}/establishments/${establishmentId}/documents/${documentId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return res.data?.data;
}

// Pequeno helper para busca de documentos (mesmo endpoint da listagem)
export async function searchDocuments(
  companyId,
  establishmentId,
  { q = '', page = 1, pageSize = 20 } = {},
  token
) {
  return listDocuments(
    companyId,
    establishmentId,
    { q, page, pageSize },
    token
  );
}

// ----------------- VERSIONS -----------------

export async function listVersions(
  companyId,
  establishmentId,
  documentId,
  token
) {
  const res = await api.get(
    `/api/companies/${companyId}/establishments/${establishmentId}/documents/${documentId}/versions`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return res.data?.data;
}

export async function uploadVersion(
  companyId,
  establishmentId,
  documentId,
  formData,
  token
) {
  const res = await api.post(
    `/api/companies/${companyId}/establishments/${establishmentId}/documents/${documentId}/versions`,
    formData,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return res.data?.data;
}

export async function activateVersion(
  companyId,
  establishmentId,
  documentId,
  versionId,
  token
) {
  const res = await api.post(
    `/api/companies/${companyId}/establishments/${establishmentId}/documents/${documentId}/versions/${versionId}/activate`,
    {},
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return res.data?.data;
}

// ----------------- RELACIONAMENTOS ENTRE DOCUMENTOS -----------------

export async function listRelations(
  companyId,
  establishmentId,
  documentId,
  { direction, relationType, page = 1, pageSize = 50 } = {},
  token
) {
  const params = { page, pageSize };
  if (direction) params.direction = direction; // 'parent' or 'child'
  if (relationType) params.relationType = relationType;

  const res = await api.get(
    `/api/companies/${companyId}/establishments/${establishmentId}/documents/${documentId}/relations`,
    {
      params,
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return res.data?.data;
}

export async function createRelation(
  companyId,
  establishmentId,
  documentId,
  payload,
  token
) {
  const res = await api.post(
    `/api/companies/${companyId}/establishments/${establishmentId}/documents/${documentId}/relations`,
    payload,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return res.data?.data;
}

export async function deleteRelation(
  companyId,
  establishmentId,
  documentId,
  relationId,
  token
) {
  const res = await api.delete(
    `/api/companies/${companyId}/establishments/${establishmentId}/documents/${documentId}/relations/${relationId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return res.data?.data;
}

// ----------------- DOCUMENT TYPES (para Autocomplete / modal) -----------------

export async function searchDocumentTypes(
  query,
  token,
  { kind, page = 1, pageSize = 20 } = {}
) {
  const params = {
    q: query || '',
    page,
    pageSize,
  };
  if (kind) {
    params.kind = kind; // MAIN / EVIDENCE / OTHER
  }

  const res = await api.get('/api/documentTypes', {
    params,
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data?.data;
}
