import React from 'react';
import { NavLink, useParams } from 'react-router-dom';
import RequirePermission from '../../../../shared/hooks/RequirePermission';

export default function Tabs() {
  const { companyId, establishmentId } = useParams();

  if (!companyId || !establishmentId) {
    // fallback simples pra evitar quebrar se for usado fora do contexto esperado
    return null;
  }

  const base = `/companies/${companyId}/establishments/${establishmentId}`;

  return (
    <div
      className="tabs"
      style={{
        display: 'flex',
        gap: 12,
        borderBottom: '1px solid #eee',
        marginBottom: 12,
      }}
    >
      {/* 👇 DASHBOARD – antes de Documents */}
      <RequirePermission permissions={['establishment.read']}>
        <NavLink to={`/companies/${companyId}`}>
            Voltar
        </NavLink>
        <NavLink to={`${base}/dashboard`}>
          Dashboard
        </NavLink>
      </RequirePermission>

      {/* Documentos → exige document.read */}
      <RequirePermission permissions={['document.read']}>
        <NavLink to={`${base}/documents`}>
          Documents
        </NavLink>
      </RequirePermission>

      {/* Departamentos → exige department.read */}
      <RequirePermission permissions={['department.read']}>
        <NavLink to={`${base}/departments`}>
          Departments
        </NavLink>
      </RequirePermission>

      {/* Colaboradores → exige employee.read */}
      <RequirePermission permissions={['employee.read']}>
        <NavLink to={`${base}/employees`}>
          Employees
        </NavLink>
      </RequirePermission>
    </div>
  );
}
