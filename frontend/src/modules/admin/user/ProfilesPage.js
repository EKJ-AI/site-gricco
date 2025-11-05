import React, { useEffect, useState } from 'react';
import '../../../shared/styles/Form.css';
import '../../../shared/styles/Table.css';
import { useAuth } from '../../auth/contexts/AuthContext';
import Navbar from '../../../shared/components/NavbarOLD';
import api from '../../../api/axios';

export default function ProfilesPage() {
  const { accessToken } = useAuth();

  const [profiles, setProfiles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const authHeader = { headers: { Authorization: `Bearer ${accessToken}` } };

  const fetchProfiles = async () => {
    try {
      const res = await api.get('/api/profiles', authHeader);
      // Espera-se que venha: data.data.items -> [{ id, name, description, permissions: [{id, name}] }]
      setProfiles(res.data?.data?.items || []);
    } catch {
      setError('Erro ao carregar perfis.');
    }
  };

  const fetchPermissions = async () => {
    try {
      const res = await api.get('/api/permissions', authHeader);
      // Espera-se que venha: data.data.items -> [{ id, name }]
      setPermissions(res.data?.data?.items || []);
    } catch {
      setError('Erro ao carregar permissões.');
    }
  };

  useEffect(() => {
    fetchProfiles();
    fetchPermissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePermissionToggle = (id) => {
    setSelectedPermissions((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setSelectedPermissions([]);
    setIsEditing(false);
    setEditingId(null);
    setError('');
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post(
        '/api/profiles',
        { name, description, permissions: selectedPermissions },
        authHeader
      );
      resetForm();
      fetchProfiles();
    } catch {
      setError('Erro ao criar perfil.');
    }
  };

  const handleEditClick = async (profile) => {
    // Garante que o catálogo de permissões está carregado
    if (!permissions || permissions.length === 0) {
      try {
        await fetchPermissions();
      } catch {
        setError('Erro ao carregar permissões para edição.');
        return;
      }
    }

    setIsEditing(true);
    setEditingId(profile.id);
    setName(profile.name || '');
    setDescription(profile.description || '');

    // Agora a API devolve permissions como objetos { id, name }
    const ids = (profile.permissions || [])
      .map((pp) => (typeof pp === 'object' && pp?.id ? pp.id : null))
      .filter(Boolean);

    setSelectedPermissions(ids);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingId) return;
    setError('');
    try {
      await api.put(
        `/api/profiles/${editingId}`,
        { name, description, permissions: selectedPermissions },
        authHeader
      );
      resetForm();
      fetchProfiles();
    } catch {
      setError('Erro ao atualizar perfil.');
    }
  };

  const handleCancelEdit = () => {
    resetForm();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Confirmar exclusão?')) return;
    try {
      await api.delete(`/api/profiles/${id}`, authHeader);
      fetchProfiles();
    } catch {
      setError('Erro ao excluir perfil.');
    }
  };

  return (
    <div>
      <Navbar />
      <h2>Perfis</h2>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={isEditing ? handleUpdate : handleCreate} className="form">
        <h3>{isEditing ? 'Editar perfil' : 'Criar novo perfil'}</h3>

        <input
          type="text"
          placeholder="Nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <input
          type="text"
          placeholder="Descrição"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {(!permissions || permissions.length === 0) ? (
          <div>Carregando permissões...</div>
        ) : (
          <div className="permissions-list">
            <label>Permissões:</label>
            {permissions.map((p) => (
              <div key={p.id}>
                <input
                  type="checkbox"
                  checked={selectedPermissions.includes(p.id)}
                  onChange={() => handlePermissionToggle(p.id)}
                />
                {p.name}
              </div>
            ))}
          </div>
        )}

        {isEditing ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit">Salvar alterações</button>
            <button type="button" className="secondary" onClick={handleCancelEdit}>
              Cancelar
            </button>
          </div>
        ) : (
          <button type="submit">Criar</button>
        )}
      </form>

      <h3>Lista de Perfis</h3>

      <table className="data-table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Descrição</th>
            <th>Permissões</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {(profiles || []).map((p) => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>{p.description}</td>
              <td>
                <ul>
                  {(p.permissions || []).map((pp) => (
                    <li key={typeof pp === 'object' && pp?.id ? pp.id : String(pp)}>
                      {typeof pp === 'object' && pp?.name ? pp.name : String(pp)}
                    </li>
                  ))}
                </ul>
              </td>
              <td>
                <button
                  onClick={() => handleEditClick(p)}
                  disabled={!permissions || permissions.length === 0}
                  style={{ marginRight: 8 }}
                >
                  Editar
                </button>
                <button onClick={() => handleDelete(p.id)}>Excluir</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
