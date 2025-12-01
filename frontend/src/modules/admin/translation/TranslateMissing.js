import React, { useEffect, useMemo, useState } from 'react';
import {
  fetchCultures,
  createTranslation,
  fetchPublicDict,
} from '../../../api/translations';
import I18nWizardNav from '../components/I18nWizardNav';

function TextArea({ value, onChange, ...rest }) {
  return (
    <textarea
      className="border rounded px-2 py-1 w-full min-h-[80px]"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      {...rest}
    />
  );
}
function Select({ value, onChange, options }) {
  return (
    <select
      className="border rounded px-2 py-1"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export default function TranslateMissing() {
  const [cultures, setCultures] = useState([]);
  const [source, setSource] = useState('pt-BR');
  const [target, setTarget] = useState('en-US');
  const [loading, setLoading] = useState(false);

  const [missing, setMissing] = useState([]); // [{ key, sourceText, targetText }]
  const [filter, setFilter] = useState('');

  // Import JSON modal
  const [showImport, setShowImport] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [importOnlyMissing, setImportOnlyMissing] = useState(true);
  const [importPreview, setImportPreview] = useState(null); // { total, willCreate: [{key, text}] }
  const [importRunning, setImportRunning] = useState(false);
  const [importProgress, setImportProgress] = useState({ total: 0, done: 0, errors: 0 });

  useEffect(() => {
    (async () => {
      const list = await fetchCultures('');
      const opts = list.map((c) => ({ value: c.id, label: `${c.description} (${c.id})` }));
      setCultures(opts);
      if (!opts.find((o) => o.value === source) && opts.length) setSource(opts[0].value);
      if (!opts.find((o) => o.value === target) && opts.length > 1) setTarget(opts[1].value);
    })();
    // eslint-disable-next-line
  }, []);

  async function loadDiff() {
    if (!source || !target || source === target) return;
    setLoading(true);
    try {
      const [srcDict, tgtDict] = await Promise.all([
        fetchPublicDict(source),
        fetchPublicDict(target),
      ]);
      const rows = Object.entries(srcDict)
        .filter(([k]) => !(k in tgtDict))
        .map(([k, v]) => ({ key: k, sourceText: String(v ?? ''), targetText: '' }));
      setMissing(rows);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const f = (filter || '').toLowerCase();
    if (!f) return missing;
    return missing.filter(
      (r) =>
        r.key.toLowerCase().includes(f) ||
        r.sourceText.toLowerCase().includes(f) ||
        r.targetText.toLowerCase().includes(f)
    );
  }, [missing, filter]);

  async function saveAll() {
    if (!target) return;
    const toCreate = filtered.filter((r) => r.targetText && r.targetText.trim());
    if (toCreate.length === 0) {
      alert('Nada para salvar.');
      return;
    }
    for (const r of toCreate) {
      await createTranslation({
        cultureId: target,
        key: r.key,
        description: r.targetText,
        code: r.key.split('.')[0],
      });
    }
    alert(`Salvo ${toCreate.length} novas traduções em ${target}.`);
    await loadDiff();
  }

  // ===== Import JSON =====
  function validateAndPreviewImport(raw, currentTargetDict, onlyMissing) {
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      return { error: `JSON inválido: ${e.message}` };
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { error: 'Cole um objeto JSON no formato { "key": "texto" }.' };
    }
    const entries = Object.entries(parsed);
    const invalid = entries.filter(
      ([k, v]) => typeof k !== 'string' || !(typeof v === 'string' || typeof v === 'number')
    );
    if (invalid.length) {
      return {
        error: `Existem entradas inválidas (devem ser chave string e valor string/number). Ex.: "${invalid[0][0]}".`,
      };
    }
    const normalized = entries.map(([k, v]) => [k, String(v)]);
    const willCreate = normalized
      .filter(([k]) => (onlyMissing ? !(k in currentTargetDict) : true))
      .map(([k, v]) => ({ key: k, text: v }));

    return { total: normalized.length, willCreate };
  }

  async function openImport() {
    if (!target) {
      alert('Selecione um idioma de destino.');
      return;
    }
    setImportJson('');
    setImportOnlyMissing(true);
    setImportPreview(null);
    setShowImport(true);
  }

  async function runPreview() {
    const tgtDict = await fetchPublicDict(target);
    const preview = validateAndPreviewImport(importJson, tgtDict, importOnlyMissing);
    if (preview.error) {
      setImportPreview({ error: preview.error });
    } else {
      setImportPreview(preview);
    }
  }

  async function runImport() {
    if (!importPreview || importPreview.error) return;
    const batch = importPreview.willCreate;
    if (!batch.length) {
      alert('Nada para importar (0 itens).');
      return;
    }
    setImportRunning(true);
    setImportProgress({ total: batch.length, done: 0, errors: 0 });

    // salva sequencialmente (pode paralelizar por lotes se quiser)
    for (let i = 0; i < batch.length; i++) {
      const { key, text } = batch[i];
      try {
        await createTranslation({
          cultureId: target,
          key,
          description: text,
          code: key.split('.')[0],
        });
      } catch (e) {
        // ignora duplicadas (backend devolve 400 em P2002) e conta como erro
        setImportProgress((s) => ({ ...s, errors: s.errors + 1 }));
      } finally {
        setImportProgress((s) => ({ ...s, done: s.done + 1 }));
      }
    }
    setImportRunning(false);
    alert(`Importação concluída: ${batch.length - importProgress.errors} criadas, ${importProgress.errors} com erro.`);
    setShowImport(false);
    await loadDiff();
  }

  return (
    <div className="p-4 space-y-4">
      <I18nWizardNav current={2} />
      <h1 className="text-xl font-semibold">Traduzir labels faltantes</h1>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="text-sm block mb-1">Origem</label>
          <Select value={source} onChange={setSource} options={cultures} />
        </div>
        <div>
          <label className="text-sm block mb-1">Destino</label>
          <Select value={target} onChange={setTarget} options={cultures} />
        </div>
        <div className="flex gap-2">
          <button
            className="px-3 py-2 bg-blue-600 text-white rounded"
            onClick={loadDiff}
            disabled={!source || !target || source === target}
          >
            Carregar faltantes
          </button>
          <button
            className="px-3 py-2 bg-purple-600 text-white rounded"
            onClick={openImport}
            disabled={!target}
            title="Importar JSON → cria traduções no idioma destino"
          >
            Importar JSON
          </button>
        </div>
        <div className="flex-1 min-w-[240px]">
          <label className="text-sm block mb-1">Filtro</label>
          <input
            className="border rounded px-2 py-1 w-full"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="key/texto..."
          />
        </div>
        <div>
          <button
            className="px-3 py-2 bg-green-600 text-white rounded"
            onClick={saveAll}
            disabled={filtered.length === 0}
          >
            Salvar selecionados ({filtered.length})
          </button>
        </div>
      </div>

      <div className="border rounded">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-2 py-2 text-left w-[34%]">Key</th>
              <th className="px-2 py-2 text-left w-[33%]">Texto origem ({source})</th>
              <th className="px-2 py-2 text-left w-[33%]">Tradução destino ({target})</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-2 py-4" colSpan={3}>
                  Carregando...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td className="px-2 py-4" colSpan={3}>
                  Sem faltantes para traduzir
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.key} className="border-b align-top">
                  <td className="px-2 py-2">
                    <code className="text-xs">{row.key}</code>
                  </td>
                  <td className="px-2 py-2">
                    <TextArea value={row.sourceText} onChange={() => {}} readOnly />
                  </td>
                  <td className="px-2 py-2">
                    <TextArea
                      value={row.targetText}
                      onChange={(v) => {
                        const val = typeof v === 'string' ? v : v.target.value;
                        setMissing((old) =>
                          old.map((it) => (it.key === row.key ? { ...it, targetText: val } : it))
                        );
                      }}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ===== Modal de Importação ===== */}
      {showImport && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Importar JSON → {target}</h2>
              <button className="px-2 py-1" onClick={() => setShowImport(false)}>✕</button>
            </div>

            <div className="text-sm text-gray-600">
              Cole um objeto no formato <code>{'{ "alguma.key": "Texto traduzido" }'}</code>.  
              Só serão criadas chaves no idioma <strong>{target}</strong>.
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={importOnlyMissing}
                  onChange={(e) => setImportOnlyMissing(e.target.checked)}
                />
                Somente chaves faltantes no destino
              </label>
              <button
                className="px-3 py-1.5 border rounded"
                onClick={runPreview}
                disabled={!importJson.trim()}
              >
                Pré-visualizar
              </button>
            </div>

            <TextArea
              value={importJson}
              onChange={setImportJson}
              placeholder='{"app.title": "Meu App", "menu.home": "Início"}'
            />

            {importPreview && importPreview.error && (
              <div className="text-red-600 text-sm">{importPreview.error}</div>
            )}
            {importPreview && !importPreview.error && (
              <div className="text-sm">
                Total no JSON: <strong>{importPreview.total}</strong> •
                Vai criar agora: <strong>{importPreview.willCreate.length}</strong>
                {importPreview.willCreate.length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-blue-700">ver lista</summary>
                    <div className="max-h-40 overflow-auto border rounded p-2 mt-1 text-xs bg-gray-50">
                      {importPreview.willCreate.map((r) => (
                        <div key={r.key}><code>{r.key}</code> → {r.text}</div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            )}

            {importRunning ? (
              <div className="text-sm">
                Importando... {importProgress.done}/{importProgress.total}{' '}
                {importProgress.errors > 0 && (
                  <span className="text-red-600">• erros: {importProgress.errors}</span>
                )}
                <div className="w-full bg-gray-200 rounded h-2 mt-2">
                  <div
                    className="bg-green-600 h-2 rounded"
                    style={{
                      width:
                        importProgress.total > 0
                          ? `${Math.round((importProgress.done / importProgress.total) * 100)}%`
                          : '0%',
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex justify-end gap-2">
                <button className="px-3 py-2 bg-gray-100 rounded" onClick={() => setShowImport(false)}>
                  Cancelar
                </button>
                <button
                  className="px-3 py-2 bg-green-600 text-white rounded"
                  onClick={runImport}
                  disabled={!importPreview || !!importPreview?.error || (importPreview?.willCreate?.length ?? 0) === 0}
                >
                  Importar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
