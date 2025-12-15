import logger from '../../utils/logger.js';
import { prismaErrorToHttp } from '../../infra/http/prismaError.js';
import { registerAudit } from '../../utils/audit.js';
import { parsePagination } from '../../infra/http/pagination.js';
import blogService from './blog.service.js';

export async function list(req, res) {
  try {
    logger.info('📥 GET /blog (admin) chamado');

    const { skip, take, page, pageSize } = parsePagination(req);
    const { status, type, search, onlyPublished } = req.query;

    const result = await blogService.listPosts({
      status: status || undefined,
      type: type || undefined,
      search: search || undefined,
      skip,
      take,
      onlyPublished:
        typeof onlyPublished === 'string'
          ? onlyPublished.toLowerCase() === 'true'
          : false,
    });

    res.json({
      success: true,
      data: {
        total: result.total,
        page,
        pageSize,
        items: result.items,
      },
    });
  } catch (err) {
    logger.error(`Erro ao listar posts de blog: ${err.message}`, err);
    const mapped = prismaErrorToHttp(err);
    if (mapped) {
      return res.status(mapped.status).json({
        success: false,
        error: mapped.code,
        message: mapped.message,
      });
    }
    res
      .status(500)
      .json({ success: false, message: 'Erro interno no servidor' });
  }
}

/**
 * LISTA PÚBLICA
 * - não exige autenticação
 * - só retorna PUBLISHED
 */
export async function listPublic(req, res) {
  try {
    logger.info('📥 GET /blog/public (público) chamado');

    const { skip, take, page, pageSize } = parsePagination(req);
    const { type, search } = req.query;

    const result = await blogService.listPosts({
      status: undefined,
      type: type || undefined,
      search: search || undefined,
      skip,
      take,
      onlyPublished: true, // 🔥 só publicados
    });

    res.json({
      success: true,
      data: {
        total: result.total,
        page,
        pageSize,
        items: result.items,
      },
    });
  } catch (err) {
    logger.error(`Erro ao listar posts públicos: ${err.message}`, err);
    const mapped = prismaErrorToHttp(err);
    if (mapped) {
      return res.status(mapped.status).json({
        success: false,
        error: mapped.code,
        message: mapped.message,
      });
    }
    res
      .status(500)
      .json({ success: false, message: 'Erro interno no servidor' });
  }
}

export async function getById(req, res) {
  try {
    const { id } = req.params;

    const post = await blogService.getById(id);
    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: 'Post não encontrado' });
    }

    res.json({ success: true, data: post });
  } catch (err) {
    logger.error(`Erro em getById (blog): ${err.message}`, err);
    const mapped = prismaErrorToHttp(err);
    if (mapped) {
      return res.status(mapped.status).json({
        success: false,
        error: mapped.code,
        message: mapped.message,
      });
    }
    res
      .status(500)
      .json({ success: false, message: 'Erro interno no servidor' });
  }
}

export async function getBySlug(req, res) {
  try {
    const { slug } = req.params;

    const post = await blogService.getBySlug(slug);
    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: 'Post não encontrado' });
    }

    res.json({ success: true, data: post });
  } catch (err) {
    logger.error(`Erro em getBySlug (blog): ${err.message}`, err);
    const mapped = prismaErrorToHttp(err);
    if (mapped) {
      return res.status(mapped.status).json({
        success: false,
        error: mapped.code,
        message: mapped.message,
      });
    }
    res
      .status(500)
      .json({ success: false, message: 'Erro interno no servidor' });
  }
}

export async function create(req, res) {
  try {
    const userId = req.user?.id;

    const post = await blogService.createPost(req.body, userId);

    await registerAudit({
      userId,
      action: 'CREATE_BLOG_POST',
      entity: 'BlogPost',
      entityId: post.id,
      details: `Post criado: ${post.title} (slug=${post.slug})`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(201).json({ success: true, data: post });
  } catch (err) {
    logger.error(`Erro ao criar post de blog: ${err.message}`, err);
    const mapped = prismaErrorToHttp(err);
    if (mapped) {
      return res.status(mapped.status).json({
        success: false,
        error: mapped.code,
        message: mapped.message,
      });
    }
    res
      .status(500)
      .json({ success: false, message: 'Erro interno no servidor' });
  }
}

export async function update(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const updated = await blogService.updatePost(id, req.body, userId);

    await registerAudit({
      userId,
      action: 'UPDATE_BLOG_POST',
      entity: 'BlogPost',
      entityId: updated.id,
      details: `Post atualizado: ${updated.title} (slug=${updated.slug})`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({
      success: true,
      message: 'Post atualizado com sucesso',
      data: updated,
    });
  } catch (err) {
    logger.error(`Erro ao atualizar post de blog: ${err.message}`, err);
    const mapped = prismaErrorToHttp(err);
    if (mapped) {
      return res.status(mapped.status).json({
        success: false,
        error: mapped.code,
        message: mapped.message,
      });
    }
    res
      .status(500)
      .json({ success: false, message: 'Erro interno no servidor' });
  }
}

export async function publish(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { date } = req.body;

    const published = await blogService.publishPost(
      id,
      userId,
      date ? new Date(date) : undefined,
    );

    await registerAudit({
      userId,
      action: 'UPDATE_BLOG_POST',
      entity: 'BlogPost',
      entityId: published.id,
      details: `Post publicado: ${published.title} (slug=${published.slug})`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({
      success: true,
      message: 'Post publicado com sucesso',
      data: published,
    });
  } catch (err) {
    logger.error(`Erro ao publicar post de blog: ${err.message}`, err);
    const mapped = prismaErrorToHttp(err);
    if (mapped) {
      return res.status(mapped.status).json({
        success: false,
        error: mapped.code,
        message: mapped.message,
      });
    }
    res
      .status(500)
      .json({ success: false, message: 'Erro interno no servidor' });
  }
}

export async function unpublish(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const unpublished = await blogService.unpublishPost(id, userId);

    await registerAudit({
      userId,
      action: 'UPDATE_BLOG_POST',
      entity: 'BlogPost',
      entityId: unpublished.id,
      details: `Post despublicado: ${unpublished.title} (slug=${unpublished.slug})`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({
      success: true,
      message: 'Post despublicado com sucesso (voltou para rascunho).',
      data: unpublished,
    });
  } catch (err) {
    logger.error(`Erro ao despublicar post de blog: ${err.message}`, err);
    const mapped = prismaErrorToHttp(err);
    if (mapped) {
      return res.status(mapped.status).json({
        success: false,
        error: mapped.code,
        message: mapped.message,
      });
    }
    res
      .status(500)
      .json({ success: false, message: 'Erro interno no servidor' });
  }
}

export async function remove(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const deleted = await blogService.softDeletePost(id, userId);

    await registerAudit({
      userId,
      action: 'DELETE_BLOG_POST',
      entity: 'BlogPost',
      entityId: deleted.id,
      details: `Post marcado como deletado (soft delete): ${deleted.title} (slug=${deleted.slug})`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({
      success: true,
      message: 'Post removido (soft delete) com sucesso',
    });
  } catch (err) {
    logger.error(`Erro ao remover post de blog: ${err.message}`, err);
    const mapped = prismaErrorToHttp(err);
    if (mapped) {
      return res.status(mapped.status).json({
        success: false,
        error: mapped.code,
        message: mapped.message,
      });
    }
    res
      .status(500)
      .json({ success: false, message: 'Erro interno no servidor' });
  }
}
