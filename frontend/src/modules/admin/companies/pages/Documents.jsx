// src/modules/admin/companies/pages/Documents.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../../auth/contexts/AuthContext';
import { useParams, Link } from 'react-router-dom';
import ProtectedRoute from '../../../../shared/components/ProtectedRoute';
import {
  listDocuments,
  deleteDocument,
  listRelations,
} from '../api/documents';
import DocumentTable from '../components/DocumentTable.jsx';
import Pagination from '../components/Pagination.jsx';

// ---------- Helpers de status por tipo de documento ----------

function getProgramStatus(docsForType) {
  if (!docsForType.length) return 'EMPTY';
  const hasActive = docsForType.some((d) => d.status === 'ACTIVE');
  if (hasActive) return 'OK';
  return 'PENDING';
}

function getProgramStatusLabel(status) {
  switch (status) {
    case 'OK':
      return 'OK';
    case 'PENDING':
      return 'Pendente';
    case 'EMPTY':
    default:
      return 'Nenhum documento';
  }
}

function getProgramStatusStyle(status) {
  switch (status) {
    case 'OK':
      return {
        backgroundColor: '#ecfdf3',
        border: '1px solid #16a34a33',
        color: '#166534',
      };
    case 'PENDING':
      return {
        backgroundColor: '#fffbeb',
        border: '1px solid #facc1533',
        color: '#92400e',
      };
    case 'EMPTY':
    default:
      return {
        backgroundColor: '#f3f4f6',
        border: '1px solid #9ca3af33',
        color: '#374151',
      };
  }
}

