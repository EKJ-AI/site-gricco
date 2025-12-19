import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../auth/contexts/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import { createDocumentType, getDocumentType, updateDocumentType } from '../api/documentTypes';
import { useToast, extractErrorMessage } from '../../../../shared/components/toast/ToastProvider';

const KIND_OPTIONS = [
  { value: 'MAIN', label: 'Documento principal' },
  { value: 'EVIDENCE', label: 'Evidência / Registro' },
];

export default function DocumentTypeForm({ mode = 'create' }) {
  const { accessToken } = useAuth();
  const { documentTypeId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState({ name: '', description: '', kind: 'MAIN' });
  const [loading, setLoading] = useState(mode === 'edit');
  const [saving, setSaving] = useState(false);
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
        .catch((e) => {
          const msg = 'Failed to load document type.';
          setError(msg);
          toast.error(extractErrorMessage(e, msg), { title: 'Erro' });
        })
        .finally(() => setLoading(false));
    }
  }, [mode, documentTypeId, accessToken, toast]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) {
      const msg = 'Name is required.';
      setError(msg);
      toast.warning(msg, { title: 'Obrigatório' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description || null,
        kind: form.kind || 'MAIN',
      };

      if (mode === 'edit' && documentTypeId) {
        await updateDocumentType(documentTypeId, payload, accessToken);
        toast.success('Tipo de documento atualizado.', { title: 'OK' });
      } else {
        await createDocumentType(payload, accessToken);
        toast.success('Tipo de documento criado.', { title: 'OK' });
      }

      navigate('/admin/document-types');
    } catch (e2) {
      console.error(e2);
      const msg = 'Failed to save document type.';
      setError(msg);
      toast.error(extractErrorMessage(e2, msg), { title: 'Erro' });
    } finally {
      setSaving(false);
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
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </label>
            </div>

            <div>
              <label>
                Kind
                <select
                  value={form.kind}
                  onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))}
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
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </label>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => navigate('/admin/document-types')}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
