// src/modules/admin/audit/AuditLogsPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../auth/contexts/AuthContext';
import { useTranslation } from '../../../shared/i18n';
import api from '../../../api/axios';

import '../../../shared/styles/Table.css';
import '../../../shared/styles/padrao.css';

import { useToast, extractErrorMessage } from '../../../shared/components/toast/ToastProvider';

const COLS = {
  ACTION: 'action',
  ENTITY: 'entity',
  DETAILS: 'details',
  USER: 'user',
  DATETIME: 'datetime',
};

export default function AuditLogsPage() {
  const { accessToken } = useAuth();
  const { t } = useTranslation();
  const toast = useToast();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // ----- filtros por coluna -----
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [detailsFilter, setDetailsFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [dateFilter, setDateFilter] = useState(''); // yyyy-mm-dd

  // ----- controle de UI dos filtros -----
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [openFilterCols, setOpenFilterCols] = useState(() => ({
    [COLS.ACTION]: false,
    [COLS.ENTITY]: false,
    [COLS.DETAILS]: false,
    [COLS.USER]: false,
    [COLS.DATETIME]: false,
  }));

  const authHeader = { headers: { Authorization: `Bearer ${accessToken}` } };

  const fetchLogs = async () => {
    try {
      setLoading(true);

      const res = await api.get('/api/audit', authHeader);

      // Garantir array
      const data = res?.data?.data;
      if (Array.isArray(data)) setLogs(data);
      else if (Array.isArray(data?.items)) setLogs(data.items);
      else setLogs([]);
    } catch (err) {
      console.error('Erro ao carregar logs:', err);
      toast.error(
        extractErrorMessage(err, t('error_loading_logs') || 'Erro ao carregar logs de auditoria.'),
        { title: 'Erro' },
      );
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleColFilter = (colKey) => {
    setFiltersVisible(true);
    setOpenFilterCols((prev) => ({ ...prev, [colKey]: !prev[colKey] }));
  };

  const mostrarTodosFiltros = () => {
    setFiltersVisible(true);
    setOpenFilterCols({
      [COLS.ACTION]: true,
      [COLS.ENTITY]: true,
      [COLS.DETAILS]: true,
      [COLS.USER]: true,
      [COLS.DATETIME]: true,
    });
  };

  const ocultarTodosFiltros = () => {
    setFiltersVisible(false);
    setOpenFilterCols({
      [COLS.ACTION]: false,
      [COLS.ENTITY]: false,
      [COLS.DETAILS]: false,
      [COLS.USER]: false,
      [COLS.DATETIME]: false,
    });
  };

  const limparTodosFiltros = () => {
    setActionFilter('');
    setEntityFilter('');
    setDetailsFilter('');
    setUserFilter('');
    setDateFilter('');
  };

  const temAlgumFiltro =
    !!actionFilter || !!entityFilter || !!detailsFilter || !!userFilter || !!dateFilter;

  const linhasFiltradas = useMemo(() => {
    const norm = (v) => String(v || '').toLowerCase();
    const emailUsuario = (log) => (log?.user?.email ? String(log.user.email) : 'Sistema');

    return (logs || []).filter((log) => {
      const action = norm(log.action);
      const entity = norm(log.entity);
      const details = norm(log.details);
      const userEmail = norm(emailUsuario(log));

      const created = log?.createdAt ? new Date(log.createdAt) : null;
      const createdYmd =
        created && !Number.isNaN(created.getTime()) ? created.toISOString().slice(0, 10) : '';

      if (actionFilter && !action.includes(norm(actionFilter))) return false;
      if (entityFilter && !entity.includes(norm(entityFilter))) return false;
      if (detailsFilter && !details.includes(norm(detailsFilter))) return false;
      if (userFilter && !userEmail.includes(norm(userFilter))) return false;
      if (dateFilter && createdYmd !== String(dateFilter)) return false;

      return true;
    });
  }, [logs, actionFilter, entityFilter, detailsFilter, userFilter, dateFilter]);

  const CabecalhoColuna = ({ colKey, label, mobile = false }) => {
    const ativo = !!openFilterCols[colKey];
    return (
      <th
        className={mobile ? 'mostrar-mobile' : undefined}
        style={{ cursor: 'pointer', userSelect: 'none' }}
        title="Clique para abrir/fechar o filtro desta coluna"
        onClick={() => toggleColFilter(colKey)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>{label}</span>
          <span style={{ fontSize: 12, opacity: 0.7 }}>{ativo ? '▾' : '▸'}</span>
        </div>
      </th>
    );
  };

  return (
    <div className="pf-page">
      <div className="pf-shell">
        <header className="pf-header">
          <div className="pf-header-left">
            <div className="pf-header-icon">🧾</div>
            <div>
              <h1 className="pf-title">{t('audit_logs') || 'Logs de auditoria'}</h1>
              <p className="pf-subtitle">Acompanhe ações e alterações no sistema</p>
            </div>
          </div>

          <button
            type="button"
            className="pf-btn pf-btn-secondary"
            onClick={fetchLogs}
            disabled={loading}
            title="Recarregar"
          >
            {loading ? 'Carregando…' : 'Recarregar'}
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
              onClick={() => (filtersVisible ? ocultarTodosFiltros() : mostrarTodosFiltros())}
            >
              {filtersVisible ? 'Ocultar filtros' : 'Filtros'}
            </button>

            <button
              type="button"
              className="pf-btn pf-btn-secondary"
              onClick={limparTodosFiltros}
              disabled={!temAlgumFiltro}
              title="Limpa todos os filtros"
            >
              Limpar
            </button>
          </div>

          <div style={{ marginTop: 12 }}>
            {loading ? (
              <div>Carregando…</div>
            ) : !linhasFiltradas.length ? (
              <div style={{ padding: 12 }}>Nenhum log encontrado.</div>
            ) : (
              <table className="data-table" style={{ marginTop: 8 }}>
                <thead>
                  <tr>
                    <CabecalhoColuna colKey={COLS.ACTION} label="Ação" mobile />
                    <CabecalhoColuna colKey={COLS.ENTITY} label="Entidade" />
                    <CabecalhoColuna colKey={COLS.DETAILS} label="Detalhes" />
                    <CabecalhoColuna colKey={COLS.USER} label="Usuário" />
                    <CabecalhoColuna colKey={COLS.DATETIME} label="Data/Hora" />
                  </tr>

                  {filtersVisible && (
                    <tr>
                      {/* Ação */}
                      <th className="mostrar-mobile">
                        {openFilterCols[COLS.ACTION] && (
                          <input
                            style={{ width: '100%' }}
                            placeholder="Filtrar ação..."
                            value={actionFilter}
                            onChange={(e) => setActionFilter(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                      </th>

                      {/* Entidade */}
                      <th>
                        {openFilterCols[COLS.ENTITY] && (
                          <input
                            style={{ width: '100%' }}
                            placeholder="Filtrar entidade..."
                            value={entityFilter}
                            onChange={(e) => setEntityFilter(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                      </th>

                      {/* Detalhes */}
                      <th>
                        {openFilterCols[COLS.DETAILS] && (
                          <input
                            style={{ width: '100%' }}
                            placeholder="Filtrar detalhes..."
                            value={detailsFilter}
                            onChange={(e) => setDetailsFilter(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                      </th>

                      {/* Usuário */}
                      <th>
                        {openFilterCols[COLS.USER] && (
                          <input
                            style={{ width: '100%' }}
                            placeholder="Filtrar usuário..."
                            value={userFilter}
                            onChange={(e) => setUserFilter(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                      </th>

                      {/* Data/Hora (por dia) */}
                      <th>
                        {openFilterCols[COLS.DATETIME] && (
                          <input
                            type="date"
                            style={{ width: '100%' }}
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                      </th>
                    </tr>
                  )}
                </thead>

                <tbody>
                  {linhasFiltradas.map((log) => {
                    const usuario = log?.user?.email ? log.user.email : 'Sistema';
                    const dt = log?.createdAt ? new Date(log.createdAt) : null;
                    const dtText = dt && !Number.isNaN(dt.getTime()) ? dt.toLocaleString() : '—';

                    return (
                      <tr key={log.id}>
                        <td className="mostrar-mobile">{log.action}</td>
                        <td>{log.entity || '—'}</td>
                        <td>{log.details || '—'}</td>
                        <td>{usuario}</td>
                        <td>{dtText}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
