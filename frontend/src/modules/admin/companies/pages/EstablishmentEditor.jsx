// src/modules/companies/pages/EstablishmentEditor.jsx
import React, { useEffect, useState } from 'react';
import CnaeMultiInput from '../components/CnaeMultiInput.jsx';

export default function EstablishmentEditor({
  data = {},
  onSubmit,
  submitting = false,
  readOnly = false,
}) {
  const [form, setForm] = useState({
    nickname: data.nickname || '',
    cnpj: data.cnpj || '',
    isHeadquarter: !!data.isHeadquarter,
    street: data.street || '',
    number: data.number || '',
    complement: data.complement || '',
    district: data.district || '',
    city: data.city || '',
    state: data.state || '',
    zipCode: data.zipCode || '',
  });

  const [cnaes, setCnaes] = useState(() => {
    if (!data?.cnaes) return [];
    return (data.cnaes || [])
      .map((e) => ({
        code: e?.cnae?.code,
        title: e?.cnae?.title,
        riskLevel: e?.riskLevel ?? null,
      }))
      .filter((x) => x.code);
  });

  useEffect(() => {
    setForm({
      nickname: data.nickname || '',
      cnpj: data.cnpj || '',
      isHeadquarter: !!data.isHeadquarter,
      street: data.street || '',
      number: data.number || '',
      complement: data.complement || '',
      district: data.district || '',
      city: data.city || '',
      state: data.state || '',
      zipCode: data.zipCode || '',
    });

    if (data?.cnaes) {
      setCnaes(
        (data.cnaes || [])
          .map((e) => ({
            code: e?.cnae?.code,
            title: e?.cnae?.title,
            riskLevel: e?.riskLevel ?? null,
          }))
          .filter((x) => x.code)
      );
    } else {
      setCnaes([]);
    }
  }, [data]);

  function setVal(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      cnaes,
    };
    onSubmit?.(payload);
  };

  const computedMainCnae = data?.mainCnae || null;
  const computedRiskLevel = data?.riskLevel ?? null;

  return (
    <form className="form" onSubmit={handleSubmit}>
      <h3>{data?.id ? 'Edit Establishment' : 'New Establishment'}</h3>

      <div className="grid-2">
        <label>
          Nickname
          <input
            value={form.nickname}
            onChange={(e) => setVal('nickname', e.target.value)}
            disabled={readOnly}
          />
        </label>
        <label>
          CNPJ
          <input
            value={form.cnpj}
            onChange={(e) => setVal('cnpj', e.target.value)}
            disabled={readOnly}
          />
        </label>
      </div>

      <div className="grid-3">
        <label>
          City
          <input
            value={form.city}
            onChange={(e) => setVal('city', e.target.value)}
            disabled={readOnly}
          />
        </label>
        <label>
          State
          <input
            value={form.state}
            onChange={(e) => setVal('state', e.target.value)}
            disabled={readOnly}
          />
        </label>
        <label>
          Zip Code
          <input
            value={form.zipCode}
            onChange={(e) => setVal('zipCode', e.target.value)}
            disabled={readOnly}
          />
        </label>
      </div>

      <CnaeMultiInput value={cnaes} onChange={setCnaes} disabled={readOnly} />

      {(computedMainCnae || computedRiskLevel != null) && (
        <div className="card" style={{ padding: 12, marginTop: 8 }}>
          <div>
            <b>Main CNAE (calculado):</b> {computedMainCnae || '—'}
          </div>
          <div>
            <b>Risk level (calculado):</b> {computedRiskLevel ?? '—'}
          </div>
          <small>
            Esses valores são atualizados pelo servidor conforme os CNAEs e
            riscos informados acima.
          </small>
        </div>
      )}

      {!readOnly && (
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button type="submit" disabled={submitting}>
            Save
          </button>
        </div>
      )}
    </form>
  );
}
