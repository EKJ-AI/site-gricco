// src/modules/companies/components/DepartmentTable.jsx
import React from 'react';
import { Link, useParams } from 'react-router-dom';
import ProtectedRoute from '../../../../shared/components/ProtectedRoute';

export default function DepartmentTable({ rows = [], onDelete }) {
  const { companyId, establishmentId } = useParams();

  return (
    <table className="data-table" style={{ marginTop: 8 }}>
      <thead>
        <tr>
          <th>Name</th>
          <th>Shift</th>
          <th>Workload</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {rows.map((d) => (
          <tr key={d.id}>
            <td>{d.name}</td>
            <td>{d.shift || '-'}</td>
            <td>{d.workload || '-'}</td>
            <td style={{ textAlign: 'right' }}>
              <Link
                style={{ marginRight: 8 }}
                to={`/companies/${companyId}/establishments/${establishmentId}/departments/${d.id}/edit`}
              >
                Edit
              </Link>

              <ProtectedRoute inline permissions={['department.delete']}>
                <button
                  type="button"
                  className="danger"
                  onClick={() => onDelete?.(d.id)}
                >
                  Delete
                </button>
              </ProtectedRoute>
            </td>
          </tr>
        ))}
        {!rows.length && (
          <tr>
            <td colSpan={4} style={{ textAlign: 'center' }}>
              No departments
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
