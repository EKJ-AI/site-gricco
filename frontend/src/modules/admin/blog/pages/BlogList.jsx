import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLayout } from '../../../../shared/contexts/LayoutContext';
import { useTranslation } from '../../../../shared/i18n';
import RequirePermission from '../../../../shared/hooks/RequirePermission';
import {
  fetchBlogPosts,
  publishBlogPost,
  deleteBlogPost,
  unpublishBlogPost,
} from '../../../../api/blog';

const STATUS_LABELS = {
  DRAFT: 'Rascunho',
  SCHEDULED: 'Agendado',
  PUBLISHED: 'Publicado',
  ARCHIVED: 'Arquivado',
};

const TYPE_LABELS = {
  NEWS: 'Notícia',
  ARTICLE: 'Artigo',
  PAGE: 'Página',
};

function formatDate(datetime) {
  if (!datetime) return '-';
  const d = new Date(datetime);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

const BlogList = () => {
  const { setLayout, resetLayout } = useLayout();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLayout({
      pageTitle: 'Blog / Notícias',
      showTopBar: true,
      showLeftSidebar: true,
      showRightPanel: false,
    });

    return () => {
      resetLayout();
    };
  }, [setLayout, resetLayout]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchBlogPosts({
        page,
        pageSize,
        search: search || undefined,
        status: status || undefined,
        type: type || undefined,
      });
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('[BlogList] Erro ao carregar posts', err);
      setError('Erro ao carregar posts de blog.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status, type]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadData();
  };

  const handleNew = () => {
    navigate('/admin/blog/posts/new');
  };

  const handleEdit = (id) => {
    navigate(`/admin/blog/posts/${id}/edit`);
  };

  const handlePublish = async (id) => {
    if (!window.confirm('Deseja publicar este post agora?')) return;
    try {
      await publishBlogPost(id);
      await loadData();
    } catch (err) {
      console.error('[BlogList] Erro ao publicar post', err);
      setError('Erro ao publicar o post.');
    }
  };

  const handleUnpublish = async (id) => {
    if (!window.confirm('Deseja tirar este post do ar (voltar para rascunho)?')) return;
    try {
      await unpublishBlogPost(id);
      await loadData();
    } catch (err) {
      console.error('[BlogList] Erro ao despublicar post', err);
      setError('Erro ao despublicar o post.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Confirma remover (soft delete) este post?')) return;
    try {
      await deleteBlogPost(id);
      await loadData();
    } catch (err) {
      console.error('[BlogList] Erro ao remover post', err);
      setError('Erro ao remover o post.');
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="admin-page admin-blog-list">
      <div className="admin-page__header">
        <h1>Blog / Notícias</h1>
        <RequirePermission permission="blog.post.create">
          <button type="button" onClick={handleNew} className="btn btn-primary">
            + Novo post
          </button>
        </RequirePermission>
      </div>

      <div className="admin-page__filters">
        <form onSubmit={handleSearchSubmit} className="filters-form">
          <input
            type="text"
            placeholder="Buscar por título ou conteúdo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Status (todos)</option>
            <option value="DRAFT">Rascunho</option>
            <option value="SCHEDULED">Agendado</option>
            <option value="PUBLISHED">Publicado</option>
            <option value="ARCHIVED">Arquivado</option>
          </select>

          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tipo (todos)</option>
            <option value="NEWS">Notícia</option>
            <option value="ARTICLE">Artigo</option>
            <option value="PAGE">Página</option>
          </select>

          <button type="submit" className="btn">
            Buscar
          </button>
        </form>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div>Carregando...</div>
      ) : (
        <div className="admin-page__content">
          {items.length === 0 ? (
            <div>Nenhum post encontrado.</div>
          ) : (
            <table className="admin-table admin-blog-table">
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Tipo</th>
                  <th>Status</th>
                  <th>Publicado em</th>
                  <th>Views</th>
                  <th style={{ width: 260 }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {items.map((post) => (
                  <tr key={post.id}>
                    <td>{post.title}</td>
                    <td>{TYPE_LABELS[post.type] || post.type}</td>
                    <td>{STATUS_LABELS[post.status] || post.status}</td>
                    <td>{formatDate(post.publishedAt)}</td>
                    <td>{post.viewCount ?? 0}</td>
                    <td>
                      <RequirePermission permission="blog.post.update">
                        <button
                          type="button"
                          className="btn btn-small"
                          onClick={() => handleEdit(post.id)}
                        >
                          Editar
                        </button>
                      </RequirePermission>

                      <RequirePermission permission="blog.post.publish">
                        {post.status !== 'PUBLISHED' && (
                          <button
                            type="button"
                            className="btn btn-small"
                            onClick={() => handlePublish(post.id)}
                          >
                            Publicar
                          </button>
                        )}

                        {post.status === 'PUBLISHED' && (
                          <button
                            type="button"
                            className="btn btn-small btn-secondary"
                            onClick={() => handleUnpublish(post.id)}
                          >
                            Despublicar
                          </button>
                        )}
                      </RequirePermission>

                      <RequirePermission permission="blog.post.delete">
                        <button
                          type="button"
                          className="btn btn-small btn-danger"
                          onClick={() => handleDelete(post.id)}
                        >
                          Remover
                        </button>
                      </RequirePermission>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {totalPages > 1 && (
            <div className="pagination">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </button>
              <span>
                Página {page} de {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Próxima
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BlogList;
