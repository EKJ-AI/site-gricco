import React from 'react';
import { NavLink, useParams, useLocation } from 'react-router-dom';
import RequirePermission from '../../../../shared/hooks/RequirePermission';

export default function Tabs() {
  const { companyId, establishmentId } = useParams();
  const location = useLocation();  

  if (!companyId || !establishmentId) {
    // fallback simples pra evitar quebrar se for usado fora do contexto esperado
    return null;
  }

  const base = `/companies/${companyId}/establishments/${establishmentId}`;

  const linkClassExact = ({ isActive }) =>
  "item-icone-rotulo" + (isActive ? " marcado" : "");

  const paginaAtual = location.pathname
    .replace(/\/+$/, "")        // remove barra no final, se tiver
    .split("/")                // quebra em partes
    .filter(Boolean)           // remove vazios
    .pop();                    // pega a última
  console.log('Location pathname:', paginaAtual);

  return (
    <div
      className="tabs" style={paginaAtual === 'documents' ? {display: 'none'} : {}}
    >
        <RequirePermission permissions={['establishment.read']}>
          <NavLink to={`${base}/about`} className={linkClassExact}>
            <span className="sidebar-link-icon about-icon" />
            <span>Sobre</span>
          </NavLink>
        </RequirePermission>

        {/* 👇 DASHBOARD – antes de Documents */}
        <RequirePermission permissions={['establishment.read']}>
          {/* <NavLink to={`/companies/${companyId}`}>
              Voltar
          </NavLink> */}
          <NavLink to={`${base}/dashboard`} className={linkClassExact}>
            <span className="sidebar-link-icon dashboard-icon" />
            <span>Dashboard</span>
          </NavLink>
        </RequirePermission>

        {/* Documentos → exige document.read */}
        {/* <RequirePermission permissions={['document.read']}>
          <NavLink to={`${base}/documents`}>
            Documents
          </NavLink>
        </RequirePermission> */}

        {/* Departamentos → exige department.read */}
        <RequirePermission permissions={['department.read']}>
          <NavLink to={`${base}/departments`} className={linkClassExact}>
            <span className="sidebar-link-icon departament-icon" />
            <span>Departaments</span>
          </NavLink>
        </RequirePermission>

        {/* Colaboradores → exige employee.read */}
        <RequirePermission permissions={['employee.read']}>
          <NavLink to={`${base}/employees`} className={linkClassExact}>
            <span className="sidebar-link-icon employees-icon" />
            <span>Employees</span>
          </NavLink>
        </RequirePermission>
    </div>
  );
}
