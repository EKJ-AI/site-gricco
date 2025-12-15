import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLayout } from '../../../../shared/contexts/LayoutContext';
import { useTranslation } from '../../../../shared/i18n';
import {
  createBlogPost,
  getBlogPostById,
  updateBlogPost,
} from '../../../../api/blog';

// Editor rich-text
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const TYPE_OPTIONS = [
  { value: 'NEWS', label: 'Notícia' },
  { value: 'ARTICLE', label: 'Artigo' },
  { value: 'PAGE', label: 'Página' },
];

const STATUS_LABELS = {
  DRAFT: 'Rascunho',
  SCHEDULED: 'Agendado',
  PUBLISHED: 'Publicado',
  ARCHIVED: 'Arquivado',
};

// Config do ReactQuill
const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ align: [] }],
    ['link', 'blockquote', 'code-block'],
    ['clean'],
  ],
};

const quillFormats = [
  'header',
  'bold',
  'italic',
  'underline',
  'strike',
  'list',
  'bullet',
  'align',
  'link',
  'blockquote',
  'code-block',
];

const BlogForm = ({ mode }) => {
  const { setLayout, resetLayout } = useLayout();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { postId } = useParams();

  const isEdit = mode === 'edit';

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState('ARTICLE');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [status, setStatus] = useState('DRAFT'); // só exibido (sem permitir troca aqui)
  const [publishedAt, setPublishedAt] = useState(null);

  useEffect(() => {
    setLayout({
      pageTitle: isEdit ? 'Editar post do Blog' : 'Novo post do Blog',
      showTopBar: true,
      showLeftSidebar: true,
      showRightPanel: false,
    });

    return () => {
      resetLayout();
    };
  }, [setLayout, resetLayout, isEdit]);

  useEffect(() => {
    if (!isEdit || !postId) return;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const post = await getBlogPostById(postId);
        if (!post) {
          setError('Post não encontrado.');
          return;
        }

        setTitle(post.title || '');
        setSlug(post.slug || '');
        setSummary(post.summary || '');
        setContent(post.content || '');
        setType(post.type || 'ARTICLE');
        setCoverImageUrl(post.coverImageUrl || '');
        setMetaTitle(post.metaTitle || '');
        setMetaDescription(post.metaDescription || '');
        setIsFeatured(!!post.isFeatured);
        setStatus(post.status || 'DRAFT');
        setPublishedAt(post.publishedAt || null);
      } catch (err) {
        console.error('[BlogForm] Erro ao carregar post', err);
        setError('Erro ao carregar post.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [isEdit, postId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Título é obrigatório.');
      return;
    }

    if (!slug.trim()) {
      setError('Slug é obrigatório.');
      return;
    }

    const payload = {
      title: title.trim(),
      slug: slug.trim(),
      summary: summary.trim() || null,
      content: content || '',
      type,
      coverImageUrl: coverImageUrl.trim() || null,
      metaTitle: metaTitle.trim() || null,
      metaDescription: metaDescription.trim() || null,
      isFeatured,
    };

    setSaving(true);
    try {
      if (isEdit) {
        await updateBlogPost(postId, payload);
      } else {
        await createBlogPost(payload);
      }
      navigate('/admin/blog/posts');
    } catch (err) {
      console.error('[BlogForm] Erro ao salvar post', err);
      setError('Erro ao salvar post.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate('/admin/blog/posts');
  };

  if (loading) {
    return <div>Carregando post...</div>;
  }

  return (
    <div className="admin-page admin-blog-form">
      <div className="admin-page__header">
        <h1>{isEdit ? 'Editar post' : 'Novo post'}</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit} className="admin-form">
        <div className="form-group">
          <label htmlFor="title">Título *</label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Nova NR-01 entra em vigor"
          />
        </div>

        <div className="form-group">
          <label htmlFor="slug">Slug (URL) *</label>
          <input
            id="slug"
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="ex: nova-nr-01-entra-em-vigor"
          />
          <small>
            URL pública ficará /blog/
            <strong>{slug || 'meu-slug'}</strong>
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="type">Tipo</label>
          <select
            id="type"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {isEdit && (
          <div className="form-group">
            <label>Status atual</label>
            <div>
              <strong>{STATUS_LABELS[status] || status}</strong>
              {publishedAt && (
                <span style={{ marginLeft: 8 }}>
                  (publicado em{' '}
                  {new Date(publishedAt).toLocaleString('pt-BR')})
                </span>
              )}
            </div>
            <small>
              Para publicar ou tirar do ar, use as ações &quot;Publicar&quot; /
              &quot;Despublicar&quot; na lista de posts.
            </small>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="summary">Resumo</label>
          <textarea
            id="summary"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={3}
            placeholder="Resumo curto para cards e listagens..."
          />
        </div>

        <div className="form-group">
          <label htmlFor="content">Conteúdo (HTML)</label>
          <div className="rich-editor-wrapper">
            <ReactQuill
              id="content"
              theme="snow"
              value={content}
              onChange={setContent}
              modules={quillModules}
              formats={quillFormats}
            />
          </div>
          <small>
            Este conteúdo será exibido na área pública do site (Blog / Páginas).
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="coverImageUrl">Imagem de capa (URL)</label>
          <input
            id="coverImageUrl"
            type="text"
            value={coverImageUrl}
            onChange={(e) => setCoverImageUrl(e.target.value)}
            placeholder="https://meu-site.com/imagens/capa.jpg"
          />
        </div>

        <div className="form-group">
          <label htmlFor="metaTitle">Meta Title (SEO)</label>
          <input
            id="metaTitle"
            type="text"
            value={metaTitle}
            onChange={(e) => setMetaTitle(e.target.value)}
            placeholder="Título para SEO (opcional)"
          />
        </div>

        <div className="form-group">
          <label htmlFor="metaDescription">Meta Description (SEO)</label>
          <textarea
            id="metaDescription"
            value={metaDescription}
            onChange={(e) => setMetaDescription(e.target.value)}
            rows={2}
            placeholder="Descrição usada pelos buscadores (opcional)"
          />
        </div>

        <div className="form-group form-group-inline">
          <label>
            <input
              type="checkbox"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
            />{' '}
            Destacar na listagem
          </label>
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleCancel}
            disabled={saving}
          >
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BlogForm;
