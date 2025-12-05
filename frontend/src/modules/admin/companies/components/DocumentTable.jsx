import React from 'react';
import { Link, useParams } from 'react-router-dom';
import RequirePermission from '../../../../shared/hooks/RequirePermission';

export default function DocumentTable({ rows = [], onDelete }) {
  const { companyId, establishmentId } = useParams();

  return (
    <table className="data-table" style={{ marginTop: 8 }}>
      <thead>
        <tr>
          <th>Name</th>
          <th>Type</th>
          <th>Category</th>
          <th>Status</th>
          <th>Current Version</th>
          <th>Evidences</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {rows.map((d) => (
          <tr key={d.id}>
            <td>
              <Link
                to={`/companies/${companyId}/establishments/${establishmentId}/documents/${d.id}`}
              >
                {d.name}
              </Link>
            </td>
            <td>{d.type?.name || '-'}</td>
            <td>
              {d.type?.kind === 'MAIN'
                ? 'Documento principal'
                : d.type?.kind === 'EVIDENCE'
                ? 'Evidência / Registro'
                : '-'}
            </td>
            <td>{d.status}</td>
            <td>
              {d.currentVersion?.versionNumber != null
                ? `v${d.currentVersion.versionNumber}`
                : '-'}
            </td>
            <td>{d.evidencesCount ?? 0}</td>
            <td style={{ textAlign: 'right' }}>
              {/* Editar documento → precisa document.update */}
              <RequirePermission permissions={['document.update']}>
                <Link
                  style={{ marginRight: 8 }}
                  to={`/companies/${companyId}/establishments/${establishmentId}/documents/${d.id}/edit`}
                >
                  Edit
                </Link>
              </RequirePermission>

              {/* Upload de nova versão → precisa documentVersion.create */}
              <RequirePermission permissions={['documentVersion.create']}>
                <Link
                  style={{ marginRight: 8 }}
                  to={`/companies/${companyId}/establishments/${establishmentId}/documents/${d.id}/versions/new`}
                >
                  Upload Version
                </Link>
              </RequirePermission>

              {/* Delete → precisa document.delete */}
              <RequirePermission permissions={['document.delete']}>
                <button
                  type="button"
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
            <td colSpan={7} style={{ textAlign: 'center' }}>
              No documents
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
