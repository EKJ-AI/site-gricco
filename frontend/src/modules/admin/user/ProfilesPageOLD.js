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

  const fetchProfiles = async () => {
    try {
      const res = await api.get('/api/profiles', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      setProfiles(res.data.data.items);
    } catch {
      setError('Erro ao carregar perfis.');
    }
  };

  const fetchPermissions = async () => {
    try {
      const res = await api.get('/api/permissions', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      setPermissions(res.data.data.items);
    } catch {
      setError('Erro ao carregar permissões.');
    }
  };

  useEffect(() => {
    fetchProfiles();
    fetchPermissions();
  }, []);

  const handlePermissionToggle = (id) => {
    setSelectedPermissions(prev =>
      prev.includes(id)
        ? prev.filter(p => p !== id)
        : [...prev, id]
    );
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/api/profiles', {
        name,
        description,
        permissions: selectedPermissions
      }, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      setName('');
      setDescription('');
      setSelectedPermissions([]);
      fetchProfiles();
    } catch {
      setError('Erro ao criar perfil.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Confirmar exclusão?')) return;
    try {
      await api.delete(`/api/profiles/${id}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
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

      <form onSubmit={handleCreate} className="form">
        <h3>Criar novo perfil</h3>
        <input
          type="text"
          placeholder="Nome"
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Descrição"
          value={description}
          onChange={e => setDescription(e.target.value)}
        />
        <div className="permissions-list">
          <label>Permissões:</label>
          {(permissions || []).map(p => (
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
        <button type="submit">Criar</button>
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
          {profiles.map(p => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>{p.description}</td>
              <td>
                <ul>
                  {p.permissions.map(pp => (
                    <li key={pp}>{pp}</li>
                  ))}
                </ul>
              </td>
              <td>
                <button onClick={() => handleEditClick(p)} style={{ marginRight: 8 }}>
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
