// src/modules/companies/pages/EmployeeEditor.jsx
import React, { useMemo, useState } from 'react';
import { useAuth } from '../../../auth/contexts/AuthContext';
import AutocompleteSelect from '../../../../shared/components/AutocompleteSelect';
import { searchCBO } from '../api/catalog';

export default function EmployeeEditor({
  data = {},
  onSubmit,
  submitting = false,
  readOnly = false,
}) {
  const { accessToken } = useAuth();

  const [form, setForm] = useState({
    name: data.name || '',
    cpf: data.cpf || '',
    email: data.email || '',
    phone: data.phone || '',
    jobTitle: data.jobTitle || '',
  });

  const [cboObj, setCboObj] = useState(
    data.cboId && data.cboCode
      ? { id: data.cboId, code: data.cboCode, title: data.cboTitle }
      : null
  );

  function setVal(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      ...form,
      cboId: cboObj?.id || null,
    };
    onSubmit?.(payload);
  }

  const fetchCbo = useMemo(
    () => (q) => searchCBO(q, 1, 10, accessToken),
    [accessToken]
  );

  return (
    <form className="form" onSubmit={handleSubmit}>
      <div className="grid-2">
        <label>
          Name
          <input
            value={form.name}
            onChange={(e) => setVal('name', e.target.value)}
            disabled={readOnly}
          />
        </label>
        <label>
          CPF
          <input
            value={form.cpf}
            onChange={(e) => setVal('cpf', e.target.value)}
            disabled={readOnly}
          />
        </label>
      </div>

      <div className="grid-2">
        <label>
          Email
          <input
            type="email"
            value={form.email}
            onChange={(e) => setVal('email', e.target.value)}
            disabled={readOnly}
          />
        </label>
        <label>
          Phone
          <input
            value={form.phone}
            onChange={(e) => setVal('phone', e.target.value)}
            disabled={readOnly}
          />
        </label>
      </div>

      <div className="grid-2">
        <AutocompleteSelect
          label="CBO"
          value={cboObj}
          onChange={(item) => setCboObj(item)}
          fetcher={fetchCbo}
          getKey={(it) => it.id || it.code}
          getLabel={(it) => `${it.code} — ${it.title}`}
          placeholder="Type CBO code or title…"
          disabled={readOnly}
        />
        <label>
          Job title
          <input
            value={form.jobTitle}
            onChange={(e) => setVal('jobTitle', e.target.value)}
            disabled={readOnly}
          />
        </label>
      </div>

      {!readOnly && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={submitting}>
            Save
          </button>
        </div>
      )}
    </form>
  );
}
