// src/modules/companies/components/EstablishmentCard.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import ProtectedRoute from '../../../../shared/components/ProtectedRoute';

export default function EstablishmentCard({ item, onDelete }) {
  return (
    <div className="card">
      <div className="card-title">{item.nickname || item.cnpj}</div>
      <div className="card-meta">CNAE: {item.mainCnae || '-'}</div>
      <div className="card-meta">Risk: {item.riskLevel ?? '-'}</div>

      <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Link
          to={`/companies/${item.companyId}/establishments/${item.id}`}
          className="secondary"
        >
          Open
        </Link>

        <ProtectedRoute inline permissions={['establishment.update']}>
          <Link
            to={`/companies/${item.companyId}/establishments/${item.id}/edit`}
          >
            Edit
          </Link>
        </ProtectedRoute>

        <ProtectedRoute inline permissions={['establishment.delete']}>
          <button
            type="button"
            className="danger"
            onClick={() => onDelete?.(item.id)}
          >
            Delete
          </button>
        </ProtectedRoute>
      </div>
    </div>
  );
}
