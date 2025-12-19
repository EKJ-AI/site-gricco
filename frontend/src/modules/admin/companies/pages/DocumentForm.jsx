import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  createDocument,
  getDocument,
  updateDocument,
  searchDocumentTypes,
  uploadVersion,
  activateVersion,
} from '../api/documents';
import { useAuth } from '../../../auth/contexts/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import AutocompleteSelect from '../components/AutocompleteSelect.jsx';
import usePermission from '../../../auth/hooks/usePermission';
import FileDropzone from '../components/FileDropzone.jsx';
import { useToast, extractErrorMessage } from '../../../../shared/components/toast/ToastProvider';
import ModalBase from '../../../../shared/components/modals/ModalBase';

const DOCUMENT_STATUS = ['DRAFT', 'ACTIVE', 'INACTIVE'];

function validateDocument({ form, mode, initialFile }) {
  const missing = [];
  if (!String(form.name || '').trim()) missing.push('Nome');
  if (!String(form.typeId || '').trim()) missing.push('Tipo de documento');

  if (mode === 'create') {
    if (!initialFile) missing.push('Arquivo inicial (primeira versão)');
  }

  return { ok: missing.length === 0, missing };
}

export default function DocumentForm({ mode = 'create' }) {
  const { accessToken } = useAuth();
  const { companyId, establishmentId, documentId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState({
    name: '',
    typeId: '',
    description: '',
    status: 'DRAFT',
  });
  const [selectedType, setSelectedType] = useState(null);

  const [loadingDoc, setLoadingDoc] = useState(mode === 'edit');
  const [saving, setSaving] = useState(false);

  // permissões
  const canCreate = usePermission('document.create');
  const canUpdate = usePermission('document.update');
  const canCreateVersion = usePermission('documentVersion.create');
  const canActivateVersion = usePermission('documentVersion.activate');

  const canWriteDoc = mode === 'edit' ? canUpdate : canCreate;

  // Upload inicial (somente no create)
  const [initialFile, setInitialFile] = useState(null);
  const [initialDescription, setInitialDescription] = useState('');
  const [autoActivate, setAutoActivate] = useState(true);

  // Modal de tipos
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [typeModalItems, setTypeModalItems] = useState([]);
  const [typeModalLoading, setTypeModalLoading] = useState(false);
  const [typeModalKindFilter, setTypeModalKindFilter] = useState('');

  useEffect(() => {
    // avisa uma vez ao entrar sem permissão (evita mensagem inline)
    if (!loadingDoc && !saving && !canWriteDoc) {
      toast.warning(
        `Você não tem permissão para ${mode === 'edit' ? 'atualizar' : 'criar'} documentos.`,
        { title: 'Permissão' }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canWriteDoc, mode, loadingDoc]);

  useEffect(() => {
    if (mode === 'edit' && documentId && accessToken) {
      setLoadingDoc(true);
      getDocument(companyId, establishmentId, documentId, accessToken)
        .then((d) => {
          if (!d) return;
          setForm({
            name: d.name || '',
            typeId: d.typeId || '',
            description: d.description || '',
            status: d.status || 'DRAFT',
          });
          setSelectedType(d.type || null);
        })
        .catch((e) => {
          toast.error(extractErrorMessage(e, 'Falha ao carregar o documento.'), { title: 'Erro' });
        })
        .finally(() => setLoadingDoc(false));
    }
  }, [mode, companyId, establishmentId, documentId, accessToken, toast]);

  const fetchDocumentTypes = useCallback(
    async (query) => {
      if (!accessToken) return { items: [], total: 0 };

      const res = await searchDocumentTypes(query, accessToken, {
        pageSize: 50,
        kind: typeModalKindFilter || undefined,
      });

      return { items: res?.items || [], total: res?.total || 0 };
    },
    [accessToken, typeModalKindFilter]
  );

  const openTypeModal = useCallback(async () => {
    setTypeModalOpen(true);

    if (!accessToken) {
      toast.warning('Sessão expirada. Faça login novamente.', { title: 'Sessão' });
      setTypeModalItems([]);
      return;
    }

    setTypeModalLoading(true);
    try {
      const res = await searchDocumentTypes('', accessToken, { pageSize: 200 });
      setTypeModalItems(res?.items || []);
    } catch (e) {
      console.error('Failed to load document types for modal', e);
      toast.error(extractErrorMessage(e, 'Falha ao carregar tipos de documento.'), { title: 'Erro' });
      setTypeModalItems([]);
    } finally {
      setTypeModalLoading(false);
    }
  }, [accessToken, toast]);

  const filteredTypeModalItems = useMemo(
    () => typeModalItems.filter((t) => (typeModalKindFilter ? t.kind === typeModalKindFilter : true)),
    [typeModalItems, typeModalKindFilter]
  );

  const validation = useMemo(
    () => validateDocument({ form, mode, initialFile }),
    [form, mode, initialFile]
  );

  const createHasVersionPermission = mode !== 'create' ? true : !!canCreateVersion;

  const saveDisabled =
    saving ||
    loadingDoc ||
    !canWriteDoc ||
    !validation.ok ||
    !createHasVersionPermission;

  const handleSubmit = async (e) => {
    e.preventDefault();

    // permissão doc
    if (!canWriteDoc) {
      toast.warning('Você não tem permissão para salvar documentos.', { title: 'Permissão' });
      return;
    }

    // obrigatórios
    const v = validateDocument({ form, mode, initialFile });
    if (!v.ok) {
      const preview = v.missing.slice(0, 4).join(', ');
      const tail = v.missing.length > 4 ? `… (+${v.missing.length - 4})` : '';
      toast.warning(`Preencha os campos obrigatórios: ${preview}${tail}`, { title: 'Campos obrigatórios' });
      return;
    }

    // create precisa permissão de versão
    if (mode === 'create' && !canCreateVersion) {
      toast.warning('Você não tem permissão para enviar a versão inicial (documentVersion.create).', { title: 'Permissão' });
      return;
    }

    setSaving(true);
    try {
      if (mode === 'edit') {
        await updateDocument(
          companyId,
          establishmentId,
          documentId,
          {
            name: form.name.trim(),
            typeId: form.typeId,
            description: String(form.description || '').trim() ? form.description : null,
            ...(DOCUMENT_STATUS.includes(form.status) ? { status: form.status } : {}),
          },
          accessToken
        );

        toast.success('Documento atualizado.', { title: 'Salvo' });
        navigate(`/companies/${companyId}/establishments/${establishmentId}/documents/${documentId}`);
        return;
      }

      // CREATE: cria doc + sobe primeira versão + (opcional) ativa
      const created = await createDocument(
        companyId,
        establishmentId,
        {
          name: form.name.trim(),
          typeId: form.typeId,
          description: String(form.description || '').trim() ? form.description : null,
        },
        accessToken
      );

      const newDocId = created?.id;
      if (!newDocId) throw new Error('Documento criado, mas a API não retornou o id.');

      const fd = new FormData();
      fd.append('file', initialFile);
      if (String(initialDescription || '').trim()) fd.append('changeDescription', initialDescription.trim());

      const version = await uploadVersion(companyId, establishmentId, newDocId, fd, accessToken);

      if (autoActivate && canActivateVersion && version?.id) {
        try {
          await activateVersion(companyId, establishmentId, newDocId, version.id, accessToken);
        } catch (errActivate) {
          console.warn('Failed to auto-activate initial version', errActivate);
          toast.warning('Versão enviada, mas não foi possível ativar automaticamente.', { title: 'Atenção' });
        }
      }

      toast.success('Documento criado e versão inicial enviada.', { title: 'Salvo' });
      navigate(`/companies/${companyId}/establishments/${establishmentId}/documents/${newDocId}`);
    } catch (err) {
      console.error(err);
      toast.error(extractErrorMessage(err, 'Falha ao salvar.'), { title: 'Erro' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pf-page">
      <div className="pf-shell">
        <div className="pf-header">
          <div className="pf-header-left">
            <div className="pf-header-icon" aria-hidden="true">📄</div>
            <div>
              <h2 className="pf-title">{mode === 'edit' ? 'Editar Documento' : 'Novo Documento'}</h2>
              <p className="pf-subtitle">
                {mode === 'edit'
                  ? 'Atualize as informações do documento.'
                  : 'Cadastre o documento e envie a primeira versão.'}
              </p>
            </div>
          </div>

          <button type="button" className="pf-close" onClick={() => navigate(-1)} aria-label="Fechar">
            ✕
          </button>
        </div>

        {loadingDoc ? (
          <section className="pf-section">Carregando…</section>
        ) : (
          <form className="pf-form" onSubmit={handleSubmit}>
            {/* Card 1 */}
            <section className="pf-section">
              <div className="grid-2">
                <label>
                  Nome *
                  <input
                    placeholder="Ex.: PGR 2025, PCMSO, LTCAT..."
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    disabled={saving || !canWriteDoc}
                  />
                </label>

                <div>
                  <AutocompleteSelect
                    label="Tipo de documento *"
                    value={selectedType}
                    onChange={(item) => {
                      setSelectedType(item || null);
                      setForm((f) => ({ ...f, typeId: item?.id || '' }));
                    }}
                    fetcher={fetchDocumentTypes}
                    getKey={(it) => it.id}
                    getLabel={(it) => `${it.name}${it.kind ? ` (${String(it.kind).toLowerCase()})` : ''}`}
                    placeholder="Buscar tipos de documento..."
                    minChars={0}
                    disabled={!accessToken || saving || !canWriteDoc}
                  />

                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
                    <small style={{ color: '#6b7280' }}>
                      Ex.: PGR, PCMSO, LTCAT, AET, PPP, evidências, laudos, registros etc.
                    </small>
                    <button
                      type="button"
                      className="pf-btn pf-btn-secondary"
                      onClick={openTypeModal}
                      style={{ marginLeft: 'auto', height: 34 }}
                      disabled={saving}
                    >
                      Ver todos
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 10 }}>
                <label>
                  Descrição
                  <textarea
                    rows={3}
                    placeholder="Opcional (NR, escopo, observações)..."
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    disabled={saving || !canWriteDoc}
                  />
                </label>
              </div>

              {mode === 'edit' && (
                <div style={{ marginTop: 10 }}>
                  <label>
                    Status (somente leitura)
                    <input value={form.status} readOnly disabled />
                  </label>
                </div>
              )}
            </section>

            {/* Card 2 (create) */}
            {mode === 'create' && (
              <section className="pf-section">
                <div style={{ fontWeight: 800, fontSize: 13, color: '#0e1b4d', marginBottom: 10 }}>
                  Arquivo inicial (primeira versão) *
                </div>

                <FileDropzone
                  onFile={(f) => setInitialFile(f)}
                  disabled={saving || !canWriteDoc || !canCreateVersion}
                />

                {initialFile && (
                  <div style={{ marginTop: 8, fontSize: 13, color: '#1f2937' }}>
                    Selecionado: <strong>{initialFile.name}</strong>
                  </div>
                )}

                <div style={{ marginTop: 10 }}>
                  <label>
                    Descrição da versão (o que mudou?)
                    <textarea
                      rows={3}
                      placeholder="Explique brevemente o que está sendo enviado nesta primeira versão..."
                      value={initialDescription}
                      onChange={(e) => setInitialDescription(e.target.value)}
                      disabled={saving || !canWriteDoc || !canCreateVersion}
                    />
                  </label>
                </div>

                <div className="pf-switch-row" style={{ marginTop: 10 }}>
                  <p className="pf-switch-label">
                    Ativar (publicar) automaticamente esta primeira versão
                    {!canActivateVersion ? ' (sem permissão)' : ''}
                  </p>
                  <input
                    type="checkbox"
                    className="pf-switch"
                    checked={!!autoActivate}
                    onChange={(e) => setAutoActivate(e.target.checked)}
                    disabled={!canActivateVersion || saving}
                    aria-label="Auto ativar primeira versão"
                  />
                </div>
              </section>
            )}

            <div className="pf-actions">
              <button
                type="button"
                className="pf-btn pf-btn-secondary"
                onClick={() => navigate(-1)}
                disabled={saving}
              >
                Cancelar
              </button>

              <button type="submit" className="pf-btn pf-btn-primary" disabled={saveDisabled}>
                {saving ? 'Salvando…' : 'Salvar cadastro'}
              </button>
            </div>
          </form>
        )}

        {/* Modal de tipos */}
        <ModalBase
          open={typeModalOpen}
          title="Tipos de Documento"
          onClose={() => setTypeModalOpen(false)}
          loading={typeModalLoading}
          zIndex={999}
          maxWidth={900}
          maxHeight="80vh"
        >
          <div style={{ fontSize: 13, marginBottom: 10, color: '#6b7280' }}>
            Clique em uma linha para selecionar o tipo.
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#6b7280' }}>Filtrar por kind:</span>

            <button type="button" className="pf-btn pf-btn-secondary" style={{ height: 34 }} onClick={() => setTypeModalKindFilter('')}>
              Todos
            </button>
            <button type="button" className="pf-btn pf-btn-secondary" style={{ height: 34 }} onClick={() => setTypeModalKindFilter('MAIN')}>
              MAIN
            </button>
            <button type="button" className="pf-btn pf-btn-secondary" style={{ height: 34 }} onClick={() => setTypeModalKindFilter('EVIDENCE')}>
              EVIDENCE
            </button>
            <button type="button" className="pf-btn pf-btn-secondary" style={{ height: 34 }} onClick={() => setTypeModalKindFilter('SECONDARY')}>
              SECONDARY
            </button>
            <button type="button" className="pf-btn pf-btn-secondary" style={{ height: 34 }} onClick={() => setTypeModalKindFilter('OTHER')}>
              OTHER
            </button>
          </div>

          <div style={{ border: '1px solid #e6e6e6', borderRadius: 12, overflow: 'auto' }}>
            {typeModalLoading ? (
              <div style={{ padding: 12 }}>Carregando tipos…</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left' }}>
                    <th style={{ padding: 10, borderBottom: '1px solid #e6e6e6' }}>Nome</th>
                    <th style={{ padding: 10, borderBottom: '1px solid #e6e6e6' }}>Kind</th>
                    <th style={{ padding: 10, borderBottom: '1px solid #e6e6e6' }}>Descrição</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTypeModalItems.map((t) => (
                    <tr
                      key={t.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        setSelectedType(t);
                        setForm((f) => ({ ...f, typeId: t.id }));
                        setTypeModalOpen(false);
                      }}
                    >
                      <td style={{ padding: 10, borderBottom: '1px solid #f0f0f0' }}>{t.name}</td>
                      <td style={{ padding: 10, borderBottom: '1px solid #f0f0f0' }}>{t.kind || '—'}</td>
                      <td style={{ padding: 10, borderBottom: '1px solid #f0f0f0' }}>{t.description || '—'}</td>
                    </tr>
                  ))}

                  {!filteredTypeModalItems.length && (
                    <tr>
                      <td colSpan={3} style={{ padding: 12, textAlign: 'center', color: '#6b7280' }}>
                        Nenhum tipo encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </ModalBase>
      </div>
    </div>
  );
}
