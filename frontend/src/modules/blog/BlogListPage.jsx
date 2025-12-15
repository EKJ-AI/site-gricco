import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLayout } from '../../shared/contexts/LayoutContext';
import { useTranslation } from '../../shared/i18n';
import { fetchBlogPosts } from '../../api/blog';
import './Blog.css';

const TYPE_LABELS = {
  NEWS: 'Notícia',
  ARTICLE: 'Artigo',
  PAGE: 'Página',
};

function formatDate(datetime) {
  if (!datetime) return '';
  const d = new Date(datetime);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

const BlogListPage = () => {
  const { setLayout, resetLayout } = useLayout();
  const { t } = useTranslation();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(6);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setLayout({
      pageTitle: 'Blog',
      showTopBar: true,
      showLeftSidebar: true,
      showRightPanel: true,
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
        onlyPublished: true, // 🔥 usa endpoint público
      });
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('[BlogListPage] Erro ao carregar posts', err);
      setError('Erro ao carregar posts de blog.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="conteudo blog-page">
      <div className="conteudo-interno blog-header">
        <h1>Blog &amp; Notícias</h1>
        <p>
          Conteúdos sobre SST, QSMS, compliance e sustentabilidade
          para apoiar a gestão da sua empresa.
        </p>
      </div>

      <div className="conteudo-interno blog-list">
        {loading && <div>Carregando posts...</div>}
        {error && <div className="alert alert-error">{error}</div>}
        {!loading && !error && items.length === 0 && (
          <div>Nenhum conteúdo publicado por enquanto.</div>
        )}

        <div className="blog-grid">
          {items.map((post) => (
            <article key={post.id} className="blog-card">
              {post.coverImageUrl && (
                <div className="blog-card__image">
                  <img src={post.coverImageUrl} alt={post.title} />
                </div>
              )}
              <div className="blog-card__content">
                <span className="blog-card__type">
                  {TYPE_LABELS[post.type] || post.type}
                </span>
                <h2 className="blog-card__title">
                  <Link to={`/blog/${post.slug}`}>{post.title}</Link>
                </h2>
                <p className="blog-card__meta">
                  {formatDate(post.publishedAt)} •{' '}
                  {post.readingTimeMinutes
                    ? `${post.readingTimeMinutes} min de leitura`
                    : 'Leitura rápida'}
                </p>
                {post.summary && (
                  <p className="blog-card__summary">{post.summary}</p>
                )}
                <Link to={`/blog/${post.slug}`} className="blog-card__link">
                  Ler mais
                </Link>
              </div>
            </article>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="pagination blog-pagination">
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
    </div>
  );
};

export default BlogListPage;
