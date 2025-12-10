import React from 'react';
import { Link } from 'react-router-dom';
import RequirePermission from '../../../../shared/hooks/RequirePermission';

export default function EstablishmentCard({ item, onDelete }) {
  const isInactive = item.isActive === false;

  return (
    <div className="card" style={isInactive ? { opacity: 0.75 } : undefined}>
      <div className="card-title">
        {item.nickname || item.cnpj}
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
      <div className="card-meta">
        Status: {isInactive ? 'Inativo' : 'Ativo'}
      </div>

      <div
        style={{
          marginTop: 10,
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        {/* 👇 Agora abre direto o dashboard */}
        <Link
          to={`/companies/${item.companyId}/establishments/${item.id}/dashboard`}
          className="secondary"
        >
          Open
        </Link>

        <RequirePermission permission="establishment.update">
          <Link
            to={`/companies/${item.companyId}/establishments/${item.id}/edit`}
          >
            Edit
          </Link>
        </RequirePermission>

        {/* Só renderiza o botão se tiver handler de delete */}
        {onDelete && (
          <RequirePermission permission="establishment.delete">
            <button
              type="button"
              className="danger"
              onClick={() => onDelete(item.id)}
            >
              Delete
            </button>
          </RequirePermission>
        )}
      </div>
      <RequirePermission permission="company.read">
        <Link
            to={`/companies`}
            className="secondary"
          >
            Voltar
          </Link>
      </RequirePermission>
    </div>
  );
}
