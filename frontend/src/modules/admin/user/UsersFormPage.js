// src/modules/admin/user/UsersFormPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../../api/axios';
import { useAuth } from '../../auth/contexts/AuthContext';

import '../../../shared/styles/padrao.css';
import { useToast, extractErrorMessage } from '../../../shared/components/toast/ToastProvider';

function validateUser(form, mode) {
  const missing = [];
  if (!String(form.name || '').trim()) missing.push('Nome');
  if (!String(form.email || '').trim()) missing.push('Email');
  if (!String(form.profileId || '').trim()) missing.push('Perfil');
  if (mode === 'create') {
    const pwd = String(form.password || '');
    if (!pwd || pwd.length < 8) missing.push('Senha (mín. 8 caracteres)');
  }
  return { ok: missing.length === 0, missing };
}

export default function UsersFormPage() {
  const params = useParams();
  const id = params.id || params.userId || null;
  const mode = id ? 'edit' : 'create';

  const { accessToken } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [profiles, setProfiles] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    profileId: '',
    isActive: true,
  });

  const setVal = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const validation = useMemo(() => validateUser(form, mode), [form, mode]);
  const canSubmit = validation.ok && !saving;

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      try {
        const [profilesRes, userRes] = await Promise.all([
          api.get('/api/profiles', { headers: { Authorization: `Bearer ${accessToken}` } }),
          mode === 'edit'
            ? api.get(`/api/users/${id}`, { headers: { Authorization: `Bearer ${accessToken}` } })
            : Promise.resolve(null),
        ]);

        const pf = profilesRes.data?.data?.items || [];
        const u = userRes?.data?.data || null;

        if (!mounted) return;

        setProfiles(pf);

        if (mode === 'edit' && u) {
          setForm({
            name: u.name || '',
            email: u.email || '',
            password: '',
            profileId: String(u.profileId || u.profile?.id || ''),
            isActive: u.isActive !== false,
          });
        } else {
          setForm((prev) => ({ ...prev, isActive: true }));
        }
      } catch (err) {
        if (!mounted) return;
        toast.error(extractErrorMessage(err, 'Erro ao carregar dados.'), { title: 'Falha ao carregar' });
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [accessToken, id, mode, toast]);

  useEffect(() => {
    if (!profiles.length) {
      setSelectedProfile(null);
      return;
    }
    const prof = profiles.find((p) => String(p.id) === String(form.profileId));
    setSelectedProfile(prof || null);
  }, [profiles, form.profileId]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const v = validateUser(form, mode);
    if (!v.ok) {
      const preview = v.missing.slice(0, 4).join(', ');
      const tail = v.missing.length > 4 ? `… (+${v.missing.length - 4})` : '';
      toast.warning(`Preencha os campos obrigatórios: ${preview}${tail}`, { title: 'Campos obrigatórios' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name,
        email: form.email,
        profileId: form.profileId,
        isActive: !!form.isActive,
      };

      if (mode === 'create') payload.password = form.password;
      if (mode === 'edit' && String(form.password || '').trim()) payload.password = form.password;

      if (mode === 'edit') {
        await api.put(`/api/users/${id}`, payload, { headers: { Authorization: `Bearer ${accessToken}` } });
      } else {
        await api.post('/api/users', payload, { headers: { Authorization: `Bearer ${accessToken}` } });
      }

      toast.success('Usuário salvo com sucesso.', { title: 'Salvo' });
      navigate('/users');
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Erro ao salvar usuário.'), { title: 'Não foi possível salvar' });
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
              <div className="pf-header-icon">👤</div>
              <div>
                <h1 className="pf-title">{mode === 'edit' ? 'Editar Usuário' : 'Novo Usuário'}</h1>
                <p className="pf-subtitle">Cadastro e edição de usuários</p>
              </div>
            </div>
            <button type="button" className="pf-close" onClick={() => navigate(-1)} aria-label="Close">
              ×
            </button>
          </header>

          <section className="pf-section">
            <div>Carregando…</div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="pf-page">
      <div className="pf-shell">
        <header className="pf-header">
          <div className="pf-header-left">
            <div className="pf-header-icon">👤</div>
            <div>
              <h1 className="pf-title">{mode === 'edit' ? 'Editar Usuário' : 'Novo Usuário'}</h1>
              <p className="pf-subtitle">Cadastro e edição de usuários</p>
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
                <input value={form.name} onChange={(e) => setVal('name', e.target.value)} placeholder="Nome completo" />
              </label>

              <label>
                Email *
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setVal('email', e.target.value)}
                  placeholder="email@dominio.com"
                />
              </label>
            </div>

            <div className="grid-2" style={{ marginTop: 10 }}>
              <label>
                {mode === 'edit' ? 'Nova senha (opcional)' : 'Senha * (mín. 8 caracteres)'}
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setVal('password', e.target.value)}
                  placeholder={mode === 'edit' ? 'Deixe em branco para não alterar' : 'Digite uma senha segura'}
                />
              </label>

              <label>
                Perfil *
                <select value={String(form.profileId || '')} onChange={(e) => setVal('profileId', e.target.value)}>
                  <option value="">Selecione o perfil</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="pf-switch-row" style={{ marginTop: 10 }}>
              <p className="pf-switch-label">Usuário ativo</p>
              <input
                type="checkbox"
                className="pf-switch"
                checked={!!form.isActive}
                onChange={(e) => setVal('isActive', e.target.checked)}
                aria-label="Usuário ativo"
              />
            </div>
          </section>

          {selectedProfile ? (
            <section className="pf-section">
              <h3 style={{ margin: 0, fontSize: 13, color: '#0e1b4d' }}>
                Permissões do Perfil: {selectedProfile.name}
              </h3>

              <div style={{ marginTop: 10 }}>
                {Array.isArray(selectedProfile.permissions) && selectedProfile.permissions.length ? (
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                    {selectedProfile.permissions.map((perm) => (
                      <li key={perm.id || perm.name}>{perm.name || String(perm)}</li>
                    ))}
                  </ul>
                ) : (
                  <div style={{ fontSize: 13, color: '#6b7280' }}>Sem permissões definidas para este perfil.</div>
                )}
              </div>
            </section>
          ) : null}

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
