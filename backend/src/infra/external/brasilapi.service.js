// src/infra/external/brasilapi.client.js
import logger from '../../utils/logger.js';

const BRASILAPI_BASE = 'https://brasilapi.com.br/api';
const OPEN_CNPJ_BASE = 'https://api.opencnpj.org';
const VIACEP_BASE = 'https://viacep.com.br/ws';

const DEFAULT_FETCH_HEADERS = {
  'User-Agent': 'B2Z-SST/1.0 (+https://b2z.com.br)',
  Accept: 'application/json',
};

function resolvePhoneFromBrasilApi(data) {
  const candidates = [
    data.ddd_telefone_1,
    data.ddd_telefone_2,
    data.ddd_fax,
  ].filter(Boolean);
  return candidates[0] || null;
}

/**
 * Normaliza resposta da BrasilAPI para um shape único:
 *  {
 *    cnpj, legalName, tradeName, startAt, size,
 *    street, number, complement, district, city, state, zipCode, ibgeCityCode,
 *    mainCnae, mainCnaeDesc,
 *    secondaryCnaes: [{ code, title }],
 *    isHeadquarter,
 *    address: { ...mesmos campos de endereço... }
 *  }
 */
function normalizeBrasilApiCnpj(cleanCnpj, data) {
  const address = {
    street: data.logradouro || null,
    number: data.numero || null,
    complement: data.complemento || null,
    district: data.bairro || null,
    city: data.municipio || null,
    state: data.uf || null,
    zipCode: data.cep || null,
    ibgeCityCode: data.codigo_municipio_ibge || null,
  };

  // Deriva um label simples de regime tributário com base nas flags
  const simplesOptant = data.opcao_pelo_simples === 'S';
  const meiOptant = data.opcao_pelo_mei === 'S';
  let taxRegimeLabel = null;
  if (meiOptant) taxRegimeLabel = 'MEI';
  else if (simplesOptant) taxRegimeLabel = 'Simples Nacional';
  else taxRegimeLabel = 'Regime Normal';

  return {
    cnpj: cleanCnpj,
    legalName: data.razao_social || null,
    tradeName: data.nome_fantasia || null,
    startAt: data.data_inicio_atividade || null,

    // capital social (você já usava como "size")
    size: data.capital_social || null,

    // Endereço "flat"
    street: address.street,
    number: address.number,
    complement: address.complement,
    district: address.district,
    city: address.city,
    state: address.state,
    zipCode: address.zipCode,
    ibgeCityCode: address.ibgeCityCode,

    // Endereço estruturado
    address,

    // CNAEs
    mainCnae: data.cnae_fiscal_descricao ? data.cnae_fiscal : null,
    mainCnaeDesc: data.cnae_fiscal_descricao || null,
    secondaryCnaes: Array.isArray(data.cnaes_secundarios)
      ? data.cnaes_secundarios.map((x) => ({
          code: x.codigo,
          title: x.descricao,
        }))
      : [],

    isHeadquarter:
      data.descricao_identificador_matriz_filial === 'MATRIZ' ||
      data.matriz_filha === 'MATRIZ' ||
      data.matriz ||
      false,

    // 👇 Campos extras que o front pode usar direto

    // Porte / tamanho (ex.: "DEMAIS", "ME", etc.)
    porte: data.porte || null,
    porteDescription: data.descricao_porte || null,

    // Tributação
    simplesOptant,
    meiOptant,
    simplesSince: data.data_opcao_pelo_simples || null,
    simplesUntil: data.data_exclusao_do_simples || null,
    meiSince: data.data_opcao_pelo_mei || null,
    meiUntil: data.data_exclusao_do_mei || null,
    taxRegime: taxRegimeLabel,

    // Contato
    fiscalEmail: data.email || null,
    phone: resolvePhoneFromBrasilApi(data),

    // Natureza jurídica (se depois quiser exibir)
    legalNature: data.natureza_juridica || null,
  };
}

/**
 * Normaliza resposta da OpenCNPJ para o MESMO shape.
 */
