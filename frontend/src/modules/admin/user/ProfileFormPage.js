// src/modules/admin/user/ProfileFormPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import api from '../../../api/axios';
import { useAuth } from '../../auth/contexts/AuthContext';

import '../../../shared/styles/padrao.css';
import { useToast, extractErrorMessage } from '../../../shared/components/toast/ToastProvider';

function validateProfile(form) {
  const missing = [];
  if (!String(form.name || '').trim()) missing.push('Nome');
  return { ok: missing.length === 0, missing };
}

function normalizeProfileFromApi(resData) {
  return (
    resData?.data?.item ||
    resData?.data?.profile ||
    resData?.data?.data ||
    resData?.data ||
    resData?.item ||
    resData?.profile ||
    resData
  );
}

export default function ProfileFormPage() {
  const params = useParams();
  const location = useLocation();
  const id = params.id || null;
  const mode = id ? 'edit' : 'create';

  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const authHeader = { headers: { Authorization: `Bearer ${accessToken}` } };

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [permissions, setPermissions] = useState([]);
  const [q, setQ] = useState('');

  const [form, setForm] = useState({
    name: '',
    description: '',
    selectedPermissions: [], // array de string ids
  });

  const setVal = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const validation = useMemo(() => validateProfile(form), [form]);
  const canSubmit = validation.ok && !saving;

  const filteredPermissions = useMemo(() => {
    const term = String(q || '').trim().toLowerCase();
    if (!term) return permissions;
    return (permissions || []).filter((p) =>
      String(p.name || '').toLowerCase().includes(term),
    );
  }, [permissions, q]);

  const selectedSet = useMemo(
    () => new Set((form.selectedPermissions || []).map(String)),
    [form.selectedPermissions],
  );

  const filteredIds = useMemo(
    () => (filteredPermissions || []).map((p) => String(p.id)),
    [filteredPermissions],
  );

  const allIds = useMemo(
    () => (permissions || []).map((p) => String(p.id)),
    [permissions],
  );

  const allFilteredSelected = useMemo(() => {
    if (!filteredIds.length) return false;
    return filteredIds.every((id2) => selectedSet.has(id2));
  }, [filteredIds, selectedSet]);

  const allSelected = useMemo(() => {
    if (!allIds.length) return false;
    return allIds.every((id2) => selectedSet.has(id2));
  }, [allIds, selectedSet]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);

      try {
        // permissões
        const permRes = await api.get('/api/permissions', {
          ...authHeader,
          params: { all: 1 },
        });
        const perms = permRes.data?.data?.items || [];
        if (!mounted) return;
        setPermissions(perms);

        // create
        if (mode !== 'edit') return;

        // tenta state
        const fromState = location?.state?.profile;
        if (fromState && String(fromState.id) === String(id)) {
          const ids = (fromState.permissions || [])
            .map((pp) => (typeof pp === 'object' && pp?.id ? pp.id : pp))
            .filter(Boolean)
            .map(String);

          setForm({
            name: fromState.name || '',
            description: fromState.description || '',
            selectedPermissions: ids,
          });
          return;
        }

        // fallback: tenta /profiles/:id (se existir)
        let prof = null;
        try {
          const profileRes = await api.get(`/api/profiles/${id}`, authHeader);
          prof = normalizeProfileFromApi(profileRes?.data);
        } catch {
          prof = null;
        }

        // fallback 2: lista e acha
        if (!prof) {
          const listRes = await api.get('/api/profiles', authHeader);
          const items = listRes.data?.data?.items || [];
          prof = items.find((p) => String(p.id) === String(id)) || null;
        }

        if (!mounted) return;

        if (!prof) {
          toast.error('Perfil não encontrado.', { title: 'Falha ao carregar' });
          navigate('/profiles');
          return;
        }

        const ids = (prof.permissions || [])
          .map((pp) => (typeof pp === 'object' && pp?.id ? pp.id : pp))
          .filter(Boolean)
          .map(String);

        setForm({
          name: prof.name || '',
          description: prof.description || '',
          selectedPermissions: ids,
        });
      } catch (err) {
        if (!mounted) return;
        toast.error(extractErrorMessage(err, 'Erro ao carregar dados.'), {
          title: 'Falha ao carregar',
        });
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
  }, [id, mode, accessToken]);

  useEffect(() => {
    if (mode !== 'edit') setLoading(false);
  }, [mode]);

  const togglePermission = (permId) => {
    const pid = String(permId);
    setForm((prev) => {
      const exists = prev.selectedPermissions.includes(pid);
      return {
        ...prev,
        selectedPermissions: exists
          ? prev.selectedPermissions.filter((x) => x !== pid)
          : [...prev.selectedPermissions, pid],
      };
    });
  };

  // ✅ Selecionar todas (apenas as filtradas)
  const toggleSelectAllFiltered = () => {
    setForm((prev) => {
      const prevSet = new Set(prev.selectedPermissions.map(String));
      const shouldSelect = !filteredIds.every((x) => prevSet.has(x));

      if (shouldSelect) {
        filteredIds.forEach((x) => prevSet.add(x));
      } else {
        filteredIds.forEach((x) => prevSet.delete(x));
      }

      return { ...prev, selectedPermissions: Array.from(prevSet) };
    });
  };

  // ✅ Selecionar todas (todas as permissões, independentemente do filtro)
  const toggleSelectAll = () => {
    setForm((prev) => {
      const prevSet = new Set(prev.selectedPermissions.map(String));
      const shouldSelect = !allIds.every((x) => prevSet.has(x));

      if (shouldSelect) {
        allIds.forEach((x) => prevSet.add(x));
      } else {
        allIds.forEach((x) => prevSet.delete(x));
      }

      return { ...prev, selectedPermissions: Array.from(prevSet) };
    });
  };

  const clearSelection = () => {
    setVal('selectedPermissions', []);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const v = validateProfile(form);
    if (!v.ok) {
      toast.warning(`Preencha os campos obrigatórios: ${v.missing.join(', ')}`, {
        title: 'Campos obrigatórios',
      });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        permissions: (form.selectedPermissions || []).map(String),
      };

      if (mode === 'edit') await api.put(`/api/profiles/${id}`, payload, authHeader);
      else await api.post('/api/profiles', payload, authHeader);

      toast.success('Perfil salvo com sucesso.', { title: 'Salvo' });
      navigate('/profiles');
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Erro ao salvar perfil.'), {
        title: 'Não foi possível salvar',
      });
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
              <div className="pf-header-icon">🛡️</div>
              <div>
                <h1 className="pf-title">{mode === 'edit' ? 'Editar Perfil' : 'Novo Perfil'}</h1>
                <p className="pf-subtitle">Cadastro e edição de perfis</p>
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
            <div className="pf-header-icon">🛡️</div>
            <div>
              <h1 className="pf-title">{mode === 'edit' ? 'Editar Perfil' : 'Novo Perfil'}</h1>
              <p className="pf-subtitle">Cadastro e edição de perfis</p>
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
                <input value={form.name} onChange={(e) => setVal('name', e.target.value)} placeholder="Ex.: ADMIN" />
              </label>

              <label>
                Descrição
                <input value={form.description} onChange={(e) => setVal('description', e.target.value)} placeholder="Opcional" />
              </label>
            </div>
          </section>

          <section className="pf-section">
            <div className="grid-2">
              <label>
                Buscar permissão
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ex.: user., company., document." />
              </label>

              <label>
                Seleção
                <div className="pf-input-group">
                  <button
                    type="button"
                    className="pf-btn pf-btn-secondary"
                    onClick={toggleSelectAllFiltered}
                    disabled={!filteredIds.length}
                    title="Marca/desmarca as permissões atualmente filtradas"
                  >
                    {allFilteredSelected ? 'Desmarcar filtradas' : 'Selecionar filtradas'}
                  </button>

                  <button
                    type="button"
                    className="pf-btn pf-btn-secondary"
                    onClick={toggleSelectAll}
                    disabled={!allIds.length}
                    title="Marca/desmarca TODAS as permissões"
                  >
                    {allSelected ? 'Desmarcar todas' : 'Selecionar todas'}
                  </button>

                  <button
                    type="button"
                    className="pf-btn pf-btn-secondary"
                    onClick={clearSelection}
                    disabled={!form.selectedPermissions.length}
                    title="Remove todas as seleções"
                  >
                    Limpar
                  </button>
                </div>
              </label>
            </div>

            <div
              style={{
                marginTop: 10,
                maxHeight: 320,
                overflow: 'auto',
                border: '1px solid #efefef',
                borderRadius: 10,
                padding: 10,
              }}
            >
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 10 }}>
                Selecionadas: <strong>{form.selectedPermissions.length}</strong> / {permissions.length}
                {q ? (
                  <>
                    {' '}
                    • Filtradas: <strong>{filteredPermissions.length}</strong>
                  </>
                ) : null}
              </div>

              {filteredPermissions.length ? (
                <div className="pf-grid-2">
                  {filteredPermissions.map((p) => {
                    const pid = String(p.id);
                    const checked = selectedSet.has(pid);

                    return (
                      <div
                        key={pid}
                        style={{
                          display: 'flex',
                          gap: 10,
                          alignItems: 'center',
                          padding: '8px 10px',
                          border: '1px solid #f0f0f0',
                          borderRadius: 10,
                          background: '#fff',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => togglePermission(pid)}
                          aria-label={p.name}
                        />
                        <span style={{ fontSize: 13, color: '#141B4D' }}>{p.name}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: '#6b7280' }}>Nenhuma permissão encontrada.</div>
              )}
            </div>
          </section>

          <div className="pf-actions">
            <button type="button" className="pf-btn pf-btn-secondary" onClick={() => navigate(-1)} disabled={saving}>
              Cancelar
            </button>

            <button type="submit" className="pf-btn pf-btn-primary" disabled={!canSubmit}>
              {saving ? 'Salvando…' : 'Salvar cadastro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
