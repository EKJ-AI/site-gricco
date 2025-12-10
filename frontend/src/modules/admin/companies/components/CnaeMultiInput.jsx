import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth } from '../../../auth/contexts/AuthContext';
import AutocompleteSelect from './AutocompleteSelect.jsx';
import Pagination from './Pagination.jsx';
import { searchCNAE } from '../api/catalog';

function normalizeRisk(raw) {
  if (raw === null || raw === undefined || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

// Normaliza o objeto vindo da API de catálogo
function normalizeApiCnae(it) {
  const rawRisk =
    it.riskLevel ??
    it.nrRisk ??
    it.nr_risk ??
    it.nr_risco ??
    it.risco ??
    it.risk ??
    null;

  return {
    code: it.code || '',
    title: it.title || '',
    riskLevel: normalizeRisk(rawRisk),
  };
}

export default function CnaeMultiInput({ value = [], onChange, disabled }) {
  const { accessToken } = useAuth();

  const items = useMemo(
    () => (Array.isArray(value) ? value : []),
    [value],
  );

  const [selectedCnae, setSelectedCnae] = useState(null);

  // ------- Modal de catálogo -------
  const [modalOpen, setModalOpen] = useState(false);
  const [modalPage, setModalPage] = useState(1);
  const [modalPageSize] = useState(20);
  const [modalSearch, setModalSearch] = useState('');

  // filtros por coluna
  const [codeFilter, setCodeFilter] = useState('');
  const [titleFilter, setTitleFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all'); // all | yes | no

  // Lista completa de CNAEs (todos do backend)
  const [allCnaes, setAllCnaes] = useState([]);
  const [allLoaded, setAllLoaded] = useState(false);
  const [allLoading, setAllLoading] = useState(false);

  const emitChange = useCallback(
    (next) => {
      onChange?.(next);
    },
    [onChange],
  );

  const addOrUpdateCnae = useCallback(
    (cnaeLike) => {
      const norm = normalizeApiCnae(cnaeLike);
      if (!norm.code) return;

      const idx = items.findIndex((it) => it.code === norm.code);
      let next;
      if (idx >= 0) {
        next = items.map((it, i) =>
          i === idx ? { ...it, ...norm } : it,
        );
      } else {
        next = [...items, norm];
      }
      emitChange(next);
    },
    [items, emitChange],
  );

  const removeCnae = useCallback(
    (code) => {
      const next = items.filter((it) => it.code !== code);
      emitChange(next);
    },
    [items, emitChange],
  );

  const handleRiskChange = useCallback(
    (code, rawValue) => {
      const v = String(rawValue ?? '').trim();
      const risk = v === '' ? null : normalizeRisk(v);

      const next = items.map((it) =>
        it.code === code ? { ...it, riskLevel: risk } : it,
      );
      emitChange(next);
    },
    [items, emitChange],
  );

  // ------- Autocomplete (CNAE) -------
  const fetchCnaeOptions = useCallback(
    async (query) => {
      if (!accessToken) return { items: [], total: 0 };

      // autocomplete continua usando termo normalmente
      const res = await searchCNAE(query || undefined, 1, 20, accessToken);
      const data = res || {};
      const raw =
        data.items ||
        (data.data && data.data.items) ||
        (Array.isArray(data) ? data : []) ||
        [];
      const list = raw.map(normalizeApiCnae);
      return {
        items: list,
        total:
          data.total ??
          (data.data && data.data.total) ??
          list.length ??
          0,
      };
    },
    [accessToken],
  );

  const applyAutocompleteSelection = useCallback(
    (item) => {
      setSelectedCnae(item || null);
      if (item) addOrUpdateCnae(item);
    },
    [addOrUpdateCnae],
  );

  // ------- Carregar TODOS os CNAEs do backend (sem confiar em total) -------
  const ensureAllLoaded = useCallback(async () => {
    if (allLoaded || allLoading || !accessToken) return;

    setAllLoading(true);
    try {
      const pageSize = 100; // tamanho razoável
      const acc = [];
      const seenCodes = new Set();
      let page = 1;

      // busca página por página até o backend não devolver mais nada
      while (true) {
        // ⚠️ IMPORTANTE: passa undefined no termo para não aplicar NENHUM filtro
        const res = await searchCNAE(undefined, page, pageSize, accessToken);
        const data = res || {};

        const raw =
          data.items ||
          (data.data && data.data.items) ||
          (Array.isArray(data) ? data : []) ||
          [];

        const list = raw
          .map(normalizeApiCnae)
          .filter((c) => c.code);

        if (!list.length) {
          // sem registros -> acabou
          break;
        }

        for (const c of list) {
          if (!c.code || seenCodes.has(c.code)) continue;
          seenCodes.add(c.code);
          acc.push(c);
        }

        if (list.length < pageSize) {
          // última página
          break;
        }

        page += 1;
      }

      // ordena por código no final
      acc.sort((a, b) =>
        String(a.code).localeCompare(String(b.code)),
      );

      setAllCnaes(acc);
      setAllLoaded(true);
    } catch (e) {
      console.error('[CnaeMultiInput] ensureAllLoaded error', e);
      setAllCnaes([]);
      setAllLoaded(false);
    } finally {
      setAllLoading(false);
    }
  }, [allLoaded, allLoading, accessToken]);

  // 🔹 1) Se há CNAEs selecionados SEM risco, carrega o catálogo completo automaticamente
  useEffect(() => {
    if (
      accessToken &&
      !allLoaded &&
      !allLoading &&
      items.some(
        (it) =>
          it.code &&
          (it.riskLevel === null || it.riskLevel === undefined),
      )
    ) {
      ensureAllLoaded();
    }
  }, [accessToken, allLoaded, allLoading, items, ensureAllLoaded]);

  // 🔹 2) Quando catálogo completo estiver carregado, preenche riskLevel
  useEffect(() => {
    if (!allLoaded || !allCnaes.length || !items.length) return;

    const catalogByCode = new Map(
      allCnaes.map((c) => [String(c.code), c]),
    );

    let changed = false;
    const next = items.map((it) => {
      if (
        it.code &&
        (it.riskLevel === null || it.riskLevel === undefined)
      ) {
        const found = catalogByCode.get(String(it.code));
        if (found && found.riskLevel != null) {
          changed = true;
          return { ...it, riskLevel: found.riskLevel };
        }
      }
      return it;
    });

    if (changed) {
      emitChange(next);
    }
  }, [allLoaded, allCnaes, items, emitChange]);

  // Abre modal → garante catálogo carregado (caso ainda não esteja)
  useEffect(() => {
    if (modalOpen) {
      ensureAllLoaded();
    }
  }, [modalOpen, ensureAllLoaded]);

  const openModal = useCallback(() => {
    setModalOpen(true);
    setModalPage(1);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
  }, []);

  const toggleCnaeFromModal = useCallback(
    (cnae) => {
      const norm = normalizeApiCnae(cnae);
      const exists = items.some((it) => it.code === norm.code);
      if (exists) {
        removeCnae(norm.code);
      } else {
        addOrUpdateCnae(norm);
      }
    },
    [items, addOrUpdateCnae, removeCnae],
  );

  const mainCnae = useMemo(() => {
    if (!items.length) return null;
    const withRisk = items.filter((c) => c.riskLevel != null);
    if (!withRisk.length) return items[0].code;
    const max = Math.max(...withRisk.map((c) => c.riskLevel));
    const candidates = withRisk
      .filter((c) => c.riskLevel === max)
      .sort((a, b) => a.code.localeCompare(b.code));
    return candidates[0]?.code || null;
  }, [items]);

  // ------- Filtragem (global + por coluna) em cima de TODOS os CNAEs -------
  const filteredRows = useMemo(() => {
    let rows = allCnaes;

    // filtro global
    if (modalSearch.trim()) {
      const s = modalSearch.trim().toLowerCase();
      rows = rows.filter(
        (row) =>
          String(row.code || '').toLowerCase().includes(s) ||
          String(row.title || '').toLowerCase().includes(s),
      );
    }

    // filtro por código
    if (codeFilter.trim()) {
      const code = codeFilter.trim().toLowerCase();
      rows = rows.filter((row) =>
        String(row.code || '')
          .toLowerCase()
          .includes(code),
      );
    }

    // filtro por descrição
    if (titleFilter.trim()) {
      const t = titleFilter.trim().toLowerCase();
      rows = rows.filter((row) =>
        String(row.title || '')
          .toLowerCase()
          .includes(t),
      );
    }

    // filtro por grau de risco (texto)
    if (riskFilter.trim()) {
      const rf = riskFilter.trim().toLowerCase();
      rows = rows.filter((row) => {
        const r =
          row.riskLevel === null || row.riskLevel === undefined
            ? ''
            : String(row.riskLevel);
        return r.toLowerCase().includes(rf);
      });
    }

    // filtro por "Selecionado?"
    if (selectedFilter === 'yes') {
      rows = rows.filter((row) =>
        items.some((it) => it.code === row.code),
      );
    } else if (selectedFilter === 'no') {
      rows = rows.filter(
        (row) => !items.some((it) => it.code === row.code),
      );
    }

    return rows;
  }, [
    allCnaes,
    modalSearch,
    codeFilter,
    titleFilter,
    riskFilter,
    selectedFilter,
    items,
  ]);

  // Linhas visíveis na página atual
  const visibleModalItems = useMemo(() => {
    const start = (modalPage - 1) * modalPageSize;
    const end = start + modalPageSize;
    return filteredRows.slice(start, end);
  }, [filteredRows, modalPage, modalPageSize]);

  const effectiveTotal = filteredRows.length;

  // reset filtros ao fechar modal
  useEffect(() => {
    if (!modalOpen) {
      setCodeFilter('');
      setTitleFilter('');
      setRiskFilter('');
      setSelectedFilter('all');
      setModalSearch('');
      setModalPage(1);
    }
  }, [modalOpen]);

  const modalIsLoading = allLoading && !allLoaded;

  return (
    <div style={{ width: '100%' }}>
      <div className="grid-2">
        <div>
          <AutocompleteSelect
            label="CNAEs do estabelecimento"
            value={selectedCnae}
            onChange={applyAutocompleteSelection}
            fetcher={fetchCnaeOptions}
            getKey={(it) => it.code}
            getLabel={(it) =>
              `${it.code} - ${it.title || 'Sem descrição'}`
            }
            placeholder="Buscar CNAE por código ou descrição..."
            minChars={0}
            disabled={disabled || !accessToken}
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
            <button
              type="button"
              className="secondary"
              onClick={openModal}
              disabled={disabled}
            >
              Ver todos CNAEs
            </button>
          </div>
        </div>
        <div
          className="card"
          style={{ padding: 8, alignSelf: 'flex-end' }}
        >
          <b>CNAE principal:&nbsp;</b>
          {mainCnae ? (
            <span className="badge">{mainCnae}</span>
          ) : (
            <span style={{ color: '#666' }}>nenhum selecionado</span>
          )}
        </div>
      </div>

      {/* Tabela de CNAEs selecionados - largura horizontal ajustada */}
      <div
        style={{
          marginTop: 8,
          border: '1px solid #eee',
          borderRadius: 4,
          overflowX: 'auto',
          width: '100%',
        }}
      >
        <table
          className="data-table"
          style={{ margin: 0, minWidth: 650 }}
        >
          <thead>
            <tr>
              <th style={{ width: 120 }}>Código</th>
              <th>Descrição</th>
              <th style={{ width: 160 }}>Grau de risco (1–4)</th>
              <th style={{ width: 80 }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.map((cnae) => (
              <tr key={cnae.code}>
                <td>{cnae.code}</td>
                <td>{cnae.title || '—'}</td>
                <td>
                  <input
                    type="number"
                    min={1}
                    max={4}
                    value={
                      cnae.riskLevel === null ||
                      cnae.riskLevel === undefined
                        ? ''
                        : cnae.riskLevel
                    }
                    onChange={(e) =>
                      handleRiskChange(cnae.code, e.target.value)
                    }
                    style={{ width: '100%' }}
                    disabled={disabled}
                  />
                </td>
                <td>
                  <button
                    type="button"
                    className="danger"
                    onClick={() => removeCnae(cnae.code)}
                    disabled={disabled}
                  >
                    Remover
                  </button>
                </td>
              </tr>
            ))}
            {!items.length && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center' }}>
                  Nenhum CNAE selecionado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* -------- Modal de catálogo -------- */}
      {modalOpen && (
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
              maxWidth: 1000,
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
                gap: 8,
              }}
            >
              <h3 style={{ margin: 0 }}>Catálogo de CNAEs</h3>
              <button
                type="button"
                className="secondary"
                onClick={closeModal}
              >
                Fechar
              </button>
            </div>

            <div
              style={{
                fontSize: 13,
                marginBottom: 8,
                color: '#555',
              }}
            >
              Lista de CNAEs cadastrados no sistema. Clique nas linhas
              para adicionar ou remover CNAEs do estabelecimento. Você
              pode selecionar mais de um CNAE.
            </div>

            {/* filtro global */}
            <div
              style={{
                display: 'flex',
                gap: 8,
                marginBottom: 8,
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <input
                placeholder="Filtrar por código ou descrição (todos os CNAEs)..."
                value={modalSearch}
                onChange={(e) => {
                  setModalSearch(e.target.value);
                  setModalPage(1);
                }}
                style={{ flex: 1, minWidth: 200 }}
              />
            </div>

            <div
              style={{
                flex: 1,
                overflow: 'auto',
                border: '1px solid #eee',
                borderRadius: 4,
              }}
            >
              {modalIsLoading ? (
                <div style={{ padding: 12 }}>Carregando CNAEs…</div>
              ) : (
                <table
                  className="data-table"
                  style={{ margin: 0, minWidth: 760 }}
                >
                  <thead>
                    <tr>
                      <th style={{ width: 120 }}>Código</th>
                      <th>Descrição</th>
                      <th style={{ width: 140 }}>Grau de risco</th>
                      <th style={{ width: 120 }}>Selecionado?</th>
                    </tr>
                    {/* linha de filtros por coluna */}
                    <tr>
                      <th>
                        <input
                          type="text"
                          placeholder="Filtrar código..."
                          value={codeFilter}
                          onChange={(e) => {
                            setCodeFilter(e.target.value);
                            setModalPage(1);
                          }}
                          style={{ width: '100%' }}
                        />
                      </th>
                      <th>
                        <input
                          type="text"
                          placeholder="Filtrar descrição..."
                          value={titleFilter}
                          onChange={(e) => {
                            setTitleFilter(e.target.value);
                            setModalPage(1);
                          }}
                          style={{ width: '100%' }}
                        />
                      </th>
                      <th>
                        <input
                          type="text"
                          placeholder="Ex: 1, 2, 3..."
                          value={riskFilter}
                          onChange={(e) => {
                            setRiskFilter(e.target.value);
                            setModalPage(1);
                          }}
                          style={{ width: '100%' }}
                        />
                      </th>
                      <th>
                        <select
                          value={selectedFilter}
                          onChange={(e) => {
                            setSelectedFilter(e.target.value);
                            setModalPage(1);
                          }}
                          style={{ width: '100%' }}
                        >
                          <option value="all">Todos</option>
                          <option value="yes">Somente selecionados</option>
                          <option value="no">
                            Somente não selecionados
                          </option>
                        </select>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleModalItems.map((cnae) => {
                      const existing = items.find(
                        (it) => it.code === cnae.code,
                      );

                      const rawRisk =
                        cnae.riskLevel ??
                        cnae.nrRisk ??
                        cnae.nr_risk ??
                        cnae.nr_risco ??
                        cnae.risco ??
                        cnae.risk ??
                        existing?.riskLevel ??
                        null;

                      const riskText =
                        rawRisk === null ||
                        rawRisk === undefined ||
                        rawRisk === ''
                          ? '—'
                          : rawRisk;

                      const selected = !!existing;

                      return (
                        <tr
                          key={cnae.code}
                          style={{
                            cursor: 'pointer',
                            backgroundColor: selected
                              ? 'rgba(0, 128, 0, 0.06)'
                              : undefined,
                          }}
                          onClick={() => toggleCnaeFromModal(cnae)}
                        >
                          <td>{cnae.code}</td>
                          <td>{cnae.title || '—'}</td>
                          <td>{riskText}</td>
                          <td>{selected ? 'Sim' : 'Não'}</td>
                        </tr>
                      );
                    })}
                    {!visibleModalItems.length && !modalIsLoading && (
                      <tr>
                        <td
                          colSpan={4}
                          style={{ textAlign: 'center' }}
                        >
                          Nenhum registro encontrado com os filtros
                          atuais.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            <Pagination
              page={modalPage}
              pageSize={modalPageSize}
              total={effectiveTotal}
              onChange={(p) => setModalPage(p)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