function normalizeOpenCnpj(cleanCnpj, data) {
  const address = {
    street: data.logradouro || null,
    number: data.numero || null,
    complement: data.complemento || null,
    district: data.bairro || null,
    city: data.municipio || null,
    state: data.uf || null,
    zipCode: data.cep || null,
    ibgeCityCode: data.ibge || null,
  };

  return {
    cnpj: cleanCnpj,
    legalName: data.razao_social || null,
    tradeName: data.nome_fantasia || null,
    startAt: data.data_inicio_atividade || null,
    size: data.capital_social || null,
    // Endereço "flat"
    street: address.street,
    number: address.number,
    complement: address.complement,
    district: address.district,
    city: address.city,
    state: address.state,
    zipCode: address.zipCode,
    ibgeCityCode: address.ibgeCityCode,
    // Endereço estruturado
    address,
    // OpenCNPJ costuma expor cnae_principal (código)
    mainCnae: data.cnae_principal || null,
    mainCnaeDesc: null,
    secondaryCnaes: Array.isArray(data.cnaes_secundarios)
      ? data.cnaes_secundarios.map((code) => ({
          code,
          title: null,
        }))
      : [],
    isHeadquarter:
      String(data.matriz_filial || '').toLowerCase() === 'matriz',
  };
}

/**
 * Fallback: consulta no OpenCNPJ caso BrasilAPI falhe/bloqueie.
 */
async function fetchCNPJFromOpenCNPJ(cleanCnpj) {
  const url = `${OPEN_CNPJ_BASE}/${cleanCnpj}`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: DEFAULT_FETCH_HEADERS,
    });

    if (!res.ok) {
      if (res.status === 404) {
        logger.info(`[OpenCNPJ] CNPJ ${cleanCnpj} não encontrado (404)`);
      } else if (res.status === 429) {
        logger.warn(
          `[OpenCNPJ] CNPJ ${cleanCnpj} bloqueado por rate-limit (429)`
        );
      } else {
        logger.warn(`[OpenCNPJ] CNPJ ${cleanCnpj} => HTTP ${res.status}`);
      }
      return null;
    }

    const data = await res.json();
    return normalizeOpenCnpj(cleanCnpj, data);
  } catch (err) {
    logger.warn(
      `[OpenCNPJ] erro ao obter CNPJ ${cleanCnpj}: ${err?.message}`
    );
    return null;
  }
}

/**
 * Consulta CNPJ usando BrasilAPI *com fallback* para OpenCNPJ.
 */
export async function fetchCNPJFromBrasilAPI(cnpj) {
  const clean = String(cnpj || '').replace(/\D/g, '');
  if (clean.length !== 14) return null;

  const url = `${BRASILAPI_BASE}/cnpj/v1/${clean}`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: DEFAULT_FETCH_HEADERS,
    });

    if (res.ok) {
      const data = await res.json();
      return normalizeBrasilApiCnpj(clean, data);
    }

    if (res.status === 403) {
      logger.warn(
        `[BRASILAPI] CNPJ ${clean} bloqueado com HTTP 403 (provável proteção Cloudflare). ` +
          'Tentando fallback em OpenCNPJ.'
      );
      return await fetchCNPJFromOpenCNPJ(clean);
    }

    if (res.status === 404) {
      logger.info(
        `[BRASILAPI] CNPJ ${clean} não encontrado (404). Tentando fallback em OpenCNPJ.`
      );
      return await fetchCNPJFromOpenCNPJ(clean);
    }

    logger.warn(
      `[BRASILAPI] CNPJ ${clean} => HTTP ${res.status}. Tentando fallback em OpenCNPJ.`
    );
    return await fetchCNPJFromOpenCNPJ(clean);
  } catch (err) {
    logger.warn(
      `[BRASILAPI] erro ao obter CNPJ ${clean}: ${err?.message}. Tentando fallback em OpenCNPJ.`
    );
    return await fetchCNPJFromOpenCNPJ(clean);
  }
}

/**
 * CEP → ViaCEP (mantém shape já usado pelo frontend).
 */
export async function fetchCEPFromViaCEP(cep) {
  const clean = String(cep || '').replace(/\D/g, '');
  if (clean.length < 8) return null;

  const url = `${VIACEP_BASE}/${clean}/json`;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: DEFAULT_FETCH_HEADERS,
    });

    if (!res.ok) {
      logger.warn(`[VIACEP] CEP ${clean} => HTTP ${res.status}`);
      return null;
    }

    const data = await res.json();
    if (data?.erro) return null;

    return {
      cep: clean,
      street: data.logradouro || null,
      district: data.bairro || null,
      city: data.localidade || null,
      state: data.uf || null,
      ibgeCityCode: data.ibge || null,
    };
  } catch (err) {
    logger.warn(
      `[VIACEP] erro ao obter CEP ${clean}: ${err?.message}`
    );
    return null;
  }
}
