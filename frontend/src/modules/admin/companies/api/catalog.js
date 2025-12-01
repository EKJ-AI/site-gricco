// src/api/catalog.js
import api from '../../../../api/axios';

/**
 * Helpers
 */
const authHeaders = (token) =>
  token ? { Authorization: `Bearer ${token}` } : undefined;

const clamp = (n, min, max) => Math.max(min, Math.min(max, Number(n) || min));

/**
 * Normaliza payloads que podem vir como:
 *  - { success, data: { items, total, page, pageSize } }
 *  - { success, data: [...] }
 *  - [...]
 */
function normalizeListResponse(res) {
  const root = res?.data?.data ?? res?.data ?? {};
  if (Array.isArray(root)) {
    return { items: root, total: root.length, page: 1, pageSize: root.length };
  }
  return {
    items: root.items ?? [],
    total: root.total ?? (root.items ? root.items.length : 0),
    page: root.page ?? 1,
    pageSize: root.pageSize ?? (root.items ? root.items.length : 0),
  };
}

/**
 * Tenta uma rota e, se 404, tenta a rota alternativa.
 * ex.: cnaes ↔ cnae, cbos ↔ cbo
 */
async function tryAltRoutes(primaryPath, fallbackPath, config) {
  try {
    return await api.get(primaryPath, config);
  } catch (err) {
    if (err?.response?.status === 404 && fallbackPath) {
      return await api.get(fallbackPath, config);
    }
    throw err;
  }
}

/**
 * Busca CNAE (por code/title) — tenta /cnaes e fallback para /cnae
 * Backend esperado (preferencial): GET /api/catalogs/cnaes?q=&page=&pageSize=
 * Suporte a variação legada:      GET /api/catalogs/cnae?q=&page=&pageSize=
 */
export async function searchCNAE(q, page = 1, pageSize = 10, token) {
  const params = {
    q: q ?? '',
    page: clamp(page, 1, 10_000),
    pageSize: clamp(pageSize, 1, 200),
  };
  const config = { params, headers: authHeaders(token) };
  const res = await tryAltRoutes('/api/catalogs/cnaes', '/api/catalogs/cnae', config);
  return normalizeListResponse(res);
}

/**
 * Busca CBO (por code/title) — tenta /cbos e fallback para /cbo
 * Backend esperado (preferencial): GET /api/catalogs/cbos?q=&page=&pageSize=
 * Suporte a variação legada:      GET /api/catalogs/cbo?q=&page=&pageSize=
 */
export async function searchCBO(q, page = 1, pageSize = 10, token) {
  const params = {
    q: q ?? '',
    page: clamp(page, 1, 10_000),
    pageSize: clamp(pageSize, 1, 200),
  };
  const config = { params, headers: authHeaders(token) };
  const res = await tryAltRoutes('/api/catalogs/cbos', '/api/catalogs/cbo', config);
  return normalizeListResponse(res);
}

/**
 * CEP → ViaCEP (via backend)
 * GET /api/catalogs/cep/:cep
 * Retorna objeto normalizado com: { cep, street, district, city, state, ibgeCityCode, ... }
 */
export async function lookupCEP(cep, token) {
  if (!cep) return null;
  const res = await api.get(`/api/catalogs/cep/${encodeURIComponent(String(cep))}`, {
    headers: authHeaders(token),
  });
  return res?.data?.data ?? null;
}

/**
 * CNPJ → BrasilAPI (via backend)
 * GET /api/catalogs/cnpj/:cnpj
 * Retorna objeto normalizado com campos úteis para autofill de Company/Establishment:
 * { cnpj, legalName, tradeName, startAt, address..., mainCnae, secondaryCnaes: [{code,title}], ... }
 */
export async function lookupCNPJ(cnpj, token) {
  if (!cnpj) return null;
  const res = await api.get(`/api/catalogs/cnpj/${encodeURIComponent(String(cnpj))}`, {
    headers: authHeaders(token),
  });
  return res?.data?.data ?? null;
}

/**
 * Opcional: busca um CNAE específico por código (ex.: “6201-5/01”)
 * Tenta /cnaes/:code e fallback /cnae/:code
 */
export async function getCNAEByCode(code, token) {
  if (!code) return null;
  const cfg = { headers: authHeaders(token) };
  const safe = encodeURIComponent(String(code));
  const res = await tryAltRoutes(`/api/catalogs/cnaes/${safe}`, `/api/catalogs/cnae/${safe}`, cfg);
  return res?.data?.data ?? null;
}
