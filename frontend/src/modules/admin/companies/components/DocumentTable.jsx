import React, { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import RequirePermission from '../../../../shared/hooks/RequirePermission';
import { useAuth } from '../../../auth/contexts/AuthContext';
import {
  buildDocumentFileUrl,
  fetchDocumentAccessLog,
} from '../api/documents';

function getCategoryLabel(type) {
  if (!type?.kind) return '-';
  if (type.kind === 'MAIN') return 'Documento principal';
  if (type.kind === 'EVIDENCE') return 'Evidência / Registro';
  return '-';
}

export default function DocumentTable({ rows = [], onDelete }) {
  const { companyId, establishmentId } = useParams();
  const { accessToken } = useAuth();

  // ----- filtros por coluna -----
  const [nameFilter, setNameFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // DRAFT / ACTIVE / INACTIVE
  const [versionFilter, setVersionFilter] = useState('');
  const [evidencesFilter, setEvidencesFilter] = useState('');
  const [fileFilter, setFileFilter] = useState(''); // '', 'with', 'without'

  // ----- Modal de registros (logs de acesso) -----
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [logModalLoading, setLogModalLoading] = useState(false);
  const [logModalError, setLogModalError] = useState('');
  const [logModalDocument, setLogModalDocument] = useState(null);
  const [logModalItems, setLogModalItems] = useState([]);

  const filteredRows = useMemo(() => {
    const norm = (v) => String(v || '').toLowerCase();

    return rows.filter((d) => {
      const name = norm(d.name);
      const typeName = norm(d.type?.name);
      const categoryLabel = norm(getCategoryLabel(d.type));
      const status = String(d.status || '');
      const versionLabel =
        d.currentVersion?.versionNumber != null
          ? `v${d.currentVersion.versionNumber}`
          : '-';
      const evidencesCount = d.evidencesCount ?? 0;
      const hasPublishedFile =
        !!d.currentVersion && !!d.currentVersion.storagePath;

      if (nameFilter && !name.includes(norm(nameFilter))) return false;
      if (typeFilter && !typeName.includes(norm(typeFilter))) return false;
      if (
        categoryFilter &&
        !categoryLabel.includes(norm(categoryFilter))
      ) {
        return false;
      }
      if (statusFilter && status !== statusFilter) return false;
      if (
        versionFilter &&
        !versionLabel.toLowerCase().includes(norm(versionFilter))
      ) {
        return false;
      }
      if (evidencesFilter) {
        const parsed = parseInt(evidencesFilter, 10);
        if (!Number.isNaN(parsed)) {
          if (evidencesCount !== parsed) return false;
        } else {
          if (
            !String(evidencesCount)
              .toLowerCase()
              .includes(norm(evidencesFilter))
          ) {
            return false;
          }
        }
      }
      if (fileFilter === 'with' && !hasPublishedFile) return false;
      if (fileFilter === 'without' && hasPublishedFile) return false;

      return true;
    });
  }, [
    rows,
    nameFilter,
    typeFilter,
    categoryFilter,
    statusFilter,
    versionFilter,
    evidencesFilter,
    fileFilter,
  ]);

  // -------- Abrir modal de registros --------
  const openLogModal = async (doc) => {
    if (!accessToken || !companyId || !establishmentId) return;

    setLogModalDocument(doc);
    setLogModalOpen(true);
    setLogModalLoading(true);
    setLogModalError('');
    setLogModalItems([]);

    try {
      const data = await fetchDocumentAccessLog(
        companyId,
        establishmentId,
        doc.id,
        accessToken,
      );

      setLogModalItems(data.items || []);
    } catch (err) {
      console.error('Failed to load document access log', err);
      setLogModalError('Failed to load access log for this document.');
    } finally {
      setLogModalLoading(false);
    }
  };

  const formatDateTime = (value) => {
    if (!value) return '—';
    try {
      const d = new Date(value);
      // ajusta para o padrão mais amigável pt-BR
      return d.toLocaleString('pt-BR');
    } catch {
      return String(value);
    }
  };

  return (
    <>
      <table className="data-table" style={{ marginTop: 8 }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Category</th>
            <th>Status</th>
            <th>Current Version</th>
            <th>Evidences</th>
            <th>Published file</th>
            <th></th>
          </tr>

          {/* linha de filtros por coluna */}
          <tr>
            {/* Name */}
            <th>
              <input
                style={{ width: '100%' }}
                placeholder="Filter name..."
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
              />
            </th>

            {/* Type */}
            <th>
              <input
                style={{ width: '100%' }}
                placeholder="Filter type..."
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              />
            </th>

            {/* Category */}
            <th>
              <input
                style={{ width: '100%' }}
                placeholder="Filter category..."
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              />
            </th>

            {/* Status */}
            <th>
              <select
                style={{ width: '100%' }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All</option>
                <option value="DRAFT">DRAFT</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </th>

            {/* Current Version */}
            <th>
              <input
                style={{ width: '100%' }}
                placeholder="e.g. v1, v2..."
                value={versionFilter}
                onChange={(e) => setVersionFilter(e.target.value)}
              />
            </th>

            {/* Evidences */}
            <th>
              <input
                style={{ width: '100%' }}
                placeholder="Qty..."
                value={evidencesFilter}
                onChange={(e) => setEvidencesFilter(e.target.value)}
              />
            </th>

            {/* Published file (com/sem arquivo) */}
            <th>
              <select
                style={{ width: '100%' }}
                value={fileFilter}
                onChange={(e) => setFileFilter(e.target.value)}
              >
                <option value="">All</option>
                <option value="with">With file</option>
                <option value="without">No file</option>
              </select>
            </th>

            {/* Ações */}
            <th></th>
          </tr>
        </thead>
        <tbody>
          {filteredRows.map((d) => {
            const categoryLabel = getCategoryLabel(d.type);
            const versionLabel =
              d.currentVersion?.versionNumber != null
                ? `v${d.currentVersion.versionNumber}`
                : '-';

            const hasPublishedFile =
              !!d.currentVersion && !!d.currentVersion.storagePath;

            const publishedViewUrl =
              hasPublishedFile &&
              companyId &&
              establishmentId &&
              d.currentVersion?.id &&
              accessToken
                ? buildDocumentFileUrl(
                    companyId,
                    establishmentId,
                    d.id,
                    d.currentVersion.id,
                    'view',
                    accessToken,
                  )
                : null;

            return (
              <tr key={d.id}>
                <td>
                  <Link
                    to={`/companies/${companyId}/establishments/${establishmentId}/documents/${d.id}`}
                  >
                    {d.name}
                  </Link>
                </td>
                <td>{d.type?.name || '-'}</td>
                <td>{categoryLabel}</td>
                <td>{d.status}</td>
                <td>{versionLabel}</td>
                <td>{d.evidencesCount ?? 0}</td>

                {/* Published file + botão Registros */}
                <td>
                  {hasPublishedFile && publishedViewUrl ? (
                    <div
                      style={{
                        display: 'flex',
                        gap: 8,
                        alignItems: 'center',
                        flexWrap: 'wrap',
                      }}
                    >
                      {/* 📌 Botão "Registros" – só quem tem document.log vê */}
                      <RequirePermission permissions={['document.log']}>
                        <button
                          type="button"
                          onClick={() => openLogModal(d)}
                        >
                          Registros
                        </button>
                      </RequirePermission>

                      {/* Botão/Link "View" – document.view */}
                      <RequirePermission permissions={['document.view']}>
                        <a
                          href={publishedViewUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          View
                        </a>
                      </RequirePermission>
                    </div>
                  ) : (
                    '—'
                  )}
                </td>

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
            );
          })}
          {!filteredRows.length && (
            <tr>
              <td colSpan={8} style={{ textAlign: 'center' }}>
                No documents
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* ---------- Modal de Registros / Logs de acesso ---------- */}
      {logModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 8,
              padding: 16,
              width: '90%',
              maxWidth: 900,
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <h3 style={{ margin: 0 }}>
                Access log{logModalDocument ? ` — ${logModalDocument.name}` : ''}
              </h3>
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setLogModalOpen(false);
                  setLogModalDocument(null);
                  setLogModalItems([]);
                  setLogModalError('');
                }}
              >
                Close
              </button>
            </div>

            <div
              style={{
                fontSize: 13,
                marginBottom: 8,
                color: '#555',
              }}
            >
              Registros de visualização, download e upload associados a este
              documento. Útil para demonstrar rastreabilidade de quem acessou
              os documentos de SST.
            </div>

            {logModalError && (
              <div
                style={{
                  marginBottom: 8,
                  padding: 8,
                  borderRadius: 4,
                  backgroundColor: '#ffe5e5',
                  color: '#a00',
                  fontSize: 13,
                }}
              >
                {logModalError}
              </div>
            )}

            <div
              style={{
                flex: 1,
                overflow: 'auto',
                border: '1px solid #eee',
                borderRadius: 4,
              }}
            >
              {logModalLoading ? (
                <div style={{ padding: 12 }}>Loading access log…</div>
              ) : (
                <table className="data-table" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Email</th>
                      <th>VIEW</th>
                      <th>DOWNLOAD</th>
                      <th>UPLOAD</th>
                      <th>Total</th>
                      <th>Last access</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logModalItems.map((item, idx) => {
                      const name =
                        item.userName ||
                        (item.userId ? `User #${item.userId}` : 'Anonymous / Guest');
                      const email = item.userEmail || '—';
                      const viewCount = item.counts?.VIEW ?? 0;
                      const downloadCount = item.counts?.DOWNLOAD ?? 0;
                      const uploadCount = item.counts?.UPLOAD ?? 0;
                      const total = item.total ?? (viewCount + downloadCount + uploadCount);

                      return (
                        <tr key={item.userId ?? `row-${idx}`}>
                          <td>{name}</td>
                          <td>{email}</td>
                          <td>{viewCount}</td>
                          <td>{downloadCount}</td>
                          <td>{uploadCount}</td>
                          <td>{total}</td>
                          <td>{formatDateTime(item.lastAccessAt)}</td>
                        </tr>
                      );
                    })}
                    {!logModalItems.length && !logModalLoading && (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center' }}>
                          No access records for this document.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
