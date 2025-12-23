// src/modules/auth/pages/PermissionsPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import api from '../../../api/axios';
import { useAuth } from '../contexts/AuthContext';

import '../../../shared/styles/Table.css';
import '../../../shared/styles/padrao.css';

import { useToast, extractErrorMessage } from '../../../shared/components/toast/ToastProvider';
import ConfirmModal from '../../../shared/components/modals/ConfirmModal';

const COLS = {
  NAME: 'name',
  DESCRIPTION: 'description',
};

export default function PermissionsPage() {
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(false);

  // ----- filtros por coluna -----
  const [nameFilter, setNameFilter] = useState('');
  const [descriptionFilter, setDescriptionFilter] = useState('');

  // ----- controle de UI dos filtros -----
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [openFilterCols, setOpenFilterCols] = useState(() => ({
    [COLS.NAME]: false,
    [COLS.DESCRIPTION]: false,
  }));

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [permissionToDelete, setPermissionToDelete] = useState(null);

  const authHeader = { headers: { Authorization: `Bearer ${accessToken}` } };

  const fetchPermissions = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/permissions', {
        ...authHeader,
        params: { all: 1 },
      });
      setPermissions(res.data?.data?.items || []);
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Erro ao carregar permissões.'), { title: 'Erro' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
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
      [COLS.DESCRIPTION]: true,
    });
  };

  const hideAllFilters = () => {
    setFiltersVisible(false);
    setOpenFilterCols({
      [COLS.NAME]: false,
      [COLS.DESCRIPTION]: false,
    });
  };

  const clearAllFilters = () => {
    setNameFilter('');
    setDescriptionFilter('');
  };

  const hasAnyFilter = !!nameFilter || !!descriptionFilter;

  const filteredRows = useMemo(() => {
    const norm = (v) => String(v || '').toLowerCase();

    return (permissions || []).filter((p) => {
      const name = norm(p.name);
      const desc = norm(p.description);

      if (nameFilter && !name.includes(norm(nameFilter))) return false;
      if (descriptionFilter && !desc.includes(norm(descriptionFilter))) return false;

      return true;
    });
  }, [permissions, nameFilter, descriptionFilter]);

  const askDelete = (perm) => {
    setPermissionToDelete(perm);
    setConfirmOpen(true);
  };

  const handleDeleteConfirmed = async () => {
    if (!permissionToDelete?.id) return;

    setDeleting(true);
    try {
      await api.delete(`/api/permissions/${permissionToDelete.id}`, authHeader);
      toast.success('Permissão excluída.', { title: 'OK' });
      setConfirmOpen(false);
      setPermissionToDelete(null);
      fetchPermissions();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Erro ao excluir permissão.'), { title: 'Não foi possível excluir' });
    } finally {
      setDeleting(false);
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
          <span style={{ fontSize: 12, opacity: 0.7 }}>{active ? '▾' : '▸'}</span>
        </div>
      </th>
    );
  };

  return (
    <div className="pf-page">
      <div className="pf-shell">
        <header className="pf-header">
          <div className="pf-header-left">
            <div className="pf-header-icon">🔑</div>
            <div>
              <h1 className="pf-title">Permissões</h1>
              <p className="pf-subtitle">Lista e gestão de permissões do sistema</p>
            </div>
          </div>

          <button type="button" className="pf-btn pf-btn-primary" onClick={() => navigate('/permissions/new')}>
            + Nova permissão
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
              onClick={() => (filtersVisible ? hideAllFilters() : showAllFilters())}
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
                    <HeaderCell colKey={COLS.DESCRIPTION} label="Descrição" />
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

                      {/* Descrição */}
                      <th>
                        {openFilterCols[COLS.DESCRIPTION] && (
                          <input
                            style={{ width: '100%' }}
                            placeholder="Filtrar descrição..."
                            value={descriptionFilter}
                            onChange={(e) => setDescriptionFilter(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                      </th>

                      <th />
                    </tr>
                  )}
                </thead>

                <tbody>
                  {(filteredRows || []).map((p) => (
                    <tr key={p.id}>
                      <td className="mostrar-mobile">{p.name}</td>
                      <td>{p.description || '—'}</td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn btn-edit"
                            onClick={() => navigate(`/permissions/edit/${p.id}`, { state: { permission: p } })}
                          >
                            Editar
                          </button>

                          <button className="btn btn-delete" onClick={() => askDelete(p)}>
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {!filteredRows.length ? (
                    <tr>
                      <td colSpan={3} style={{ padding: 12 }}>
                        Nenhuma permissão encontrada.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <ConfirmModal
          open={confirmOpen}
          title="Excluir permissão"
          message={
            permissionToDelete
              ? `Confirma excluir a permissão "${permissionToDelete.name}"?`
              : 'Confirma excluir esta permissão?'
          }
          confirmLabel="Excluir"
          cancelLabel="Cancelar"
          loading={deleting}
          onConfirm={handleDeleteConfirmed}
          onCancel={() => {
            if (deleting) return;
            setConfirmOpen(false);
            setPermissionToDelete(null);
          }}
        />
      </div>
    </div>
  );
}
