// src/modules/companies/components/CnaeMultiInput.jsx
import React, { useEffect, useMemo, useState } from 'react';
import api from '../../../../api/axios';
import { useAuth } from '../../../auth/contexts/AuthContext';

/**
 * Props:
 *  value: [{ code, title?, riskLevel? }]
 *  onChange: (newArray) => void
 *  disabled?: boolean
 */
export default function CnaeMultiInput({ value = [], onChange, disabled }) {
  const { accessToken } = useAuth();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    let active = true;

    const run = async () => {
      if (!query?.trim()) {
        if (active) setSuggestions([]);
        return;
      }

      try {
        const res = await api.get(
          `/api/catalogs/cnaes?q=${encodeURIComponent(query)}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        if (active) setSuggestions(res.data?.data || res.data?.items || []);
      } catch {
        if (active) setSuggestions([]);
      }
    };

    run();
    return () => {
      active = false;
    };
  }, [query, accessToken]);

  const addCnae = (c) => {
    if (!c?.code) return;
    if ((value || []).some((x) => x.code === c.code)) return;

    onChange([
      ...(value || []),
      { code: c.code, title: c.title || '', riskLevel: null },
    ]);

    setQuery('');
    setSuggestions([]);
  };

  const remove = (code) => {
    onChange((value || []).filter((x) => x.code !== code));
  };

  const updateRisk = (code, risk) => {
    const r = Number.isFinite(+risk) ? +risk : null;
    onChange(
      (value || []).map((x) =>
        x.code === code ? { ...x, riskLevel: r } : x
      )
    );
  };

  const principal = useMemo(() => {
    const withRisk = (value || []).filter((x) => x.riskLevel != null);
    if (withRisk.length === 0) return value?.[0]?.code || null;

    const max = Math.max(...withRisk.map((x) => x.riskLevel));
    const candidates = withRisk
      .filter((x) => x.riskLevel === max)
      .sort((a, b) => a.code.localeCompare(b.code));

    return candidates[0]?.code || null;
  }, [value]);

  return (
    <div className="card" style={{ padding: 12 }}>
      <label>CNAEs (múltiplos) &amp; grau de risco</label>

      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input
          placeholder="Buscar CNAE por código ou título…"
          value={query}
          disabled={disabled}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {suggestions.length > 0 && (
        <div
          className="list"
          style={{
            border: '1px solid #ddd',
            borderRadius: 8,
            marginBottom: 8,
          }}
        >
          {suggestions.map((s) => (
            <div
              key={s.id ?? s.code}
              className="list-item"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '6px 10px',
              }}
            >
              <div>
                <b>{s.code}</b> — {s.title}
              </div>
              <button type="button" onClick={() => addCnae(s)}>
                Adicionar
              </button>
            </div>
          ))}
        </div>
      )}

      {(value || []).length === 0 ? (
        <div style={{ color: '#666' }}>Nenhum CNAE selecionado.</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Título</th>
              <th>Risco (1..4)</th>
              <th>Principal?</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(value || []).map((row) => (
              <tr key={row.code}>
                <td>{row.code}</td>
                <td>{row.title || '-'}</td>
                <td style={{ width: 120 }}>
                  <input
                    type="number"
                    min={1}
                    max={4}
                    value={row.riskLevel ?? ''}
                    onChange={(e) => updateRisk(row.code, e.target.value)}
                    placeholder="1..4"
                  />
                </td>
                <td>{principal === row.code ? 'SIM' : '—'}</td>
                <td>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => remove(row.code)}
                  >
                    Remover
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <small>
        O sistema define automaticamente o <b>principal</b> como o CNAE com
        maior risco. Empate: menor código.
      </small>
    </div>
  );
}
