// src/modules/companies/components/EmployeeTable.jsx
import React from 'react';
import { Link, useParams } from 'react-router-dom';
import ProtectedRoute from '../../../../shared/components/ProtectedRoute';

export default function EmployeeTable({ rows = [], onDelete, scope = 'company' }) {
  const { companyId, establishmentId } = useParams();

  const base =
    scope === 'company'
      ? `/companies/${companyId}/employees`
      : `/establishments/${establishmentId}/employees`;

  return (
    <table className="data-table" style={{ marginTop: 8 }}>
      <thead>
        <tr>
          <th>CPF</th>
          <th>Name</th>
          <th>Job Title</th>
          <th>Email</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {rows.map((e) => (
          <tr key={e.id}>
            <td>{e.cpf}</td>
            <td>{e.name}</td>
            <td>{e.jobTitle || '-'}</td>
            <td>{e.email || '-'}</td>
            <td style={{ textAlign: 'right' }}>
              <Link style={{ marginRight: 8 }} to={`${base}/${e.id}/edit`}>
                Edit
              </Link>

              <ProtectedRoute inline permissions={['employee.delete']}>
                <button
                  type="button"
                  className="danger"
                  onClick={() => onDelete?.(e.id)}
                >
                  Delete
                </button>
              </ProtectedRoute>
            </td>
          </tr>
        ))}
        {!rows.length && (
          <tr>
            <td colSpan={5} style={{ textAlign: 'center' }}>
              No employees
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