export default function Documents() {
  const { accessToken } = useAuth();
  const { companyId, establishmentId } = useParams();

  const [q, setQ] = useState('');
  const [data, setData] = useState({
    items: [],
    total: 0,
    page: 1,
    pageSize: 20,
  });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // Resumo por tipo de documento principal
  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // ---------- Busca de contagem de evidências para os docs da página ----------

  const fetchEvidenceCounts = useCallback(
    async (docs) => {
      if (!accessToken || !docs.length) return {};
      const map = {};
      await Promise.all(
        docs.map(async (d) => {
          try {
            // doc como PAI (MAIN -> evidências)
            const resRel = await listRelations(
              companyId,
              establishmentId,
              d.id,
              { direction: 'parent', relationType: 'EVIDENCE' },
              accessToken
            );
            const arr = resRel?.items || resRel || [];
            map[d.id] = arr.length || 0;
          } catch (e) {
            console.error('Failed to load relations for document', d.id, e);
            map[d.id] = 0;
          }
        })
      );
      return map;
    },
    [accessToken, companyId, establishmentId]
  );

  // ---------- Lista com paginação + search ----------

  const fetcher = useCallback(
    async (page = 1) => {
      if (!accessToken) return;
      setLoading(true);
      setErr('');
      try {
        const res = await listDocuments(
          companyId,
          establishmentId,
          { page, pageSize: 20, q },
          accessToken
        );

        const items = Array.isArray(res) ? res : res?.items || [];
        const total = res?.total ?? (Array.isArray(items) ? items.length : 0);

        const evidenceMap = await fetchEvidenceCounts(items);
        const itemsWithCounts = items.map((d) => ({
          ...d,
          evidencesCount: evidenceMap[d.id] || 0,
        }));

        setData({
          items: itemsWithCounts,
          total,
          page,
          pageSize: 20,
        });
      } catch (e) {
        console.error(e);
        setErr('Failed to load documents.');
        setData((old) => ({ ...old, items: [], total: 0, page }));
      } finally {
        setLoading(false);
      }
    },
    [companyId, establishmentId, accessToken, q, fetchEvidenceCounts]
  );

  useEffect(() => {
    fetcher(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, establishmentId, accessToken, q]);

  // ---------- Resumo dinâmico por tipo de documento principal ----------

  const loadSummary = useCallback(async () => {
    if (!accessToken || !companyId || !establishmentId) return;
    setLoadingSummary(true);
    try {
      // Carrega até 500 documentos do estabelecimento para montar o resumo
      const res = await listDocuments(
        companyId,
        establishmentId,
        { page: 1, pageSize: 500, q: '' },
        accessToken
      );
      const allDocs = res?.items || res || [];

      // Consideramos apenas tipos de documento principal (kind = MAIN)
      const mainDocs = allDocs.filter(
        (d) => d.type?.kind === 'MAIN'
      );

      // Agrupa por DocumentType
      const byType = new Map();
      for (const doc of mainDocs) {
        const typeId = doc.type?.id || doc.typeId;
        if (!typeId) continue;
        const key = typeId;
        const group = byType.get(key) || {
          typeId: key,
          typeName: doc.type?.name || 'Tipo sem nome',
          typeDescription: doc.type?.description || '',
          docs: [],
        };
        group.docs.push(doc);
        byType.set(key, group);
      }

      // Constrói array de resumo
      const items = Array.from(byType.values())
        .map((g) => {
          const status = getProgramStatus(g.docs);
          return {
            typeId: g.typeId,
            typeName: g.typeName,
            typeDescription: g.typeDescription,
            status,
            docs: g.docs,
          };
        })
        .sort((a, b) =>
          a.typeName.localeCompare(b.typeName, 'pt-BR', {
            sensitivity: 'base',
          })
        );

      setSummary({ items });
    } catch (e) {
      console.error('Failed to load dynamic summary', e);
      setSummary(null);
    } finally {
      setLoadingSummary(false);
    }
  }, [accessToken, companyId, establishmentId]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  // ---------- Delete ----------

  const onDelete = async (id) => {
    if (!window.confirm('Confirm delete?')) return;
    try {
      await deleteDocument(companyId, establishmentId, id, accessToken);
      fetcher(data.page);
      loadSummary();
    } catch (e) {
      console.error(e);
      setErr('Failed to delete document.');
    }
  };

  return (
    <div>
      {/* Resumo dinâmico por tipo de documento principal */}
      <div style={{ marginBottom: 12 }}>
        <h2>Documentos do Estabelecimento</h2>
        <p style={{ marginTop: 4, fontSize: 13, color: '#555' }}>
          Visão geral dos <strong>tipos de documentos principais</strong> (PGR,
          PCMSO, LTCAT, laudos, programas etc.). Esta visão é{' '}
          <strong>dinâmica</strong> e baseada no cadastro de tipos de
          documento (Document Types).
        </p>

        <div className="card" style={{ padding: 12 }}>
          {loadingSummary && <div>Carregando resumo…</div>}

          {!loadingSummary && summary && summary.items?.length > 0 && (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              {summary.items.map((t) => {
                const style = getProgramStatusStyle(t.status);
                return (
                  <div
                    key={t.typeId}
                    style={{
                      minWidth: 180,
                      padding: 10,
                      borderRadius: 8,
                      fontSize: 12,
                      ...style,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 4,
                      }}
                    >
                      <strong
                        style={{
                          fontSize: 13,
                          maxWidth: 180,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={t.typeName}
                      >
                        {t.typeName}
                      </strong>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        {getProgramStatusLabel(t.status)}
                      </span>
                    </div>
                    {t.typeDescription && (
                      <div
                        style={{
                          fontSize: 11,
                          marginBottom: 4,
                          color: 'inherit',
                          opacity: 0.9,
                        }}
                      >
                        {t.typeDescription}
                      </div>
                    )}
                    <div style={{ fontSize: 11, marginTop: 4 }}>
                      <span style={{ fontWeight: 500 }}>
                        {t.docs.length} documento
                        {t.docs.length > 1 ? 's' : ''} do tipo.
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!loadingSummary && (!summary || summary.items?.length === 0) && (
            <div style={{ fontSize: 13 }}>
              Nenhum documento principal encontrado ainda. Assim que você
              cadastrar documentos com tipos classificados como{' '}
              <strong>MAIN</strong> (Document Type &rarr; kind = MAIN),
              eles aparecerão aqui agrupados por tipo.
            </div>
          )}
        </div>
      </div>

      {/* Filtros + ações */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          marginBottom: 8,
          flexWrap: 'wrap',
        }}
      >
        <input
          placeholder="Search documents..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button onClick={() => fetcher(1)}>Search</button>

        <ProtectedRoute inline permissions={['document.create']}>
          <Link
            to={`/companies/${companyId}/establishments/${establishmentId}/documents/new`}
            className="primary"
          >
            New Document
          </Link>
        </ProtectedRoute>
      </div>

      {err && <div className="error-message">{err}</div>}

      {loading ? (
        <div>Loading…</div>
      ) : (
        <>
          <DocumentTable rows={data.items} onDelete={onDelete} />
          <Pagination
            page={data.page}
            pageSize={data.pageSize}
            total={data.total}
            onChange={(p) => fetcher(p)}
          />
        </>
      )}
    </div>
  );
}
