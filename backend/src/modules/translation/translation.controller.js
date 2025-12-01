import { parsePagination } from '../../infra/http/pagination.js';
import { prismaErrorToHttp } from '../../infra/http/prismaError.js';
// src/modules/translation/translation.controller.js
import prisma from '../../../prisma/client.js';
import logger from '../../utils/logger.js';
import { registerAudit } from '../../utils/audit.js';
import crypto from 'node:crypto'; // 👈 ADICIONADO

// Cache em memória por cultura (TTL 5 min)
const __i18nCache = new Map(); // cultureId -> { etag, data, expiresAt }
const I18N_TTL_MS = 5 * 60 * 1000;

// Normaliza pt/en curtos para os IDs reais do banco
function resolveCultureId(input = '') {
  const v = String(input).trim();
  if (!v) return v;
  const low = v.toLowerCase();
  if (low === 'pt' || low === 'pt-br') return 'pt-BR';
  if (low === 'en' || low === 'en-us') return 'en-US';
  return v; // já pode ser 'pt-BR', 'en-US' ou outro id válido
}

// 👇 ADICIONADO
function md5Hex(str = '') {
  return crypto.createHash('md5').update(String(str)).digest('hex');
}

async function __hashDict(obj) {
  const json = JSON.stringify(obj);
  const cryptoDynamic = await import('node:crypto');
  return cryptoDynamic.createHash('sha1').update(json).digest('hex');
}


/**
 * GET /api/translations/cultures
 * Lista culturas ativas (com filtro textual opcional)
 */
