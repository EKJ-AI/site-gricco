// src/pages/admin/translations/I18nWizardNav.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCultures } from '../../../api/translations';

const steps = [
  { id: 0, path: '/admin/translations/cultures', label: '1) Culturas' },
  { id: 1, path: '/admin/translations/labels', label: '2) Labels' },
  { id: 2, path: '/admin/translations/translates', label: '3) Traduzir faltantes' },
];

export default function I18nWizardNav({ current }) {
  const nav = useNavigate();
  const [culturesCount, setCulturesCount] = useState(0);

  useEffect(() => {
    (async () => {
      const list = await fetchCultures('');
      setCulturesCount(Array.isArray(list) ? list.length : 0);
    })();
  }, []);

  const canGoNextFrom = (idx) => {
    if (idx === 0) return culturesCount >= 1; // precisa existir ao menos 1 cultura para ir a Labels
    if (idx === 1) return culturesCount >= 2; // idealmente 2+ para traduzir entre idiomas
    return true;
  };

  const goPrev = () => {
    if (current <= 0) return;
    nav(steps[current - 1].path);
  };
  const goNext = () => {
    if (current >= steps.length - 1) return;
    if (!canGoNextFrom(current)) return;
    nav(steps[current + 1].path);
  };

  return (
    <div className="flex items-center justify-between border rounded p-2 bg-white">
      <div className="flex gap-2 text-sm">
        {steps.map((s, i) => (
          <button
            key={s.id}
            onClick={() => nav(s.path)}
            className={
              'px-2 py-1 rounded ' +
              (i === current ? 'bg-blue-600 text-white' : 'bg-gray-100')
            }
            title={s.label}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={goPrev}
          className="px-3 py-1 border rounded"
          disabled={current <= 0}
        >
          ◀ Voltar
        </button>
        <button
          onClick={goNext}
          className="px-3 py-1 text-white rounded disabled:opacity-60"
          disabled={current >= steps.length - 1 || !canGoNextFrom(current)}
          style={{ background: '#16a34a' }}
          title={
            current === 0 && culturesCount < 1
              ? 'Crie pelo menos 1 cultura para avançar'
              : current === 1 && culturesCount < 2
              ? 'Cadastre pelo menos 2 culturas para traduzir entre idiomas'
              : 'Avançar'
          }
        >
          Avançar ▶
        </button>
      </div>
    </div>
  );
}
