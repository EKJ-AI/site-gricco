import React, { useEffect, useMemo, useState } from 'react';
import {
  fetchCultures,
  fetchTranslations,
  createTranslation,
  updateTranslation,
  deleteTranslation
} from '../../../api/translations';
import I18nWizardNav from '../components/I18nWizardNav';

function TextInput({ value, onChange, placeholder, ...rest }) {
  return (
    <input
      className="border rounded px-2 py-1 w-full"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      {...rest}
    />
  );
}

function Select({ value, onChange, options, ...rest }) {
  return (
    <select
      className="border rounded px-2 py-1"
      value={value}
      onChange={e => onChange(e.target.value)}
      {...rest}
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

export default function TranslationsAdmin() {
  const [cultures, setCultures] = useState([]);
  const [cultureId, setCultureId] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // criação rápida
  const [newKey, setNewKey] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newTutorial, setNewTutorial] = useState('');
  const [newVersion, setNewVersion] = useState('');

  async function loadCultures() {
    const list = await fetchCultures('');
    setCultures(list.map(c => ({ value: c.id, label: `${c.description} (${c.id})` })));
    if (!cultureId && list.length > 0) setCultureId(list[0].id);
  }

  async function loadData() {
    if (!cultureId) return;
    setLoading(true);
    try {
      const data = await fetchTranslations({ cultureId, q, page, pageSize });
      setItems(data.items || []);
      setTotal(data.total || 0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadCultures(); /* eslint-disable-next-line */ }, []);
  useEffect(() => { setPage(1); /* reset page when culture or query changes */ }, [cultureId, q]);
  useEffect(() => { loadData(); /* eslint-disable-next-line */ }, [cultureId, q, page, pageSize]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  async function handleCreate() {
    if (!cultureId || !newKey || !newDescription) return;
    const payload = {
      cultureId,
      key: newKey,
      description: newDescription,
      code: newCode || undefined,
      tutorial: newTutorial || undefined,
      version: newVersion ? Number(newVersion) : undefined,
    };
    await createTranslation(payload);
    setNewKey(''); setNewDescription(''); setNewCode(''); setNewTutorial(''); setNewVersion('');
    await loadData();
  }

  async function handleInlineSave(row) {
    const payload = {
      cultureId: row.cultureId,
      key: row.key,
      description: row.description,
      code: row.code || undefined,
      tutorial: row.tutorial || undefined,
      version: row.version ?? undefined,
    };
    await updateTranslation(row.id, payload);
    await loadData();
  }

  async function handleDelete(id) {
    if (!window.confirm('Confirma remover esta tradução?')) return;
    await deleteTranslation(id);
    await loadData();
  }

  function Row({ row }) {
    const [edit, setEdit] = useState(false);
    const [state, setState] = useState({ ...row });
    useEffect(() => setState({ ...row }), [row]);

    return (
      <tr className="border-b">
        <td className="px-2 py-1 text-sm">{row.id}</td>
        <td className="px-2 py-1">
          {edit ? <TextInput value={state.key} onChange={v => setState(s => ({ ...s, key: v }))} /> : <code className="text-xs">{row.key}</code>}
        </td>
        <td className="px-2 py-1">
          {edit ? <TextInput value={state.description} onChange={v => setState(s => ({ ...s, description: v }))} /> : <span>{row.description}</span>}
        </td>
        <td className="px-2 py-1">
          {edit ? <TextInput value={state.code || ''} onChange={v => setState(s => ({ ...s, code: v }))} /> : <span className="text-xs">{row.code || '-'}</span>}
        </td>
        <td className="px-2 py-1">
          {edit ? <TextInput value={state.tutorial || ''} onChange={v => setState(s => ({ ...s, tutorial: v }))} /> : <span className="text-xs">{row.tutorial || '-'}</span>}
        </td>
        <td className="px-2 py-1 w-24">
          {edit
            ? <TextInput type="number" value={state.version ?? ''} onChange={v => setState(s => ({ ...s, version: v }))} />
            : <span>{row.version ?? '-'}</span>}
        </td>
        <td className="px-2 py-1 w-40">
          {edit ? (
            <>
              <button className="px-2 py-1 text-white bg-green-600 rounded mr-2" onClick={async () => { await handleInlineSave(state); setEdit(false); }}>Salvar</button>
              <button className="px-2 py-1 bg-gray-200 rounded" onClick={() => { setState({ ...row }); setEdit(false); }}>Cancelar</button>
            </>
          ) : (
            <>
              <button className="px-2 py-1 bg-blue-100 rounded mr-2" onClick={() => setEdit(true)}>Editar</button>
              <button className="px-2 py-1 text-white bg-red-600 rounded" onClick={() => handleDelete(row.id)}>Excluir</button>
            </>
          )}
        </td>
      </tr>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <I18nWizardNav current={1} />
      <h1 className="text-xl font-semibold">Admin • Traduções (Labels)</h1>

      <div className="flex flex-wrap items-center gap-2">
        <div>
          <label className="text-sm block mb-1">Cultura</label>
          <Select value={cultureId} onChange={setCultureId} options={cultures} />
        </div>
        <div className="flex-1 min-w-[220px]">
          <label className="text-sm block mb-1">Busca (code/key/description)</label>
          <TextInput value={q} onChange={setQ} placeholder="Digite para filtrar..." />
        </div>
        <div>
          <label className="text-sm block mb-1">Page size</label>
          <Select value={String(pageSize)} onChange={(v) => setPageSize(Number(v))}
            options={[10,20,50,100,200].map(n => ({ value: String(n), label: String(n) }))} />
        </div>
      </div>

      {/* criação rápida */}
      <div className="border rounded p-3 space-y-2 bg-gray-50">
        <div className="font-medium">Criar novo label</div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          <TextInput value={newKey} onChange={setNewKey} placeholder="key (obrigatório)" />
          <TextInput value={newDescription} onChange={setNewDescription} placeholder="description (obrigatório)" />
          <TextInput value={newCode} onChange={setNewCode} placeholder="code (opcional)" />
          <TextInput value={newTutorial} onChange={setNewTutorial} placeholder="tutorial (opcional)" />
          <TextInput type="number" value={newVersion} onChange={setNewVersion} placeholder="version (opcional)" />
        </div>
        <div>
          <button className="px-3 py-2 text-white bg-green-600 rounded" onClick={handleCreate} disabled={!cultureId || !newKey || !newDescription}>
            Adicionar
          </button>
        </div>
      </div>

      <div className="border rounded">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-2 py-2 text-left">ID</th>
              <th className="px-2 py-2 text-left">Key</th>
              <th className="px-2 py-2 text-left">Description</th>
              <th className="px-2 py-2 text-left">Code</th>
              <th className="px-2 py-2 text-left">Tutorial</th>
              <th className="px-2 py-2 text-left">Version</th>
              <th className="px-2 py-2 text-left">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-2 py-4" colSpan={7}>Carregando...</td></tr>
            ) : items.length === 0 ? (
              <tr><td className="px-2 py-4" colSpan={7}>Nenhum registro</td></tr>
            ) : (
              items.map(row => <Row key={row.id} row={row} />)
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2">
        <button
          className="px-3 py-1 border rounded"
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page <= 1}
        >
          ◀
        </button>
        <span className="text-sm">Página {page} de {totalPages}</span>
        <button
          className="px-3 py-1 border rounded"
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
        >
          ▶
        </button>
      </div>
    </div>
  );
}
