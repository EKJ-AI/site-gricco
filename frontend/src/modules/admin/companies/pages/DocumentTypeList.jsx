import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../auth/contexts/AuthContext';
import RequirePermission from '../../../../shared/hooks/RequirePermission';
import { listDocumentTypes, deleteDocumentType } from '../api/documentTypes';
import { useToast, extractErrorMessage } from '../../../../shared/components/toast/ToastProvider';
import ConfirmModal from '../../../../shared/components/modals/ConfirmModal';

const KIND_LABEL = {
  MAIN: 'Documento principal',
  EVIDENCE: 'Evidência / Registro',
};

export default function DocumentTypeList() {
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [q, setQ] = useState('');
  const [data, setData] = useState({ items: [], total: 0, page: 1, pageSize: 20 });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // {id, name}
  const [deleting, setDeleting] = useState(false);

  const fetcher = useCallback(
    async (page = 1) => {
      if (!accessToken) return;
      setLoading(true);
      setErr('');
      try {
        const res = await listDocumentTypes({ page, pageSize: 20, q }, accessToken);
        const items = Array.isArray(res) ? res : res?.items || [];
        const total = res?.total ?? (Array.isArray(items) ? items.length : 0);
        setData({ items, total, page, pageSize: 20 });
      } catch (e) {
        console.error(e);
        const msg = 'Failed to load document types.';
        setErr(msg);
        toast.error(extractErrorMessage(e, msg), { title: 'Erro' });
        setData((old) => ({ ...old, items: [], total: 0, page }));
      } finally {
        setLoading(false);
      }
    },
    [q, accessToken, toast]
  );

  useEffect(() => {
    if (!accessToken) return;
    fetcher(1);
  }, [accessToken, q, fetcher]);

  const requestDelete = (t) => {
    setDeleteTarget({ id: t?.id, name: t?.name || 'Tipo de documento' });
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget?.id) {
      setDeleteModalOpen(false);
      return;
    }

    setDeleting(true);
    setErr('');
    try {
      await deleteDocumentType(deleteTarget.id, accessToken);
      toast.success('Tipo removido.', { title: 'OK' });
      setDeleteModalOpen(false);
      setDeleteTarget(null);
      fetcher(data.page);
    } catch (e) {
      console.error(e);
      const msg = 'Failed to delete document type.';
      setErr(msg);
      toast.error(extractErrorMessage(e, msg), { title: 'Erro' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <h2>Document Types</h2>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
        <input placeholder="Search document types..." value={q} onChange={(e) => setQ(e.target.value)} />
        <button onClick={() => fetcher(1)} disabled={loading}>
          Search
        </button>

        <RequirePermission permission="documentType.create">
          <button type="button" className="primary" onClick={() => navigate('/admin/document-types/new')}>
            New Document Type
          </button>
        </RequirePermission>
      </div>

      {err && <div className="error-message">{err}</div>}

      {loading ? (
        <div>Loading…</div>
      ) : (
        <>
          <table className="data-table" style={{ marginTop: 8 }}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Kind</th>
                <th>Description</th>
                <th style={{ width: 180 }}></th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((t) => (
                <tr key={t.id}>
                  <td>{t.name}</td>
                  <td>{KIND_LABEL[t.kind] || t.kind || '-'}</td>
                  <td>{t.description || '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <RequirePermission permission="documentType.update">
                      <Link style={{ marginRight: 8 }} to={`/admin/document-types/${t.id}/edit`}>
                        Edit
                      </Link>
                    </RequirePermission>

                    <RequirePermission permission="documentType.delete">
                      <button type="button" onClick={() => requestDelete(t)} disabled={deleting}>
                        Delete
                      </button>
                    </RequirePermission>
                  </td>
                </tr>
              ))}

              {!data.items.length && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center' }}>
                    No document types.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {data.total > data.pageSize && (
            <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
              <button type="button" disabled={data.page <= 1 || loading} onClick={() => fetcher(data.page - 1)}>
                Prev
              </button>
              <span>
                Page {data.page} / {Math.ceil(data.total / data.pageSize)}
              </span>
              <button
                type="button"
                disabled={data.page * data.pageSize >= data.total || loading}
                onClick={() => fetcher(data.page + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      <ConfirmModal
        open={deleteModalOpen}
        title="Excluir tipo de documento"
        message={deleteTarget?.name ? `Confirmar exclusão do tipo: "${deleteTarget.name}"?` : 'Confirmar exclusão?'}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        loading={deleting}
        onCancel={() => {
          if (deleting) return;
          setDeleteModalOpen(false);
          setDeleteTarget(null);
        }}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
