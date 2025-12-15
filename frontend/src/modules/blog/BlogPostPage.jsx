import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import html from 'html-react-parser';
import { useLayout } from '../../shared/contexts/LayoutContext';
import { useTranslation } from '../../shared/i18n';
import { getPublicBlogPost } from '../../api/blog';
import './Blog.css';

function formatDateTime(datetime) {
  if (!datetime) return '';
  const d = new Date(datetime);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const TYPE_LABELS = {
  NEWS: 'Notícia',
  ARTICLE: 'Artigo',
  PAGE: 'Página',
};

const BlogPostPage = () => {
  const { slug } = useParams(); // 🔥 slug da URL
  const { setLayout, resetLayout } = useLayout();
  const { t } = useTranslation();

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getPublicBlogPost(slug);
        if (!data) {
          setError('Post não encontrado ou não publicado.');
        } else {
          setPost(data);
        }
      } catch (err) {
        console.error('[BlogPostPage] Erro ao carregar post', err);
        setError('Erro ao carregar conteúdo.');
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      load();
    }
  }, [slug]);

  if (loading) {
    return (
      <div className="conteudo">
        <div className="conteudo-interno blog-post">
          <div>Carregando conteúdo...</div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="conteudo">
        <div className="conteudo-interno blog-post">
          <p className="blog-post__error">{error || 'Post não encontrado.'}</p>
          <Link to="/blog" className="blog-post__back">
            ← Voltar para o blog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="conteudo blog-post-page">
      <div className="conteudo-interno blog-post-header">
        <p className="blog-post__type">
          {TYPE_LABELS[post.type] || post.type}
        </p>
        <h1 className="blog-post__title">{post.title}</h1>
        <p className="blog-post__meta">
          {formatDateTime(post.publishedAt)}{' '}
          {post.readingTimeMinutes
            ? `• ${post.readingTimeMinutes} min de leitura`
            : ''}
        </p>
      </div>

      {post.coverImageUrl && (
        <div className="blog-post-cover">
          <img src={post.coverImageUrl} alt={post.title} />
        </div>
      )}

      <div className="conteudo-interno blog-post-body">
        {post.summary && (
          <p className="blog-post__summary-highlight">{post.summary}</p>
        )}
        <div className="blog-post__content">
          {post.content ? html(post.content) : <p>(Sem conteúdo)</p>}
        </div>
        <div className="blog-post__footer">
          <Link to="/blog" className="blog-post__back">
            ← Ver outros conteúdos
          </Link>
        </div>
      </div>
    </div>
  );
};

export default BlogPostPage;
