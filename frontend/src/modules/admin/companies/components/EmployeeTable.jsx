import React from 'react';
import { Link, useParams } from 'react-router-dom';
import RequirePermission from '../../../../shared/hooks/RequirePermission';

export default function EmployeeTable({
  rows = [],
  onDelete,
  scope = 'company',
}) {
  const { companyId, establishmentId } = useParams();

  const base =
    scope === 'company'
      ? `/companies/${companyId}/employees`
      : `/companies/${companyId}/establishments/${establishmentId}/employees`;

  return (
    <table className="data-table" style={{ marginTop: 8 }}>
      <thead>
        <tr>
          <th>CPF</th>
          <th>Name</th>
          <th>Job Title</th>
          <th>Department</th>
          <th>Email</th>
          <th>Status</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {rows.map((e) => {
          const isInactive = e.isActive === false;
          return (
            <tr key={e.id}>
              <td>{e.cpf}</td>
              <td>{e.name}</td>
              <td>{e.jobTitle || '-'}</td>
              <td>{e.department?.name || '-'}</td>
              <td>{e.email || '-'}</td>
              <td>
                {isInactive ? (
                  <span style={{ color: '#b00', fontWeight: 500 }}>
                    Inativo
                  </span>
                ) : (
                  <span style={{ color: '#0a6', fontWeight: 500 }}>
                    Ativo
                  </span>
                )}
              </td>
              <td style={{ textAlign: 'right' }}>
                {/* Editar colaborador → employee.update */}
                <RequirePermission permissions={['employee.update']}>
                  <Link
                    style={{ marginRight: 8 }}
                    to={`${base}/${e.id}/edit`}
                  >
                    Edit
                  </Link>
                </RequirePermission>

                {/* Deletar colaborador → employee.delete */}
                <RequirePermission permissions={['employee.delete']}>
                  <button
                    type="button"
                    className="danger"
                    onClick={() => onDelete?.(e.id)}
                  >
                    Delete
                  </button>
                </RequirePermission>
              </td>
            </tr>
          );
        })}
        {!rows.length && (
          <tr>
            <td colSpan={7} style={{ textAlign: 'center' }}>
              No employees
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
