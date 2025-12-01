// src/modules/companies/components/Tabs.jsx
import React from 'react';
import { NavLink, useParams } from 'react-router-dom';

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
      <NavLink to={`${base}/documents`}>
        Documents
      </NavLink>

      <NavLink to={`${base}/departments`}>
        Departments
      </NavLink>

      <NavLink to={`${base}/employees`}>
        Employees
      </NavLink>
    </div>
  );
}
