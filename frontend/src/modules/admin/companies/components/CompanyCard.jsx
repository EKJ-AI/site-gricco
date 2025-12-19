import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import RequirePermission from '../../../../shared/hooks/RequirePermission';

export default function CompanyCard({ item, onDelete }) {
  const isInactive = item.isActive === false;

  const linkClassExact = ({ isActive }) =>
  "item-icone-rotulo-cards" + (isActive ? " marcado" : "");
  const linkClassMiniExact = ({ isActive }) =>
  "item-icone-rotulo" + (isActive ? "" : "");

  return (
    <div className={`card ${isInactive ? 'inativa' : 'ativa'} `} style={isInactive ? { opacity: 0.75 } : undefined}>
      <div className="card-title">
        {item.legalName}
        {isInactive && (
          <span
            style={{
              marginLeft: 8,
              padding: '2px 6px',
              fontSize: 11,
              borderRadius: 4,
              backgroundColor: '#eee',
              color: '#b00',
              textTransform: 'uppercase',
            }}
          >
            Inativa
          </span>
        )}
      </div>
      {/* <div className="card-subtitle">{item.tradeName || '-'}</div> */}
      <div className="card-meta">CNPJ: {item.cnpj}</div>
      <div className={`card-meta ${isInactive ? 'inativa' : 'ativa'} `}>
        Status: {isInactive ? 'Inativa' : 'Ativa'}
      </div>

      <div className='card-actions'>
        <NavLink to={`/companies/${item.id}`} end className={linkClassExact}>
          <span className="sidebar-link-icon open-icon" />
          <span>Open</span>
        </NavLink>
        <div className='display-flex'>
          <RequirePermission permission="company.update">
            <NavLink to={`/companies/${item.id}/edit`} end className={linkClassMiniExact}>
              <span className="sidebar-link-icon edit-icon" />
            </NavLink>
          </RequirePermission>

          <RequirePermission permission="company.delete">
            <NavLink to="#" 
              end
              className={linkClassMiniExact}
              onClick={(e) => {
                e.preventDefault();
                onDelete?.(item.id);
              }}
              title="Delete Company"
            >
              <span className="sidebar-link-icon delete-icon" />
            </NavLink>
            {/* <button
              type="button"
              className="danger"
              onClick={() => onDelete?.(item.id)}
            >
              Delete
            </button> */}
          </RequirePermission>
        </div>
      </div>
    </div>
  );
}
