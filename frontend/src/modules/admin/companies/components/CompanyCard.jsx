import React from 'react';
import { Link } from 'react-router-dom';
import ProtectedRoute from '../../../../shared/components/ProtectedRoute';

export default function CompanyCard({ item, onDelete }) {
  return (
    <div className="card">
      <div className="card-title">{item.legalName}</div>
      <div className="card-subtitle">{item.tradeName || '-'}</div>
      <div className="card-meta">CNPJ: {item.cnpj}</div>

      <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Link to={`/companies/${item.id}`} className="secondary">
          Open
        </Link>

        <ProtectedRoute inline permissions={['company.update']}>
          <Link to={`/companies/${item.id}/edit`}>Edit</Link>
        </ProtectedRoute>

        <ProtectedRoute inline permissions={['company.delete']}>
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
