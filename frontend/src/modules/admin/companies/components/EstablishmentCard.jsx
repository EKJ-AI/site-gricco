import React from 'react';
import { NavLink } from 'react-router-dom';
import RequirePermission from '../../../../shared/hooks/RequirePermission';
import iconVoltar from '../../../../shared/assets/images/admin/iconSetaEsquerda.svg';

export default function EstablishmentCard({ item, onDelete }) {
  const isInactive = item.isActive === false;

  const linkClassExact = ({ isActive }) =>
  "item-icone-rotulo-cards" + (isActive ? " marcado" : "");
  const linkClassMiniExact = ({ isActive }) =>
  "item-icone-rotulo" + (isActive ? "" : "");

  return (
    <div className={`card ${isInactive ? 'inativa' : 'ativa'} `} style={isInactive ? { opacity: 0.75 } : undefined}>
      <div className="card-title">
        <div className='display-flex'>
          <RequirePermission permission="company.read">
            <NavLink
                to={`/companies`}
              >
                <img src={iconVoltar} alt="Voltar" style={{width: '24px', height: '24px', marginRight: '8px'}} />
              </NavLink>
          </RequirePermission>
          {item.nickname || item.cnpj}
        </div>
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
            Inativo
          </span>
        )}
      </div>
      <div className="card-meta">CNAE: {item.mainCnae || '-'}</div>
      <div className="card-meta">Risk: {item.riskLevel ?? '-'}</div>
      <div className={`card-meta ${isInactive ? 'inativa' : 'ativa'} `}>
        Status: {isInactive ? 'Inativo' : 'Ativo'}
      </div>

      <div className='card-actions'>
        {/* 👇 Agora abre direto o dashboard */}
        <NavLink
          to={`/companies/${item.companyId}/establishments/${item.id}/dashboard`}
          end
          className={linkClassExact}
        >
          <span className="sidebar-link-icon open-icon" />
          <span>Open</span>
        </NavLink>
        <div className='display-flex'>
          <RequirePermission permission="establishment.update">
            <NavLink
              to={`/companies/${item.companyId}/establishments/${item.id}/edit`}
              end
              className={linkClassMiniExact}
            >
              <span className="sidebar-link-icon edit-icon" />
            </NavLink>
          </RequirePermission>

          {/* Só renderiza o botão se tiver handler de delete */}
          {onDelete && (
            <RequirePermission permission="establishment.delete">
              <NavLink to="#" 
                end
                className={linkClassMiniExact}
                onClick={(e) => {
                  e.preventDefault();
                  onDelete(item.id)
                }}
                title="Delete Company"
              >
                <span className="sidebar-link-icon delete-icon" />
              </NavLink>              
              {/* <button
                type="button"
                className="danger"
                onClick={() => onDelete(item.id)}
              >
                Delete
              </button> */}
            </RequirePermission>
          )}
        </div>
      </div>
    </div>
  );
}
