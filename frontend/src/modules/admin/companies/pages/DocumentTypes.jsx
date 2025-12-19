import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../auth/contexts/AuthContext';
import RequirePermission from '../../../../shared/hooks/RequirePermission';
import {
  listDocumentTypes,
  createDocumentType,
  updateDocumentType,
  deleteDocumentType,
} from '../api/documentTypes';
import Pagination from '../components/Pagination.jsx';
import { useToast, extractErrorMessage } from '../../../../shared/components/toast/ToastProvider';
import ConfirmModal from '../../../../shared/components/modals/ConfirmModal.jsx';

export default function DocumentTypes() {
  const { accessToken } = useAuth();
  const toast = useToast();

  const [q, setQ] = useState('');
  const [data, setData] = useState({ items: [], total: 0, page: 1, pageSize: 20 });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '' });

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // {id, name}
  const [deleting, setDeleting] = useState(false);

  const fetcher = async (page = 1) => {
    if (!accessToken) return;
    setLoading(true);
    setErr('');
    try {
      const res = await listDocumentTypes({ page, pageSize: 20, q }, accessToken);
      const items = res?.items || [];
      const total = res?.total ?? 0;
      const serverPage = res?.page ?? page;
      const serverPageSize = res?.pageSize ?? 20;
      setData({ items, total, page: serverPage, pageSize: serverPageSize });
    } catch (e) {
      const msg = 'Failed to load document types.';
      setErr(msg);
      toast.error(extractErrorMessage(e, msg), { title: 'Erro' });
      setData((old) => ({ ...old, items: [], total: 0, page }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetcher(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, q]);

  function startNew() {
    setEditing(null);
    setForm({ name: '', description: '' });
  }

  function startEdit(item) {
    setEditing(item);
    setForm({ name: item.name || '', description: item.description || '' });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      const msg = 'Name is required.';
      setErr(msg);
      toast.warning(msg, { title: 'Obrigatório' });
      return;
    }

    setErr('');
    setSaving(true);
    try {
      if (editing) {
        await updateDocumentType(
          editing.id,
          { name: form.name.trim(), description: form.description || null },
          accessToken
        );
        toast.success('Tipo atualizado.', { title: 'OK' });
      } else {
        await createDocumentType(
          { name: form.name.trim(), description: form.description || null },
          accessToken
        );
        toast.success('Tipo criado.', { title: 'OK' });
      }

      startNew();
      fetcher(data.page);
    } catch (e2) {
      if (e2?.response?.status === 409) {
        const msg = 'There is already a document type with this name.';
        setErr(msg);
        toast.warning(msg, { title: 'Conflito' });
      } else {
        const msg = 'Failed to save document type.';
        setErr(msg);
        toast.error(extractErrorMessage(e2, msg), { title: 'Erro' });
      }
    } finally {
      setSaving(false);
    }
  }

  function requestDelete(item) {
    setDeleteTarget({ id: item?.id, name: item?.name || 'Tipo' });
    setDeleteModalOpen(true);
  }

  async function confirmDelete() {
    if (!deleteTarget?.id) {
      setDeleteModalOpen(false);
      return;
    }

    setErr('');
    setDeleting(true);
    try {
      await deleteDocumentType(deleteTarget.id, accessToken);
      toast.success('Tipo removido.', { title: 'OK' });
      setDeleteModalOpen(false);
      setDeleteTarget(null);
      fetcher(data.page);
    } catch (e) {
      const msg = 'Failed to delete document type.';
      setErr(msg);
      toast.error(extractErrorMessage(e, msg), { title: 'Erro' });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="container">
      <h2>Document Types</h2>

      {err && <div className="error-message">{err}</div>}

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
        <input placeholder="Search document types..." value={q} onChange={(e) => setQ(e.target.value)} />
        <button onClick={() => fetcher(1)} disabled={loading}>
          Search
        </button>

        <RequirePermission permission="documentType.create">
          <button type="button" onClick={startNew} disabled={saving || deleting}>
            New Type
          </button>
        </RequirePermission>
      </div>

      <RequirePermission permission={['documentType.create', 'documentType.update']}>
        <form className="form" onSubmit={handleSubmit} style={{ marginBottom: 16 }}>
          <h3>{editing ? 'Edit Document Type' : 'New Document Type'}</h3>

          <div className="grid-2">
            <div>
              <label>
                Name
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  disabled={saving}
                />
              </label>
            </div>

            <div>
              <label>
                Description
                <input
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Optional"
                  disabled={saving}
                />
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>

            {editing && (
              <button type="button" className="secondary" onClick={startNew} disabled={saving}>
                Cancel edit
              </button>
            )}
          </div>
        </form>
      </RequirePermission>

      {loading ? (
        <div>Loading…</div>
      ) : (
        <>
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Created at</th>
                <th>Updated at</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((t) => (
                <tr key={t.id}>
                  <td>{t.name}</td>
                  <td>{t.description || '—'}</td>
                  <td>{t.createdAt ? new Date(t.createdAt).toLocaleString() : '—'}</td>
                  <td>{t.updatedAt ? new Date(t.updatedAt).toLocaleString() : '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <RequirePermission permission="documentType.update">
                      <button
                        type="button"
                        style={{ marginRight: 8 }}
                        onClick={() => startEdit(t)}
                        disabled={saving || deleting}
                      >
                        Edit
                      </button>
                    </RequirePermission>

                    <RequirePermission permission="documentType.delete">
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => requestDelete(t)}
                        disabled={saving || deleting}
                      >
                        Delete
                      </button>
                    </RequirePermission>
                  </td>
                </tr>
              ))}

              {!data.items.length && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center' }}>
                    No document types found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={(p) => fetcher(p)} />
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
