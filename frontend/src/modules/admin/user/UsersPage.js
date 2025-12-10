import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../../../shared/styles/Table.css';
import '../../../shared/styles/Form.css';
import api from '../../../api/axios';
import { useAuth } from '../../auth/contexts/AuthContext';
import ActionButtons from '../../../shared/components/ActionButtons';

export default function UsersPage() {
  const { accessToken } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [profileId, setProfileId] = useState('');
  const [profiles, setProfiles] = useState([]);
  const [isActive, setIsActive] = useState(true);

  // all | active | inactive
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/users', {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: {
          status: statusFilter, // all | active | inactive
        },
      });
      setUsers(res.data.data.items);
    } catch (err) {
      setError('Falha ao carregar usuários.');
    }
    setLoading(false);
  };

  const fetchProfiles = async () => {
    try {
      const res = await api.get('/api/profiles', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setProfiles(res.data.data.items);
    } catch {
      setError('Falha ao carregar perfis.');
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [statusFilter]); // refaz quando mudar o filtro

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post(
        '/api/users',
        {
          name,
          email,
          password,
          profileId,
          isActive,
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      setName('');
      setEmail('');
      setPassword('');
      setProfileId('');
      setIsActive(true);
      fetchUsers();
    } catch {
      setError('Erro ao criar usuário.');
    }
  };

  const handleEdit = (user) => {
    navigate(`/users/edit/${user.id}`);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Confirmar exclusão?')) return;
    try {
      await api.delete(`/api/users/${id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      fetchUsers();
    } catch {
      setError('Erro ao excluir usuário.');
    }
  };

  return (
    <div>
      <h2>Usuários</h2>
      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleCreate} className="form">
        <h3>Criar novo usuário</h3>
        <input
          type="text"
          placeholder="Nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <select
          value={profileId}
          onChange={(e) => setProfileId(e.target.value)}
          required
        >
          <option value="">Selecione o perfil</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <label style={{ marginTop: 8 }}>
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />{' '}
          Usuário ativo
        </label>

        <button type="submit">Criar</button>
      </form>

      <h3>Lista de Usuários</h3>

      {/* Filtro de status */}
      <div style={{ marginBottom: 8 }}>
        <label style={{ marginRight: 8 }}>Status:</label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All (active + inactive)</option>
          <option value="active">Only active</option>
          <option value="inactive">Only inactive</option>
        </select>
      </div>

      {loading ? (
        <p>Carregando...</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Email</th>
              <th>Perfil</th>
              <th>Empresa</th>
              <th>Estabelecimento</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isInactive = u.isActive === false;
              const companyLabel = u.companyName || '—';
              const est = u.establishment;

              return (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.profile?.name}</td>
                  <td>{companyLabel}</td>
                  <td>
                    {est && est.id && est.companyId ? (
                      <Link
                        to={`/companies/${est.companyId}/establishments/${est.id}/employees`}
                      >
                        {est.nickname || 'Ver estabelecimento'}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    {isInactive ? (
                      <span style={{ color: '#b00', fontWeight: 500 }}>
                        Inativo
                      </span>
                    ) : (
                      <span style={{ color: '#0a6', fontWeight: 500 }}>
                        Ativo
                      </span>
                    )}
                  </td>
                  <td>
                    <ActionButtons
                      onEdit={() => handleEdit(u)}
                      onDelete={() => handleDelete(u.id)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
