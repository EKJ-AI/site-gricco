// src/modules/admin/companies/pages/DocumentTypeForm.jsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../auth/contexts/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import {
  createDocumentType,
  getDocumentType,
  updateDocumentType,
} from '../api/documentTypes';

const KIND_OPTIONS = [
  { value: 'MAIN', label: 'Documento principal' },
  { value: 'EVIDENCE', label: 'Evidência / Registro' },
];

export default function DocumentTypeForm({ mode = 'create' }) {
  const { accessToken } = useAuth();
  const { documentTypeId } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    description: '',
    kind: 'MAIN',
  });
  const [loading, setLoading] = useState(mode === 'edit');
  const [error, setError] = useState('');

  useEffect(() => {
    if (mode === 'edit' && documentTypeId && accessToken) {
      setLoading(true);
      getDocumentType(documentTypeId, accessToken)
        .then((dt) => {
          if (!dt) return;
          setForm({
            name: dt.name || '',
            description: dt.description || '',
            kind: dt.kind || 'MAIN',
          });
        })
        .catch(() => setError('Failed to load document type.'))
        .finally(() => setLoading(false));
    }
  }, [mode, documentTypeId, accessToken]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) {
      setError('Name is required.');
      return;
    }

    try {
      const payload = {
        name: form.name.trim(),
        description: form.description || null,
        kind: form.kind || 'MAIN',
      };

      if (mode === 'edit' && documentTypeId) {
        await updateDocumentType(documentTypeId, payload, accessToken);
      } else {
        await createDocumentType(payload, accessToken);
      }

      navigate('/admin/document-types');
    } catch (e) {
      console.error(e);
      setError('Failed to save document type.');
    }
  };

  return (
    <div className="container">
      <h2>{mode === 'edit' ? 'Edit Document Type' : 'New Document Type'}</h2>
      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div>Loading…</div>
      ) : (
        <form className="form" onSubmit={submit}>
          <div className="grid-2">
            <div>
              <label>
                Name
                <input
                  type="text"
                  placeholder="Ex.: PGR – Programa de Gerenciamento de Riscos"
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
                Kind
                <select
                  value={form.kind}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, kind: e.target.value }))
                  }
                >
                  {KIND_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
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

          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button type="submit">Save</button>
            <button
              type="button"
              className="secondary"
              onClick={() => navigate('/admin/document-types')}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
