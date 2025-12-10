import React from 'react';
import { Link } from 'react-router-dom';
import RequirePermission from '../../../../shared/hooks/RequirePermission';

export default function CompanyCard({ item, onDelete }) {
  const isInactive = item.isActive === false;

  return (
    <div className="card" style={isInactive ? { opacity: 0.75 } : undefined}>
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
      <div className="card-subtitle">{item.tradeName || '-'}</div>
      <div className="card-meta">CNPJ: {item.cnpj}</div>
      <div className="card-meta">
        Status: {isInactive ? 'Inativa' : 'Ativa'}
      </div>

      <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Link to={`/companies/${item.id}`} className="secondary">
          Open
        </Link>

        <RequirePermission permission="company.update">
          <Link to={`/companies/${item.id}/edit`}>Edit</Link>
        </RequirePermission>

        <RequirePermission permission="company.delete">
          <button
            type="button"
            className="danger"
            onClick={() => onDelete?.(item.id)}
          >
            Delete
          </button>
        </RequirePermission>
      </div>
    </div>
  );
}
