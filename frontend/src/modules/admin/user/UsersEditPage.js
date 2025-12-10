// src/modules/user/pages/UsersEditPage.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../../api/axios';
import { useAuth } from '../../auth/contexts/AuthContext';

export default function UsersEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { accessToken } = useAuth();

  const [user, setUser] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [selectedProfile, setSelectedProfile] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [userRes, profilesRes] = await Promise.all([
          api.get(`/api/users/${id}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          }),
          api.get('/api/profiles', {
            headers: { Authorization: `Bearer ${accessToken}` },
          }),
        ]);

        const u = userRes.data?.data;
        const pf = profilesRes.data?.data?.items || [];

        setUser(u);
        setProfiles(pf);

        if (u?.profileId) {
          const prof = pf.find(
            (p) => String(p.id) === String(u.profileId),
          );
          setSelectedProfile(prof || null);
        } else if (u?.profile) {
          const prof = pf.find(
            (p) => String(p.id) === String(u.profile?.id),
          );
          setSelectedProfile(prof || u.profile || null);
        }
      } catch {
        setError('Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id, accessToken]);

  useEffect(() => {
    if (user?.profileId && profiles.length) {
      const prof = profiles.find(
        (p) => String(p.id) === String(user.profileId),
      );
      setSelectedProfile(prof || null);
    }
  }, [user?.profileId, profiles]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: user.name,
        email: user.email,
        profileId: user.profileId,
        isActive: user.isActive, // 👈 envia status
      };
      if (password) payload.password = password;

      await api.put(`/api/users/${id}`, payload, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      navigate('/users');
    } catch {
      setError('Erro ao salvar alterações');
    }
  };

  if (loading) return <p>Carregando...</p>;
  if (!user) return <p>Nenhum dado encontrado</p>;

  return (
    <div>
      <h2>Editar Usuário</h2>
      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSave} className="form">
        <input
          type="text"
          placeholder="Nome"
          value={user.name || ''}
          onChange={(e) => setUser({ ...user, name: e.target.value })}
          required
        />

        <input
          type="email"
          placeholder="Email"
          value={user.email || ''}
          onChange={(e) => setUser({ ...user, email: e.target.value })}
          required
        />

        <input
          type="password"
          placeholder="Nova Senha (opcional)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <select
          value={user?.profileId ? String(user.profileId) : ''}
          onChange={(e) =>
            setUser({
              ...user,
              profileId: e.target.value,
            })
          }
          required
        >
          <option value="">Selecione o perfil</option>
          {profiles.map((p) => (
            <option key={p.id} value={String(p.id)}>
              {p.name}
            </option>
          ))}
        </select>

        <label style={{ marginTop: 8 }}>
          <input
            type="checkbox"
            checked={!!user.isActive}
            onChange={(e) =>
              setUser({ ...user, isActive: e.target.checked })
            }
          />{' '}
          Usuário ativo
        </label>

        <button type="submit">Salvar</button>
      </form>

      {selectedProfile && (
        <div className="permissions-box" style={{ marginTop: 16 }}>
          <h4>Permissões do Perfil: {selectedProfile.name}</h4>
          {Array.isArray(selectedProfile.permissions) &&
          selectedProfile.permissions.length ? (
            <ul>
              {selectedProfile.permissions.map((perm) => (
                <li key={perm.id}>{perm.name}</li>
              ))}
            </ul>
          ) : (
            <p>Sem permissões definidas para este perfil.</p>
          )}
        </div>
      )}
    </div>
  );
}
