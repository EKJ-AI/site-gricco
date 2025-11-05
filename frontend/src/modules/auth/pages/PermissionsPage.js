import React, { useEffect, useState } from 'react';
import '../../../shared/styles/Table.css';
import api from '../../../api/axios';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../../../shared/components/NavbarOLD';

export default function PermissionsPage() {
  const { accessToken } = useAuth();
  const [permissions, setPermissions] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

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
    fetchPermissions();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/api/permissions', {
        name,
        description
      }, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      setName('');
      setDescription('');
      fetchPermissions();
    } catch {
      setError('Erro ao criar permissão.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Confirmar exclusão?')) return;
    try {
      await api.delete(`/api/permissions/${id}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      fetchPermissions();
    } catch {
      setError('Erro ao excluir permissão.');
    }
  };

  return (
    <div>
      <Navbar />
      <h2>Permissões</h2>
      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleCreate} className="form">
        <h3>Criar nova permissão</h3>
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
        <button type="submit">Criar</button>
      </form>

      <h3>Lista de Permissões</h3>
      <table className="data-table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Descrição</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {(permissions || []).map(p => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>{p.description}</td>
              <td>
                <button onClick={() => handleDelete(p.id)}>Excluir</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
