import React, { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import RequirePermission from '../../../../shared/hooks/RequirePermission';

const COLS = {
  NAME: 'name',
  SHIFT: 'shift',
  WORKLOAD: 'workload',
  STATUS: 'status',
};

export default function DepartmentTable({ rows = [], onDelete }) {
  const { companyId, establishmentId } = useParams();

  // ----- filtros por coluna -----
  const [nameFilter, setNameFilter] = useState('');
  const [shiftFilter, setShiftFilter] = useState('');
  const [workloadFilter, setWorkloadFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // '', 'ACTIVE', 'INACTIVE'

  // ----- controle de UI dos filtros -----
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [openFilterCols, setOpenFilterCols] = useState(() => ({
    [COLS.NAME]: false,
    [COLS.SHIFT]: false,
    [COLS.WORKLOAD]: false,
    [COLS.STATUS]: false,
  }));

  const toggleColFilter = (colKey) => {
    setFiltersVisible(true);
    setOpenFilterCols((prev) => ({ ...prev, [colKey]: !prev[colKey] }));
  };

  const showAllFilters = () => {
    setFiltersVisible(true);
    setOpenFilterCols({
      [COLS.NAME]: true,
      [COLS.SHIFT]: true,
      [COLS.WORKLOAD]: true,
      [COLS.STATUS]: true,
    });
  };

  const hideAllFilters = () => {
    setFiltersVisible(false);
    setOpenFilterCols({
      [COLS.NAME]: false,
      [COLS.SHIFT]: false,
      [COLS.WORKLOAD]: false,
      [COLS.STATUS]: false,
    });
  };

  const clearAllFilters = () => {
    setNameFilter('');
    setShiftFilter('');
    setWorkloadFilter('');
    setStatusFilter('');
  };

  const hasAnyFilter =
    !!nameFilter || !!shiftFilter || !!workloadFilter || !!statusFilter;

  const filteredRows = useMemo(() => {
    const norm = (v) => String(v || '').toLowerCase();

    return (rows || []).filter((d) => {
      const name = norm(d.name);
      const shift = norm(d.shift);
      const workload = norm(d.workload);
      const isInactive = d.isActive === false;
      const statusValue = isInactive ? 'INACTIVE' : 'ACTIVE';

      if (nameFilter && !name.includes(norm(nameFilter))) return false;
      if (shiftFilter && !shift.includes(norm(shiftFilter))) return false;
      if (workloadFilter && !workload.includes(norm(workloadFilter))) return false;
      if (statusFilter && statusValue !== statusFilter) return false;

      return true;
    });
  }, [rows, nameFilter, shiftFilter, workloadFilter, statusFilter]);

  const HeaderCell = ({ colKey, label }) => {
    const active = !!openFilterCols[colKey];
    return (
      <th
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
    <>
      {/* Barra de ações dos filtros */}
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
          className="secondary"
          onClick={() => (filtersVisible ? hideAllFilters() : showAllFilters())}
        >
          {filtersVisible ? 'Ocultar filtros' : 'Filtros'}
        </button>

        <button
          type="button"
          className="secondary"
          onClick={clearAllFilters}
          disabled={!hasAnyFilter}
          title="Limpa todos os filtros"
        >
          Limpar
        </button>
      </div>

      <table className="data-table" style={{ marginTop: 8 }}>
        <thead>
          <tr>
            <HeaderCell colKey={COLS.NAME} label="Name" />
            <HeaderCell colKey={COLS.SHIFT} label="Shift" />
            <HeaderCell colKey={COLS.WORKLOAD} label="Workload" />
            <HeaderCell colKey={COLS.STATUS} label="Status" />
            <th></th>
          </tr>

          {filtersVisible && (
            <tr>
              {/* Name */}
              <th>
                {openFilterCols[COLS.NAME] && (
                  <input
                    style={{ width: '100%' }}
                    placeholder="Filter name..."
                    value={nameFilter}
                    onChange={(e) => setNameFilter(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
              </th>

              {/* Shift */}
              <th>
                {openFilterCols[COLS.SHIFT] && (
                  <input
                    style={{ width: '100%' }}
                    placeholder="Filter shift..."
                    value={shiftFilter}
                    onChange={(e) => setShiftFilter(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
              </th>

              {/* Workload */}
              <th>
                {openFilterCols[COLS.WORKLOAD] && (
                  <input
                    style={{ width: '100%' }}
                    placeholder="Filter workload..."
                    value={workloadFilter}
                    onChange={(e) => setWorkloadFilter(e.target.value)}
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
                    <option value="">All</option>
                    <option value="ACTIVE">Ativo</option>
                    <option value="INACTIVE">Inativo</option>
                  </select>
                )}
              </th>

              <th></th>
            </tr>
          )}
        </thead>

        <tbody>
          {filteredRows.map((d) => {
            const isInactive = d.isActive === false;

            return (
              <tr key={d.id}>
                <td>{d.name}</td>
                <td>{d.shift || '-'}</td>
                <td>{d.workload || '-'}</td>
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
                <td style={{ textAlign: 'right' }}>
                  {/* Editar departamento → department.update */}
                  <RequirePermission permissions={['department.update']}>
                    <Link
                      style={{ marginRight: 8 }}
                      to={`/companies/${companyId}/establishments/${establishmentId}/departments/${d.id}/edit`}
                    >
                      Edit
                    </Link>
                  </RequirePermission>

                  {/* Deletar departamento → department.delete */}
                  <RequirePermission permissions={['department.delete']}>
                    <button
                      type="button"
                      className="danger"
                      onClick={() => onDelete?.(d.id)}
                    >
                      Delete
                    </button>
                  </RequirePermission>
                </td>
              </tr>
            );
          })}

          {!filteredRows.length && (
            <tr>
              <td colSpan={5} style={{ textAlign: 'center' }}>
                No departments
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </>
  );
}
