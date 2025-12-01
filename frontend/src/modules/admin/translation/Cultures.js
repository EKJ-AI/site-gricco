import React, { useEffect, useState } from 'react';
import { fetchCultures } from '../../../api/translations';
import { createCulture, updateCulture, deleteCultureApi } from '../../../api/translations';
import I18nWizardNav from '../components/I18nWizardNav';

function TextInput({ value, onChange, ...rest }) {
  return <input className="border rounded px-2 py-1 w-full" value={value} onChange={e => onChange(e.target.value)} {...rest} />;
}
function Switch({ checked, onChange }) {
  return (
    <button
      className={`px-3 py-1 rounded ${checked ? 'bg-green-600 text-white' : 'bg-gray-300'}`}
      onClick={() => onChange(!checked)}
      type="button"
    >
      {checked ? 'Ativa' : 'Inativa'}
    </button>
  );
}

export default function CulturesAdmin() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // novo idioma
  const [id, setId] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('🏳️');
  const [order, setOrder] = useState(99);
  const [active, setActive] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const list = await fetchCultures('');
      setItems(list);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function handleCreate() {
    if (!id || !description || !icon) return;
    await createCulture({ id, description, icon, order: Number(order), active });
    setId(''); setDescription(''); setIcon('🏳️'); setOrder(99); setActive(true);
    await load();
  }

  function Row({ row }) {
    const [edit, setEdit] = useState(false);
    const [st, setSt] = useState({ ...row });
    useEffect(() => setSt({ ...row }), [row]);

    return (
      <tr className="border-b">
        <td className="px-2 py-1 font-mono text-xs">{row.id}</td>
        <td className="px-2 py-1">{edit
          ? <TextInput value={st.description} onChange={v => setSt(s => ({ ...s, description: v }))} />
          : <span>{row.description}</span>}
        </td>
        <td className="px-2 py-1">{edit
          ? <TextInput value={st.icon} onChange={v => setSt(s => ({ ...s, icon: v }))} />
          : <span className="text-xl">{row.icon}</span>}
        </td>
        <td className="px-2 py-1 w-24">{edit
          ? <TextInput type="number" value={st.order} onChange={v => setSt(s => ({ ...s, order: v }))} />
          : <span>{row.order}</span>}
        </td>
        <td className="px-2 py-1">{edit
          ? <Switch checked={st.active} onChange={v => setSt(s => ({ ...s, active: v }))} />
          : <span className={`px-2 py-0.5 rounded text-xs ${row.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{row.active ? 'Ativa' : 'Inativa'}</span>}
        </td>
        <td className="px-2 py-1 w-40">
          {edit ? (
            <>
              <button className="px-2 py-1 text-white bg-green-600 rounded mr-2"
                onClick={async () => { await updateCulture(row.id, { description: st.description, icon: st.icon, order: Number(st.order), active: st.active }); setEdit(false); load(); }}>
                Salvar
              </button>
              <button className="px-2 py-1 bg-gray-200 rounded" onClick={() => { setSt({ ...row }); setEdit(false); }}>Cancelar</button>
            </>
          ) : (
            <>
              <button className="px-2 py-1 bg-blue-100 rounded mr-2" onClick={() => setEdit(true)}>Editar</button>
              <button className="px-2 py-1 text-white bg-red-600 rounded"
                onClick={async () => {
                  if (!window.confirm('Remover cultura? Labels vinculados bloqueiam a exclusão.')) return;
                  await deleteCultureApi(row.id);
                  load();
                }}>
                Excluir
              </button>
            </>
          )}
        </td>
      </tr>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <I18nWizardNav current={0} />
      <h1 className="text-xl font-semibold">Admin • Idiomas (Cultures)</h1>

      {/* criar nova cultura */}
      <div className="border rounded p-3 space-y-2 bg-gray-50">
        <div className="font-medium">Adicionar novo idioma</div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          <TextInput value={id} onChange={setId} placeholder="id (ex.: es-ES)" />
          <TextInput value={description} onChange={setDescription} placeholder="Descrição (ex.: Español (España))" />
          <TextInput value={icon} onChange={setIcon} placeholder="Icone (emoji) ex.: 🇪🇸" />
          <TextInput type="number" value={order} onChange={setOrder} placeholder="Ordem (ex.: 3)" />
          <div className="flex items-center"><Switch checked={active} onChange={setActive} /></div>
        </div>
        <div>
          <button className="px-3 py-2 text-white bg-green-600 rounded" onClick={handleCreate} disabled={!id || !description || !icon}>
            Adicionar idioma
          </button>
        </div>
      </div>

      {/* tabela */}
      <div className="border rounded">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-2 py-2 text-left">ID</th>
              <th className="px-2 py-2 text-left">Descrição</th>
              <th className="px-2 py-2 text-left">Ícone</th>
              <th className="px-2 py-2 text-left">Ordem</th>
              <th className="px-2 py-2 text-left">Status</th>
              <th className="px-2 py-2 text-left">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-2 py-4" colSpan={6}>Carregando...</td></tr>
            ) : items.length === 0 ? (
              <tr><td className="px-2 py-4" colSpan={6}>Nenhuma cultura</td></tr>
            ) : (
              items.map(row => <Row key={row.id} row={row} />)
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
