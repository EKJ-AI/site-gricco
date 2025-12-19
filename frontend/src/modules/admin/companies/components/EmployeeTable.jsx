import React, { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import RequirePermission from '../../../../shared/hooks/RequirePermission';

const COLS = {
  CPF: 'cpf',
  NAME: 'name',
  JOB_TITLE: 'jobTitle',
  DEPARTMENT: 'department',
  EMAIL: 'email',
  STATUS: 'status',
};

export default function EmployeeTable({
  rows = [],
  onDelete,
  scope = 'company',
}) {
  const { companyId, establishmentId } = useParams();

  const base =
    scope === 'company'
      ? `/companies/${companyId}/employees`
      : `/companies/${companyId}/establishments/${establishmentId}/employees`;

  // ----- filtros por coluna -----
  const [cpfFilter, setCpfFilter] = useState('');
  const [nameFilter, setNameFilter] = useState('');
  const [jobTitleFilter, setJobTitleFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [emailFilter, setEmailFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // '', 'ACTIVE', 'INACTIVE'

  // ----- controle de UI dos filtros -----
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [openFilterCols, setOpenFilterCols] = useState(() => ({
    [COLS.CPF]: false,
    [COLS.NAME]: false,
    [COLS.JOB_TITLE]: false,
    [COLS.DEPARTMENT]: false,
    [COLS.EMAIL]: false,
    [COLS.STATUS]: false,
  }));

  const toggleColFilter = (colKey) => {
    setFiltersVisible(true);
    setOpenFilterCols((prev) => ({ ...prev, [colKey]: !prev[colKey] }));
  };

  const showAllFilters = () => {
    setFiltersVisible(true);
    setOpenFilterCols({
      [COLS.CPF]: true,
      [COLS.NAME]: true,
      [COLS.JOB_TITLE]: true,
      [COLS.DEPARTMENT]: true,
      [COLS.EMAIL]: true,
      [COLS.STATUS]: true,
    });
  };

  const hideAllFilters = () => {
    setFiltersVisible(false);
    setOpenFilterCols({
      [COLS.CPF]: false,
      [COLS.NAME]: false,
      [COLS.JOB_TITLE]: false,
      [COLS.DEPARTMENT]: false,
      [COLS.EMAIL]: false,
      [COLS.STATUS]: false,
    });
  };

  const clearAllFilters = () => {
    setCpfFilter('');
    setNameFilter('');
    setJobTitleFilter('');
    setDepartmentFilter('');
    setEmailFilter('');
    setStatusFilter('');
  };

  const hasAnyFilter =
    !!cpfFilter ||
    !!nameFilter ||
    !!jobTitleFilter ||
    !!departmentFilter ||
    !!emailFilter ||
    !!statusFilter;

  const filteredRows = useMemo(() => {
    const norm = (v) => String(v || '').toLowerCase();

    return (rows || []).filter((e) => {
      const cpf = norm(e.cpf);
      const name = norm(e.name);
      const jobTitle = norm(e.jobTitle);
      const department = norm(e.department?.name);
      const email = norm(e.email);

      const isInactive = e.isActive === false;
      const statusValue = isInactive ? 'INACTIVE' : 'ACTIVE';

      if (cpfFilter && !cpf.includes(norm(cpfFilter))) return false;
      if (nameFilter && !name.includes(norm(nameFilter))) return false;
      if (jobTitleFilter && !jobTitle.includes(norm(jobTitleFilter))) return false;
      if (departmentFilter && !department.includes(norm(departmentFilter)))
        return false;
      if (emailFilter && !email.includes(norm(emailFilter))) return false;

      if (statusFilter && statusValue !== statusFilter) return false;

      return true;
    });
  }, [
    rows,
    cpfFilter,
    nameFilter,
    jobTitleFilter,
    departmentFilter,
    emailFilter,
    statusFilter,
  ]);

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
            <HeaderCell colKey={COLS.CPF} label="CPF" />
            <HeaderCell colKey={COLS.NAME} label="Name" />
            <HeaderCell colKey={COLS.JOB_TITLE} label="Job Title" />
            <HeaderCell colKey={COLS.DEPARTMENT} label="Department" />
            <HeaderCell colKey={COLS.EMAIL} label="Email" />
            <HeaderCell colKey={COLS.STATUS} label="Status" />
            <th></th>
          </tr>

          {filtersVisible && (
            <tr>
              {/* CPF */}
              <th>
                {openFilterCols[COLS.CPF] && (
                  <input
                    style={{ width: '100%' }}
                    placeholder="Filter CPF..."
                    value={cpfFilter}
                    onChange={(e) => setCpfFilter(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
              </th>

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

              {/* Job Title */}
              <th>
                {openFilterCols[COLS.JOB_TITLE] && (
                  <input
                    style={{ width: '100%' }}
                    placeholder="Filter job title..."
                    value={jobTitleFilter}
                    onChange={(e) => setJobTitleFilter(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
              </th>

              {/* Department */}
              <th>
                {openFilterCols[COLS.DEPARTMENT] && (
                  <input
                    style={{ width: '100%' }}
                    placeholder="Filter department..."
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
              </th>

              {/* Email */}
              <th>
                {openFilterCols[COLS.EMAIL] && (
                  <input
                    style={{ width: '100%' }}
                    placeholder="Filter email..."
                    value={emailFilter}
                    onChange={(e) => setEmailFilter(e.target.value)}
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
          {filteredRows.map((e) => {
            const isInactive = e.isActive === false;

            return (
              <tr key={e.id}>
                <td>{e.cpf}</td>
                <td>{e.name}</td>
                <td>{e.jobTitle || '-'}</td>
                <td>{e.department?.name || '-'}</td>
                <td>{e.email || '-'}</td>
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
                  {/* Editar colaborador → employee.update */}
                  <RequirePermission permissions={['employee.update']}>
                    <Link style={{ marginRight: 8 }} to={`${base}/${e.id}/edit`}>
                      Edit
                    </Link>
                  </RequirePermission>

                  {/* Deletar colaborador → employee.delete */}
                  <RequirePermission permissions={['employee.delete']}>
                    <button
                      type="button"
                      className="danger"
                      onClick={() => onDelete?.(e.id)}
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
              <td colSpan={7} style={{ textAlign: 'center' }}>
                No employees
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </>
  );
}
