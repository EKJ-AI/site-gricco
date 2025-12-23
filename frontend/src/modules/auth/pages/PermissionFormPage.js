// src/modules/auth/pages/PermissionFormPage.jsx
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import api from '../../../api/axios';
import { useAuth } from '../contexts/AuthContext';

import '../../../shared/styles/padrao.css';
import { useToast, extractErrorMessage } from '../../../shared/components/toast/ToastProvider';

function validatePermission(form) {
  const missing = [];
  if (!String(form.name || '').trim()) missing.push('Nome');
  return { ok: missing.length === 0, missing };
}

export default function PermissionFormPage() {
  const { accessToken } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const mode = id ? 'edit' : 'create';
  const authHeader = { headers: { Authorization: `Bearer ${accessToken}` } };

  const [loading, setLoading] = useState(mode === 'edit');
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    description: '',
  });

  const setVal = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (mode !== 'edit') {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        // 1) state
        const fromState = location?.state?.permission;
        if (fromState && String(fromState.id) === String(id)) {
          if (!mounted) return;
          setForm({
            name: fromState.name || '',
            description: fromState.description || '',
          });
          return;
        }

        // 2) GET /permissions/:id
        const res = await api.get(`/api/permissions/${id}`, authHeader);
        const perm = res.data?.data || res.data?.permission || res.data;

        if (!mounted) return;

        if (!perm?.id) {
          toast.error('Permissão não encontrada.', { title: 'Falha ao carregar' });
          navigate('/permissions');
          return;
        }

        setForm({
          name: perm.name || '',
          description: perm.description || '',
        });
      } catch (err) {
        if (!mounted) return;
        toast.error(extractErrorMessage(err, 'Erro ao carregar permissão.'), { title: 'Falha ao carregar' });
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const v = validatePermission(form);
    if (!v.ok) {
      toast.warning(`Preencha os campos obrigatórios: ${v.missing.join(', ')}`, { title: 'Campos obrigatórios' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: String(form.name || '').trim(),
        description: String(form.description || '').trim() || null,
      };

      if (mode === 'edit') {
        await api.put(`/api/permissions/${id}`, payload, authHeader);
      } else {
        await api.post('/api/permissions', payload, authHeader);
      }

      toast.success('Permissão salva com sucesso.', { title: 'Salvo' });
      navigate('/permissions');
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Erro ao salvar permissão.'), { title: 'Não foi possível salvar' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="pf-page">
        <div className="pf-shell">
          <header className="pf-header">
            <div className="pf-header-left">
              <div className="pf-header-icon">🔑</div>
              <div>
                <h1 className="pf-title">{mode === 'edit' ? 'Editar Permissão' : 'Nova Permissão'}</h1>
                <p className="pf-subtitle">Cadastro e edição de permissões</p>
              </div>
            </div>
            <button type="button" className="pf-close" onClick={() => navigate(-1)} aria-label="Close">
              ×
            </button>
          </header>
          <section className="pf-section">Carregando…</section>
        </div>
      </div>
    );
  }

  return (
    <div className="pf-page">
      <div className="pf-shell">
        <header className="pf-header">
          <div className="pf-header-left">
            <div className="pf-header-icon">🔑</div>
            <div>
              <h1 className="pf-title">{mode === 'edit' ? 'Editar Permissão' : 'Nova Permissão'}</h1>
              <p className="pf-subtitle">Cadastro e edição de permissões</p>
            </div>
          </div>
          <button type="button" className="pf-close" onClick={() => navigate(-1)} aria-label="Close">
            ×
          </button>
        </header>

        <form className="pf-form" onSubmit={handleSubmit}>
          <section className="pf-section">
            <div className="grid-2">
              <label>
                Nome *
                <input
                  value={form.name}
                  onChange={(e) => setVal('name', e.target.value)}
                  placeholder="Ex.: user.create"
                  disabled={saving}
                />
              </label>

              <label>
                Descrição
                <input
                  value={form.description}
                  onChange={(e) => setVal('description', e.target.value)}
                  placeholder="Opcional"
                  disabled={saving}
                />
              </label>
            </div>
          </section>

          <div className="pf-actions">
            <button type="button" className="pf-btn pf-btn-secondary" onClick={() => navigate(-1)} disabled={saving}>
              Cancelar
            </button>

            <button type="submit" className="pf-btn pf-btn-primary" disabled={saving || !validatePermission(form).ok}>
              {saving ? 'Salvando…' : 'Salvar cadastro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