export async function listCultures(req, res) {
  try {
    const { q } = req.query;

    const where = {
      active: true,
      ...(q
        ? {
            OR: [
              { id: { contains: q, mode: 'insensitive' } },
              { description: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const cultures = await prisma.culture.findMany({
      where,
      orderBy: [{ order: 'asc' }, { description: 'asc' }],
      select: { id: true, description: true, icon: true, order: true, active: true },
    });

    return res.json({
      success: true,
      data: {
        total: cultures.length,
        items: cultures,
      },
    });
  }
  catch (err) {
    logger.error(`Erro em listCultures: ${err.message}`, err);
    const mapped = prismaErrorToHttp(err);
    if (mapped) return res.status(mapped.status).json({ success: false, error: mapped.code, message: mapped.message });
    res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
}

/**
 * GET /api/translations?cultureId=pt-BR&q=...&page=1&pageSize=20
 * Lista labels (traduções) por cultura
 */
export async function list(req, res) {
  try {
    logger.info('📥 GET /translations chamado');

    const cultureId = String(req.query.cultureId);
    const q = req.query.q ? String(req.query.q) : undefined;
    const page = parseInt(req.query.page || '1', 10);
    const pageSize = parseInt(req.query.pageSize || '20', 10);

    const where = {
      cultureId,
      ...(q
        ? {
            OR: [
              { code: { contains: q, mode: 'insensitive' } },
              { key: { contains: q, mode: 'insensitive' } },
              { description: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      prisma.label.count({ where }),
      prisma.label.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ key: 'asc' }, { code: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          cultureId: true,
          key: true,
          code: true,
          description: true, // valor traduzido
          tutorial: true,
          version: true,
          createdAt: true,
        },
      }),
    ]);

    return res.json({
      success: true,
      data: {
        total,
        page,
        pageSize,
        items,
      },
    });
  }
  catch (err) {
    logger.error(`Erro ao listar traduções: ${err.message}`, err);
    const mapped = prismaErrorToHttp(err);
    if (mapped) return res.status(mapped.status).json({ success: false, error: mapped.code, message: mapped.message });
    res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
}

/**
 * GET /api/translations/:id
 */
export async function getById(req, res) {
  try {
    const id = parseInt(req.params.id, 10);

    const label = await prisma.label.findUnique({
      where: { id },
      include: { culture: true },
    });

    if (!label) {
      return res.status(404).json({ success: false, message: 'Tradução não encontrada' });
    }

    console.log("CULTURA", {
      id: label.id,
        cultureId: label.cultureId,
        culture: label.culture?.description,
        key: label.key,
        code: label.code,
        description: label.description,
        tutorial: label.tutorial,
        version: label.version,
        createdAt: label.createdAt,
    });

    return res.json({
      success: true,
      data: {
        id: label.id,
        cultureId: label.cultureId,
        culture: label.culture?.description,
        key: label.key,
        code: label.code,
        description: label.description,
        tutorial: label.tutorial,
        version: label.version,
        createdAt: label.createdAt,
      },
    });
  }
  catch (err) {
    logger.error(`Erro em getById: ${err.message}`, err);
    const mapped = prismaErrorToHttp(err);
    if (mapped) return res.status(mapped.status).json({ success: false, error: mapped.code, message: mapped.message });
    res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
}

/**
 * POST /api/translations
 */
export async function create(req, res) {
  try {
    const { cultureId, key, description, code, tutorial, version } = req.body;

    // Confere se cultura existe/ativa (opcional mas recomendável)
    const culture = await prisma.culture.findUnique({ where: { id: cultureId } });
    if (!culture || culture.active === false) {
      return res.status(400).json({ success: false, message: 'cultureId inválido ou desativado' });
    }

    const created = await prisma.label.create({
      data: {
        cultureId,
        key,
        description,
        code: code ?? null,
        tutorial: tutorial ?? null,
        version: typeof version === 'number' ? version : null,
        // 👇 ADICIONADO: preenche uniques por hash
        keyHash: md5Hex(key),
        codeHash: code ? md5Hex(code) : null,
      },
    });

    await registerAudit({
      userId: req.user?.id,
      action: 'CREATE_TRANSLATION',
      entity: 'Label',
      entityId: created.id,
      details: `key=${created.key} cultureId=${created.cultureId}`,
    });

    return res.status(201).json({ success: true, data: created });
  }
  catch (err) {
    // Trata violação de unique (ex.: @@unique([cultureId, keyHash]) / ([cultureId, codeHash]))
    if (err?.code === 'P2002') {
      logger.warn(`Chave duplicada em create translation: ${err.meta?.target}`);
      return res.status(400).json({ success: false, message: 'Já existe tradução com esta key/code para a cultura informada' });
    }
    logger.error(`Erro ao criar tradução: ${err.message}`, err);
    const mapped = prismaErrorToHttp(err);
    if (mapped) return res.status(mapped.status).json({ success: false, error: mapped.code, message: mapped.message });
    res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
}

/**
 * PUT /api/translations/:id
 */
export async function update(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const { cultureId, key, description, code, tutorial, version } = req.body;

    // Garante que existe
    const existing = await prisma.label.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Tradução não encontrada' });
    }

    // Se culturaId enviado, valida
    if (cultureId) {
      const culture = await prisma.culture.findUnique({ where: { id: cultureId } });
      if (!culture || culture.active === false) {
        return res.status(400).json({ success: false, message: 'cultureId inválido ou desativado' });
      }
    }

    const data = {
      cultureId: cultureId ?? undefined,
      key: key ?? undefined,
      description: description ?? undefined,
      code: code ?? undefined,
      tutorial: tutorial ?? undefined,
      version: typeof version === 'number' ? version : undefined,
      // 👇 ADICIONADO: atualizar hashes apenas quando os campos mudarem
      keyHash: key !== undefined ? md5Hex(key) : undefined,
      codeHash: code !== undefined ? (code ? md5Hex(code) : null) : undefined,
    };

    const updated = await prisma.label.update({
      where: { id },
      data,
      select: { id: true, key: true, cultureId: true },
    });

    await registerAudit({
      userId: req.user?.id,
      action: 'UPDATE_TRANSLATION',
      entity: 'Label',
      entityId: id,
      details: `key=${updated.key} cultureId=${updated.cultureId}`,
    });

    return res.json({ success: true, message: 'Tradução atualizada com sucesso' });
  }
  catch (err) {
    if (err?.code === 'P2002') {
      logger.warn(`Chave duplicada em update translation: ${err.meta?.target}`);
      return res.status(400).json({ success: false, message: 'Já existe tradução com esta key/code para a cultura informada' });
    }
    logger.error(`Erro ao atualizar tradução: ${err.message}`, err);
    const mapped = prismaErrorToHttp(err);
    if (mapped) return res.status(mapped.status).json({ success: false, error: mapped.code, message: mapped.message });
    res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
}

/**
 * DELETE /api/translations/:id
 */
export async function remove(req, res) {
  try {
    const id = parseInt(req.params.id, 10);

    const existing = await prisma.label.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Tradução não encontrada' });
    }

    await prisma.label.delete({ where: { id } });

    await registerAudit({
      userId: req.user?.id,
      action: 'DELETE_TRANSLATION',
      entity: 'Label',
      entityId: id,
      details: `key=${existing.key} cultureId=${existing.cultureId}`,
    });

    return res.json({ success: true, message: 'Tradução deletada com sucesso' });
  }
  catch (err) {
    logger.error(`Erro ao deletar tradução: ${err.message}`, err);
    const mapped = prismaErrorToHttp(err);
    if (mapped) return res.status(mapped.status).json({ success: false, error: mapped.code, message: mapped.message });
    return res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
}

/**
 * GET /api/public/i18n/:cultureId
 * Retorna um dicionário { key: description } para a cultura.
 * Público: sem autenticação; apenas labels de cultures ativas.
 */
export async function getDictionary(req, res) {
  try {
    const cultureId = resolveCultureId(req.params.cultureId);
    if (!cultureId) return res.status(400).json({ success: false, message: 'cultureId obrigatório' });

    const culture = await prisma.culture.findUnique({ where: { id: cultureId } });
    if (!culture || culture.active === false) {
      return res.status(404).json({ success: false, message: 'Cultura não encontrada' });
    }

    const labels = await prisma.label.findMany({
      where: { cultureId },
      select: { key: true, description: true },
      orderBy: { key: 'asc' },
    });

    console.log("getDictionary", labels);

    const dict = Object.fromEntries(labels.map(l => [l.key, l.description]));

    // === ETag/TTL ===
    const now = Date.now();
    let entry = __i18nCache.get(cultureId);
    if (!entry || entry.expiresAt < now) {
      const etag = await __hashDict(dict);
      entry = { etag, data: dict, expiresAt: now + I18N_TTL_MS };
      __i18nCache.set(cultureId, entry);
    }

    const ifNoneMatch = req.get?.('If-None-Match');
    if (ifNoneMatch && ifNoneMatch === entry.etag) {
      res.setHeader('ETag', entry.etag);
      res.setHeader('Cache-Control', 'public, max-age=300, must-revalidate');
      return res.status(304).end();
    }

    const out = entry.data;
    res.setHeader('ETag', entry.etag);
    res.setHeader('Cache-Control', 'public, max-age=300, must-revalidate');
    return res.json({ success: true, cultureId, count: Object.keys(out).length, data: out });
  } catch (err) {
    const mapped = prismaErrorToHttp(err);
    if (mapped) return res.status(mapped.status).json({ success: false, error: mapped.code, message: mapped.message });
    return res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
}

// GET /api/public/i18n/export/:cultureId
export async function exportDictionary(req, res) {
  try {
    const cultureId = resolveCultureId(req.params.cultureId);
    if (!cultureId) return res.status(400).json({ success: false, message: 'cultureId obrigatório' });

    const culture = await prisma.culture.findUnique({ where: { id: cultureId } });
    if (!culture || culture.active === false) return res.status(404).json({ success: false, message: 'Cultura não encontrada' });

    const labels = await prisma.label.findMany({
      where: { cultureId },
      select: { key: true, description: true },
      orderBy: { key: 'asc' },
    });

    const dict = Object.fromEntries(labels.map(l => [l.key, l.description]));
    const payload = JSON.stringify(dict, null, 2);

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="i18n-${cultureId}.json"`);
    res.setHeader('Cache-Control', 'no-cache');

    console.log("exportDictionary");
    return res.status(200).send(payload);
  } catch (err) {
    const mapped = prismaErrorToHttp(err);
    if (mapped) return res.status(mapped.status).json({ success: false, error: mapped.code, message: mapped.message });
    return res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
}

// GET /api/public/i18n/export-all
export async function exportAllDictionaries(req, res) {
  try {
    const cultures = await prisma.culture.findMany({ where: { active: true }, select: { id: true } });
    const result = {};
    for (const c of cultures) {
      const labels = await prisma.label.findMany({
        where: { cultureId: c.id },
        select: { key: true, description: true },
        orderBy: { key: 'asc' },
      });
      result[c.id] = Object.fromEntries(labels.map(l => [l.key, l.description]));
    }
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    console.log("exportAllDictionaries");
    return res.status(200).send(JSON.stringify(result));
  } catch (err) {
    const mapped = prismaErrorToHttp(err);
    if (mapped) return res.status(mapped.status).json({ success: false, error: mapped.code, message: mapped.message });
    return res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
}

// LISTA CULTURAS PÚBLICAS (somente ativas, sem autenticação)
// GET /api/public/i18n/cultures
export async function listPublicCultures(req, res) {
  try {
    const cultures = await prisma.culture.findMany({
      where: { active: true },
      orderBy: [{ order: 'asc' }, { description: 'asc' }],
      select: {
        id: true,          // ex.: 'pt-BR', 'en-US'
        description: true, // 'Português (Brasil)', 'English (US)'
        icon: true,        // opcional: '🇧🇷', '🇺🇸'
      },
    });

    return res.json({
      success: true,
      data: cultures,
    });
  } catch (err) {
    logger.error(`Erro em listPublicCultures: ${err.message}`, err);
    const mapped = prismaErrorToHttp(err);
    if (mapped) {
      return res
        .status(mapped.status)
        .json({ success: false, error: mapped.code, message: mapped.message });
    }
    return res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
}

// ===== CULTURES (CRUD) =====
export async function createCulture(req, res) {
  try {
    const { id, description, icon, order, active = true } = req.body || {};
    if (!id || !description || !icon || typeof order !== 'number') {
      return res.status(400).json({ success: false, message: 'Campos obrigatórios: id, description, icon, order' });
    }
    const created = await prisma.culture.create({
      data: { id, description, icon, order, active: Boolean(active) },
      select: { id: true, description: true, icon: true, order: true, active: true },
    });
    await registerAudit({ userId: req.user?.id, action: 'CREATE_CULTURE', entity: 'Culture', entityId: created.id, details: JSON.stringify(created) });
    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    const mapped = prismaErrorToHttp(err);
    if (mapped) return res.status(mapped.status).json({ success: false, error: mapped.code, message: mapped.message });
    return res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
}

export async function updateCulture(req, res) {
  try {
    const id = String(req.params.id);
    const exists = await prisma.culture.findUnique({ where: { id } });
    if (!exists) return res.status(404).json({ success: false, message: 'Cultura não encontrada' });

    const { description, icon, order, active } = req.body || {};
    const updated = await prisma.culture.update({
      where: { id },
      data: {
        description: description ?? undefined,
        icon: icon ?? undefined,
        order: typeof order === 'number' ? order : undefined,
        active: typeof active === 'boolean' ? active : undefined,
      },
      select: { id: true, description: true, icon: true, order: true, active: true },
    });
    await registerAudit({ userId: req.user?.id, action: 'UPDATE_CULTURE', entity: 'Culture', entityId: updated.id, details: JSON.stringify(updated) });
    return res.json({ success: true, data: updated });
  } catch (err) {
    const mapped = prismaErrorToHttp(err);
    if (mapped) return res.status(mapped.status).json({ success: false, error: mapped.code, message: mapped.message });
    return res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
}

export async function deleteCulture(req, res) {
  try {
    const id = String(req.params.id);
    const labelCount = await prisma.label.count({ where: { cultureId: id } });
    if (labelCount > 0) {
      return res.status(400).json({ success: false, message: 'Não é possível remover: existem labels vinculados' });
    }
    await prisma.culture.delete({ where: { id } });
    await registerAudit({ userId: req.user?.id, action: 'DELETE_CULTURE', entity: 'Culture', entityId: id, details: '' });
    return res.json({ success: true, message: 'Cultura removida' });
  } catch (err) {
    const mapped = prismaErrorToHttp(err);
    if (mapped) return res.status(mapped.status).json({ success: false, error: mapped.code, message: mapped.message });
    return res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
}
// ===== CULTURES (CRUD) =====
