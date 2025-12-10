import prisma from '../../../../../prisma/client.js';
import { parsePagination } from '../../../../infra/http/pagination.js';
import { prismaErrorToHttp } from '../../../../infra/http/prismaError.js';
import logger from '../../../../utils/logger.js';
import {
  fetchCEPFromViaCEP,
  fetchCNPJFromBrasilAPI,
} from '../../../../infra/external/brasilapi.service.js';

/**
 * GET /api/catalogs/cnaes?q=&page=&pageSize=
 * Busca no teu DB (tabela CNAE)
 */
export async function searchCNAE(req, res) {
  try {
    const { q } = req.query;
    const { skip, take, page, pageSize } = parsePagination(req);

    const where = q
      ? {
          OR: [
            { code: { contains: q, mode: 'insensitive' } },
            { title: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {};

    const [total, items] = await Promise.all([
      prisma.cNAE.count({ where }),
      prisma.cNAE.findMany({
        where,
        skip,
        take,
        orderBy: [{ code: 'asc' }],
        // 👇 agora trazendo também o risco oficial do catálogo (NR-1)
        select: {
          id: true,
          code: true,
          title: true,
          nrRisk: true, // <--- IMPORTANTE
        },
      }),
    ]);

    return res.json({
      success: true,
      data: { total, page, pageSize, items },
    });
  } catch (err) {
    const mapped = prismaErrorToHttp(err);
    if (mapped) {
      return res
        .status(mapped.status)
        .json({ success: false, ...mapped });
    }
    logger.error(`[CATALOGS] searchCNAE error: ${err.message}`, err);
    return res
      .status(500)
      .json({ success: false, message: 'Internal error' });
  }
}

/**
 * GET /api/catalogs/cbos?q=&page=&pageSize=
 * Busca no DB (tabela CBO)
 */
export async function searchCBO(req, res) {
  try {
    const { q } = req.query;
    const { skip, take, page, pageSize } = parsePagination(req);

    const where = q
      ? {
          OR: [
            { code: { contains: q, mode: 'insensitive' } },
            { title: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {};

    const [total, items] = await Promise.all([
      prisma.cBO.count({ where }),
      prisma.cBO.findMany({
        where,
        skip,
        take,
        orderBy: [{ code: 'asc' }],
        select: { id: true, code: true, title: true },
      }),
    ]);

    return res.json({
      success: true,
      data: { total, page, pageSize, items },
    });
  } catch (err) {
    const mapped = prismaErrorToHttp(err);
    if (mapped) {
      return res
        .status(mapped.status)
        .json({ success: false, ...mapped });
    }
    logger.error(`[CATALOGS] searchCBO error: ${err.message}`, err);
    return res
      .status(500)
      .json({ success: false, message: 'Internal error' });
  }
}

/**
 * GET /api/catalogs/cep/:cep
 * Proxy ViaCEP
 */
export async function getCEP(req, res) {
  try {
    const { cep } = req.params;
    const data = await fetchCEPFromViaCEP(cep);
    if (!data) {
      return res
        .status(404)
        .json({ success: false, message: 'CEP not found' });
    }

    return res.json({ success: true, data });
  } catch (_err) {
    return res
      .status(500)
      .json({ success: false, message: 'Internal error' });
  }
}

/**
 * GET /api/catalogs/cnpj/:cnpj
 * Proxy BrasilAPI — retorna estrutura normalizada para Company/Establishment forms
 */
export async function getCNPJ(req, res) {
  try {
    const { cnpj } = req.params;
    const data = await fetchCNPJFromBrasilAPI(cnpj);
    if (!data) {
      return res
        .status(404)
        .json({ success: false, message: 'CNPJ not found' });
    }

    const normalized = {
      ...data,
      mainCnae: normalizeCnae(data.mainCnae),
      secondaryCnaes: (data.secondaryCnaes || []).map((s) => ({
        code: normalizeCnae(s.code),
        title: s.title || '',
      })),
    };

    return res.json({ success: true, data: normalized });
  } catch (_err) {
    return res
      .status(500)
      .json({ success: false, message: 'Internal error' });
  }
}

// Mesmo normalizador usado no service da Company
function normalizeCnae(code) {
  if (!code) return null;
  const digits = String(code).replace(/\D/g, '');
  if (digits.length !== 7) return String(code);
  return `${digits.slice(0, 4)}-${digits.slice(4, 5)}/${digits.slice(
    5,
    7,
  )}`;
}
