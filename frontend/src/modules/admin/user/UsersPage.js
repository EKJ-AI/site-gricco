// src/modules/admin/user/UsersPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../api/axios';
import { useAuth } from '../../auth/contexts/AuthContext';

import '../../../shared/styles/Table.css';
import '../../../shared/styles/padrao.css';

import ActionButtons from '../../../shared/components/ActionButtons';
import { useToast, extractErrorMessage } from '../../../shared/components/toast/ToastProvider';

const COLS = {
  NAME: 'name',
  EMAIL: 'email',
  PROFILE: 'profile',
  STATUS: 'status',
};

export default function UsersPage() {
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  // ----- filtros por coluna -----
  const [nameFilter, setNameFilter] = useState('');
  const [emailFilter, setEmailFilter] = useState('');
  const [profileFilter, setProfileFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // '', 'ACTIVE', 'INACTIVE'

  // ----- controle de UI dos filtros -----
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [openFilterCols, setOpenFilterCols] = useState(() => ({
    [COLS.NAME]: false,
    [COLS.EMAIL]: false,
    [COLS.PROFILE]: false,
    [COLS.STATUS]: false,
  }));

  const authHeader = { headers: { Authorization: `Bearer ${accessToken}` } };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // ✅ Busca “tudo” e filtra no front (padrão do seu modelo)
      const res = await api.get('/api/users', {
        ...authHeader,
        params: { status: 'all' },
      });
      setUsers(res.data?.data?.items || []);
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Falha ao carregar usuários.'), {
        title: 'Erro',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleColFilter = (colKey) => {
    setFiltersVisible(true);
    setOpenFilterCols((prev) => ({ ...prev, [colKey]: !prev[colKey] }));
  };

  const showAllFilters = () => {
    setFiltersVisible(true);
    setOpenFilterCols({
      [COLS.NAME]: true,
      [COLS.EMAIL]: true,
      [COLS.PROFILE]: true,
      [COLS.STATUS]: true,
    });
  };

  const hideAllFilters = () => {
    setFiltersVisible(false);
    setOpenFilterCols({
      [COLS.NAME]: false,
      [COLS.EMAIL]: false,
      [COLS.PROFILE]: false,
      [COLS.STATUS]: false,
    });
  };

  const clearAllFilters = () => {
    setNameFilter('');
    setEmailFilter('');
    setProfileFilter('');
    setStatusFilter('');
  };

  const hasAnyFilter =
    !!nameFilter || !!emailFilter || !!profileFilter || !!statusFilter;

  const filteredRows = useMemo(() => {
    const norm = (v) => String(v || '').toLowerCase();

    return (users || []).filter((u) => {
      const name = norm(u.name);
      const email = norm(u.email);
      const profileName = norm(u.profile?.name);
      const isInactive = u.isActive === false;
      const statusValue = isInactive ? 'INACTIVE' : 'ACTIVE';

      if (nameFilter && !name.includes(norm(nameFilter))) return false;
      if (emailFilter && !email.includes(norm(emailFilter))) return false;
      if (profileFilter && !profileName.includes(norm(profileFilter)))
        return false;
      if (statusFilter && statusValue !== statusFilter) return false;

      return true;
    });
  }, [users, nameFilter, emailFilter, profileFilter, statusFilter]);

  const handleEdit = (user) => navigate(`/users/edit/${user.id}`);

  const handleDelete = async (id) => {
    if (!window.confirm('Confirmar exclusão?')) return;
    try {
      await api.delete(`/api/users/${id}`, authHeader);
      toast.success('Usuário excluído.', { title: 'OK' });
      fetchUsers();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Erro ao excluir usuário.'), {
        title: 'Erro',
      });
    }
  };

  const HeaderCell = ({ colKey, label, mobile = false }) => {
    const active = !!openFilterCols[colKey];
    return (
      <th
        className={mobile ? 'mostrar-mobile' : undefined}
        style={{ cursor: 'pointer', userSelect: 'none' }}
        title="Clique para abrir/fechar o filtro desta coluna"
        onClick={() => toggleColFilter(colKey)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>{label}</span>
          <span style={{ fontSize: 12, opacity: 0.7 }}>
            {active ? '▾' : '▸'}
          </span>
        </div>
      </th>
    );
  };

  return (
    <div className="pf-page">
      <div className="pf-shell">
        <header className="pf-header">
          <div className="pf-header-left">
            <div className="pf-header-icon">👤</div>
            <div>
              <h1 className="pf-title">Usuários</h1>
              <p className="pf-subtitle">Gerencie os usuários do sistema</p>
            </div>
          </div>

          <button
            type="button"
            className="pf-btn pf-btn-primary"
            onClick={() => navigate('/users/new')}
          >
            + Novo usuário
          </button>
        </header>

        <section className="pf-section">
          {/* Barra de ações dos filtros (padrão do seu modelo) */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              justifyContent: 'flex-end',
              flexWrap: 'wrap',
              marginTop: 8,
            }}
          >
            <button
              type="button"
              className="pf-btn pf-btn-secondary"
              onClick={() =>
                filtersVisible ? hideAllFilters() : showAllFilters()
              }
            >
              {filtersVisible ? 'Ocultar filtros' : 'Filtros'}
            </button>

            <button
              type="button"
              className="pf-btn pf-btn-secondary"
              onClick={clearAllFilters}
              disabled={!hasAnyFilter}
              title="Limpa todos os filtros"
            >
              Limpar
            </button>
          </div>

          <div style={{ marginTop: 12 }}>
            {loading ? (
              <div>Carregando…</div>
            ) : (
              <table className="data-table" style={{ marginTop: 8 }}>
                <thead>
                  <tr>
                    <HeaderCell colKey={COLS.NAME} label="Nome" mobile />
                    <HeaderCell colKey={COLS.EMAIL} label="Email" />
                    <HeaderCell colKey={COLS.PROFILE} label="Perfil" />
                    <HeaderCell colKey={COLS.STATUS} label="Status" />
                    <th>Ações</th>
                  </tr>

                  {filtersVisible && (
                    <tr>
                      {/* Nome */}
                      <th className="mostrar-mobile">
                        {openFilterCols[COLS.NAME] && (
                          <input
                            style={{ width: '100%' }}
                            placeholder="Filtrar nome..."
                            value={nameFilter}
                            onChange={(e) => setNameFilter(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                      </th>

                      {/* Email */}
                      <th>
                        {openFilterCols[COLS.EMAIL] && (
                          <input
                            style={{ width: '100%' }}
                            placeholder="Filtrar email..."
                            value={emailFilter}
                            onChange={(e) => setEmailFilter(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                      </th>

                      {/* Perfil */}
                      <th>
                        {openFilterCols[COLS.PROFILE] && (
                          <input
                            style={{ width: '100%' }}
                            placeholder="Filtrar perfil..."
                            value={profileFilter}
                            onChange={(e) => setProfileFilter(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                      </th>

                      {/* Status */}
                      <th>
                        {openFilterCols[COLS.STATUS] && (
                          <select
                            style={{ width: '100%' }}
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="">Todos</option>
                            <option value="ACTIVE">Ativo</option>
                            <option value="INACTIVE">Inativo</option>
                          </select>
                        )}
                      </th>

                      <th />
                    </tr>
                  )}
                </thead>

                <tbody>
                  {filteredRows.map((u) => {
                    const isInactive = u.isActive === false;

                    return (
                      <tr key={u.id}>
                        <td className="mostrar-mobile">{u.name}</td>
                        <td>{u.email}</td>
                        <td>{u.profile?.name || '—'}</td>
                        <td>
                          {isInactive ? (
                            <span style={{ color: '#b00', fontWeight: 600 }}>
                              Inativo
                            </span>
                          ) : (
                            <span style={{ color: '#0a6', fontWeight: 600 }}>
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

                  {!filteredRows.length ? (
                    <tr>
                      <td colSpan={5} style={{ padding: 12 }}>
                        Nenhum usuário encontrado.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
