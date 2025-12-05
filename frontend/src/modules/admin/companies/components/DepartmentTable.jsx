import React from 'react';
import { Link, useParams } from 'react-router-dom';
// import ProtectedRoute from '../../../../shared/components/ProtectedRoute';
import RequirePermission from '../../../../shared/hooks/RequirePermission';

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
              {/* Editar departamento → department.update */}
              <RequirePermission permissions={['department.update']}>
                <Link
                  style={{ marginRight: 8 }}
                  to={`/companies/${companyId}/establishments/${establishmentId}/departments/${d.id}/edit`}
                >
                  Edit
                </Link>
              </RequirePermission>

              {/* Deletar departamento → department.delete */}
              <RequirePermission permissions={['department.delete']}>
                <button
                  type="button"
                  className="danger"
                  onClick={() => onDelete?.(d.id)}
                >
                  Delete
                </button>
              </RequirePermission>
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
