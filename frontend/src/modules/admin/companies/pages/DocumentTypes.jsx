// src/modules/companies/pages/DocumentTypes.jsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../auth/contexts/AuthContext';
import ProtectedRoute from '../../../../shared/components/ProtectedRoute';
import {
  listDocumentTypes,
  createDocumentType,
  updateDocumentType,
  deleteDocumentType,
} from '../api/documentTypes';
import Pagination from '../components/Pagination.jsx';

export default function DocumentTypes() {
  const { accessToken } = useAuth();

  const [q, setQ] = useState('');
  const [data, setData] = useState({
    items: [],
    total: 0,
    page: 1,
    pageSize: 20,
  });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  const [editing, setEditing] = useState(null); // objeto DocumentType ou null
  const [form, setForm] = useState({ name: '', description: '' });

  const fetcher = async (page = 1) => {
    if (!accessToken) return;
    setLoading(true);
    setErr('');
    try {
      const res = await listDocumentTypes(
        { page, pageSize: 20, q },
        accessToken
      );
      const items = res?.items || [];
      const total = res?.total ?? 0;
      const serverPage = res?.page ?? page;
      const serverPageSize = res?.pageSize ?? 20;
      setData({ items, total, page: serverPage, pageSize: serverPageSize });
    } catch (e) {
      setErr('Failed to load document types.');
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
    setForm({
      name: item.name || '',
      description: item.description || '',
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      setErr('Name is required.');
      return;
    }
    setErr('');
    setSaving(true);
    try {
      if (editing) {
        await updateDocumentType(
          editing.id,
          {
            name: form.name.trim(),
            description: form.description || null,
          },
          accessToken
        );
      } else {
        await createDocumentType(
          {
            name: form.name.trim(),
            description: form.description || null,
          },
          accessToken
        );
      }
      startNew();
      fetcher(data.page);
    } catch (e) {
      if (e?.response?.status === 409) {
        setErr('There is already a document type with this name.');
      } else {
        setErr('Failed to save document type.');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Confirm delete this document type?')) return;
    setErr('');
    try {
      await deleteDocumentType(id, accessToken);
      fetcher(data.page);
    } catch {
      setErr('Failed to delete document type.');
    }
  }

  return (
    <div className="container">
      <h2>Document Types</h2>

      {err && <div className="error-message">{err}</div>}

      <div
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          marginBottom: 8,
          flexWrap: 'wrap',
        }}
      >
        <input
          placeholder="Search document types..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button onClick={() => fetcher(1)}>Search</button>
        <ProtectedRoute inline permissions={['documentType.create']}>
          <button type="button" onClick={startNew}>
            New Type
          </button>
        </ProtectedRoute>
      </div>

      <ProtectedRoute inline permissions={['documentType.create', 'documentType.update']}>
        <form className="form" onSubmit={handleSubmit} style={{ marginBottom: 16 }}>
          <h3>{editing ? 'Edit Document Type' : 'New Document Type'}</h3>
          <div className="grid-2">
            <div>
              <label>
                Name
                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  required
                />
              </label>
            </div>
            <div>
              <label>
                Description
                <input
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder="Optional"
                />
              </label>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            {editing && (
              <button
                type="button"
                className="secondary"
                onClick={startNew}
              >
                Cancel edit
              </button>
            )}
          </div>
        </form>
      </ProtectedRoute>

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
                  <td>
                    {t.createdAt
                      ? new Date(t.createdAt).toLocaleString()
                      : '—'}
                  </td>
                  <td>
                    {t.updatedAt
                      ? new Date(t.updatedAt).toLocaleString()
                      : '—'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <ProtectedRoute
                      inline
                      permissions={['documentType.update']}
                    >
                      <button
                        type="button"
                        style={{ marginRight: 8 }}
                        onClick={() => startEdit(t)}
                      >
                        Edit
                      </button>
                    </ProtectedRoute>
                    <ProtectedRoute
                      inline
                      permissions={['documentType.delete']}
                    >
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => handleDelete(t.id)}
                      >
                        Delete
                      </button>
                    </ProtectedRoute>
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

          <Pagination
            page={data.page}
            pageSize={data.pageSize}
            total={data.total}
            onChange={(p) => fetcher(p)}
          />
        </>
      )}
    </div>
  );
}
