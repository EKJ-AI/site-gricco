// src/modules/companies/components/EstablishmentCard.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import RequirePermission from '../../../../shared/hooks/RequirePermission';

export default function EstablishmentCard({ item, onDelete }) {
  return (
    <div className="card">
      <div className="card-title">{item.nickname || item.cnpj}</div>
      <div className="card-meta">CNAE: {item.mainCnae || '-'}</div>
      <div className="card-meta">Risk: {item.riskLevel ?? '-'}</div>

      <div
        style={{
          marginTop: 10,
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <Link
          to={`/companies/${item.companyId}/establishments/${item.id}`}
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
    </div>
  );
}
