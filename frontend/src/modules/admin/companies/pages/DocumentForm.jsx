import React, { useEffect, useState, useCallback } from 'react';
import {
  createDocument,
  getDocument,
  updateDocument,
  searchDocumentTypes,
} from '../api/documents';
import { useAuth } from '../../../auth/contexts/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import AutocompleteSelect from '../components/AutocompleteSelect.jsx';
import usePermission from '../../../auth/hooks/usePermission';

const DOCUMENT_STATUS = ['DRAFT', 'ACTIVE', 'INACTIVE'];

export default function DocumentForm({ mode = 'create' }) {
  const { accessToken } = useAuth();
  const { companyId, establishmentId, documentId } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    typeId: '',
    description: '',
    status: 'DRAFT',
  });
  const [selectedType, setSelectedType] = useState(null);

  const [error, setError] = useState('');
  const [loadingDoc, setLoadingDoc] = useState(mode === 'edit');

  // permissões
  const canCreate = usePermission('document.create');
  const canUpdate = usePermission('document.update');

  // ---- Modal de tipos de documento (tutorial) ----
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [typeModalItems, setTypeModalItems] = useState([]);
  const [typeModalLoading, setTypeModalLoading] = useState(false);
  const [typeModalKindFilter, setTypeModalKindFilter] = useState(''); // MAIN, EVIDENCE, etc ou ''

  useEffect(() => {
    if (mode === 'edit' && documentId && accessToken) {
      setLoadingDoc(true);
      getDocument(companyId, establishmentId, documentId, accessToken)
        .then((d) => {
          if (!d) return;
          setForm({
            name: d.name || '',
            typeId: d.typeId || '',
            description: d.description || '',
            status: d.status || 'DRAFT',
          });
          setSelectedType(d.type || null);
        })
        .catch(() => {
          setError('Failed to load document.');
        })
        .finally(() => setLoadingDoc(false));
    }
  }, [mode, companyId, establishmentId, documentId, accessToken]);

  // ---- Autocomplete de tipos de documento ----
  const fetchDocumentTypes = useCallback(
    async (query) => {
      if (!accessToken) return { items: [], total: 0 };

      const res = await searchDocumentTypes(query, accessToken, {
        pageSize: 50,
        kind: typeModalKindFilter || undefined, // respeita filtro se o usuário escolher algo
      });

      return {
        items: res?.items || [],
        total: res?.total || 0,
      };
    },
    [accessToken, typeModalKindFilter]
  );

  // ---- Abrir modal de tipos de documento (tutorial) ----
  const openTypeModal = useCallback(async () => {
    if (!accessToken) {
      setTypeModalOpen(true);
      setTypeModalItems([]);
      return;
    }
    setTypeModalOpen(true);
    setTypeModalLoading(true);
    try {
      const res = await searchDocumentTypes('', accessToken, {
        pageSize: 200,
      });
      setTypeModalItems(res?.items || []);
    } catch (e) {
      console.error('Failed to load document types for modal', e);
      setTypeModalItems([]);
    } finally {
      setTypeModalLoading(false);
    }
  }, [accessToken]);

  // ---- Filtro local de kind dentro do modal ----
  const filteredTypeModalItems = typeModalItems.filter((t) =>
    typeModalKindFilter ? t.kind === typeModalKindFilter : true
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // bloqueio por permissão
    if (mode === 'edit' && !canUpdate) {
      setError('You do not have permission to update documents.');
      return;
    }
    if (mode === 'create' && !canCreate) {
      setError('You do not have permission to create documents.');
      return;
    }

    if (!form.name.trim()) {
      setError('Name is required.');
      return;
    }
    if (!form.typeId) {
      setError('Document Type is required.');
      return;
    }

    try {
      if (mode === 'edit') {
        await updateDocument(
          companyId,
          establishmentId,
          documentId,
          {
            name: form.name.trim(),
            typeId: form.typeId,
            description: form.description || null,
            ...(DOCUMENT_STATUS.includes(form.status)
              ? { status: form.status }
              : {}),
          },
          accessToken
        );
      } else {
        await createDocument(
          companyId,
          establishmentId,
          {
            name: form.name.trim(),
            typeId: form.typeId,
            description: form.description || null,
          },
          accessToken
        );
      }

      navigate(
        `/companies/${companyId}/establishments/${establishmentId}/documents`
      );
    } catch (err) {
      console.error(err);
      setError('Failed to save.');
    }
  };

  const saveDisabled =
    (mode === 'edit' && !canUpdate) || (mode === 'create' && !canCreate);

  return (
    <div className="container">
      <h2>{mode === 'edit' ? 'Edit Document' : 'New Document'}</h2>
      {error && <div className="error-message">{error}</div>}
      {loadingDoc ? (
        <div>Loading…</div>
      ) : (
        <form className="form" onSubmit={handleSubmit}>
          <div className="grid-2">
            <div>
              <label>
                Name
                <input
                  placeholder="Document name"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  required
                />
              </label>
            </div>
            <div>
              <AutocompleteSelect
                label="Document Type"
                value={selectedType}
                onChange={(item) => {
                  setSelectedType(item || null);
                  setForm((f) => ({
                    ...f,
                    typeId: item?.id || '',
                  }));
                }}
                fetcher={fetchDocumentTypes}
                getKey={(it) => it.id}
                getLabel={(it) =>
                  `${it.name}${
                    it.kind ? ` (${it.kind.toLowerCase()})` : ''
                  }`
                }
                placeholder="Search document types..."
                minChars={0}
                disabled={!accessToken}
              />
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  alignItems: 'center',
                  marginTop: 4,
                  flexWrap: 'wrap',
                }}
              >
                <small style={{ color: '#666' }}>
                  Ex.: PGR, PCMSO, LTCAT, AET, PPP, evidências, laudos,
                  registros etc.
                </small>
                <button
                  type="button"
                  className="secondary"
                  onClick={openTypeModal}
                  style={{ marginLeft: 'auto' }}
                >
                  View all document types
                </button>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <label>
              Description
              <textarea
                rows={3}
                placeholder="Optional description (e.g. NR, scope, observations)..."
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </label>
          </div>

          {mode === 'edit' && (
            <div style={{ marginTop: 12 }}>
              <label>
                Status (read-only, controlled by versions)
                <input value={form.status} readOnly />
              </label>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button type="submit" disabled={saveDisabled}>
              Save
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => navigate(-1)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* ---------- Modal de tipos de documento (tutorial / picker) ---------- */}
      {typeModalOpen && (
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
              <h3 style={{ margin: 0 }}>Document Types</h3>
              <button
                type="button"
                className="secondary"
                onClick={() => setTypeModalOpen(false)}
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
              Use esta lista como tutorial para entender e escolher o
              tipo correto (PGR, PCMSO, LTCAT, AET, PPP, evidências,
              laudos, registros, treinamentos etc.). Clique em uma linha
              para selecionar o tipo.
            </div>

            {/* Filtro por kind dentro do modal */}
            <div
              style={{
                display: 'flex',
                gap: 8,
                marginBottom: 8,
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: 13, color: '#555' }}>
                Filter by kind:
              </span>
              <button
                type="button"
                className={
                  'secondary' +
                  (!typeModalKindFilter ? ' primary-outline' : '')
                }
                onClick={() => setTypeModalKindFilter('')}
              >
                All
              </button>
              <button
                type="button"
                className={
                  'secondary' +
                  (typeModalKindFilter === 'MAIN'
                    ? ' primary-outline'
                    : '')
                }
                onClick={() => setTypeModalKindFilter('MAIN')}
              >
                MAIN
              </button>
              <button
                type="button"
                className={
                  'secondary' +
                  (typeModalKindFilter === 'EVIDENCE'
                    ? ' primary-outline'
                    : '')
                }
                onClick={() => setTypeModalKindFilter('EVIDENCE')}
              >
                EVIDENCE
              </button>
              <button
                type="button"
                className={
                  'secondary' +
                  (typeModalKindFilter === 'SECONDARY'
                    ? ' primary-outline'
                    : '')
                }
                onClick={() => setTypeModalKindFilter('SECONDARY')}
              >
                SECONDARY
              </button>
              <button
                type="button"
                className={
                  'secondary' +
                  (typeModalKindFilter === 'OTHER'
                    ? ' primary-outline'
                    : '')
                }
                onClick={() => setTypeModalKindFilter('OTHER')}
              >
                OTHER
              </button>
            </div>

            <div
              style={{
                flex: 1,
                overflow: 'auto',
                border: '1px solid #eee',
                borderRadius: 4,
              }}
            >
              {typeModalLoading ? (
                <div style={{ padding: 12 }}>Loading types…</div>
              ) : (
                <table className="data-table" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Kind</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTypeModalItems.map((t) => (
                      <tr
                        key={t.id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          setSelectedType(t);
                          setForm((f) => ({ ...f, typeId: t.id }));
                          setTypeModalOpen(false);
                        }}
                      >
                        <td>{t.name}</td>
                        <td>{t.kind || '—'}</td>
                        <td>{t.description || '—'}</td>
                      </tr>
                    ))}
                    {!filteredTypeModalItems.length && (
                      <tr>
                        <td colSpan={3} style={{ textAlign: 'center' }}>
                          No document types found.
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
    </div>
  );
}
