// src/modules/translation/translation.controller.js
import prisma from '../../../prisma/client.js';
import logger from '../../utils/logger.js';
import { registerAudit } from '../../utils/audit.js';

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
  } catch (err) {
    logger.error(`Erro em listCultures: ${err.message}`, err);
    return res.status(500).json({ success: false, message: 'Erro interno no servidor' });
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
  } catch (err) {
    logger.error(`Erro ao listar traduções: ${err.message}`, err);
    return res.status(500).json({ success: false, message: 'Erro interno no servidor' });
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
  } catch (err) {
    logger.error(`Erro em getById: ${err.message}`, err);
    return res.status(500).json({ success: false, message: 'Erro interno no servidor' });
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
  } catch (err) {
    // Trata violação de unique (ex.: @@unique([cultureId, key]))
    if (err?.code === 'P2002') {
      logger.warn(`Chave duplicada em create translation: ${err.meta?.target}`);
      return res.status(400).json({ success: false, message: 'Já existe tradução com esta key para a cultura informada' });
    }
    logger.error(`Erro ao criar tradução: ${err.message}`, err);
    return res.status(500).json({ success: false, message: 'Erro interno no servidor' });
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

    const updated = await prisma.label.update({
      where: { id },
      data: {
        cultureId: cultureId ?? undefined,
        key: key ?? undefined,
        description: description ?? undefined,
        code: code ?? undefined,
        tutorial: tutorial ?? undefined,
        version: typeof version === 'number' ? version : undefined,
      },
    });

    await registerAudit({
      userId: req.user?.id,
      action: 'UPDATE_TRANSLATION',
      entity: 'Label',
      entityId: id,
      details: `key=${updated.key} cultureId=${updated.cultureId}`,
    });

    return res.json({ success: true, message: 'Tradução atualizada com sucesso' });
  } catch (err) {
    if (err?.code === 'P2002') {
      logger.warn(`Chave duplicada em update translation: ${err.meta?.target}`);
      return res.status(400).json({ success: false, message: 'Já existe tradução com esta key para a cultura informada' });
    }
    logger.error(`Erro ao atualizar tradução: ${err.message}`, err);
    return res.status(500).json({ success: false, message: 'Erro interno no servidor' });
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
  } catch (err) {
    logger.error(`Erro ao deletar tradução: ${err.message}`, err);
    return res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
}
