import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../../auth/contexts/AuthContext';
import RequirePermission from '../../../../shared/hooks/RequirePermission';
import {
  getDocument,
  listVersions,
  uploadVersion,
  activateVersion,
  archiveVersion,
  listRelations,
  createDocument,
  createRelation,
  searchDocumentTypes,
  searchDocuments,
  buildDocumentFileUrl,
  updateVersionDescription,
  fetchDocumentVersionAccessLog,
} from '../api/documents';
import AutocompleteSelect from '../components/AutocompleteSelect.jsx';
import FileDropzone from '../components/FileDropzone.jsx';
import { useToast, extractErrorMessage } from '../../../../shared/components/toast/ToastProvider';

// ✅ Use seus modais compartilhados (ajuste o caminho se necessário)
import ModalBase from '../../../../shared/components/modals/ModalBase';
import ConfirmModal from '../../../../shared/components/modals/ConfirmModal';

export default function DocumentDetail() {
  const { companyId, establishmentId, documentId } = useParams();
  const { accessToken } = useAuth();
  const toast = useToast();

  const authReady = useMemo(
    () => !!(accessToken && documentId && companyId && establishmentId),
    [accessToken, documentId, companyId, establishmentId]
  );

  const [doc, setDoc] = useState(null);
  const [versions, setVersions] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState('');

  // upload de versão do próprio documento
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadDescription, setUploadDescription] = useState('');

  // edição inline da descrição das versões
  const [editingVersionId, setEditingVersionId] = useState(null);
  const [editingDescription, setEditingDescription] = useState('');
  const [savingDescription, setSavingDescription] = useState(false);

  // Modal de registros por VERSÃO
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [logModalLoading, setLogModalLoading] = useState(false);
  const [logModalError, setLogModalError] = useState('');
  const [logModalVersion, setLogModalVersion] = useState(null);
  const [logModalItems, setLogModalItems] = useState([]);

  // relacionados (evidências, anexos, etc.)
  const [evidences, setEvidences] = useState([]);
  const [loadingEvidences, setLoadingEvidences] = useState(false);

  // modo de relacionamento: 'new' (novo doc + upload) ou 'existing' (relacionar existente)
  const [evidenceMode, setEvidenceMode] = useState(null);

  // criação rápida de novo documento relacionado
  const [evName, setEvName] = useState('');
  const [evDescription, setEvDescription] = useState('');
  const [evFile, setEvFile] = useState(null);
  const [savingEvidence, setSavingEvidence] = useState(false);
  const [evSelectedType, setEvSelectedType] = useState(null);

  // seleção de documento existente para relacionar
  const [selectedExistingDoc, setSelectedExistingDoc] = useState(null);
  const [linkingExisting, setLinkingExisting] = useState(false);

  // modal de tipos de documentos (tutorial)
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [typeModalItems, setTypeModalItems] = useState([]);
  const [typeModalLoading, setTypeModalLoading] = useState(false);
  const [typeModalKindFilter, setTypeModalKindFilter] = useState('');

  // modal de documentos existentes do estabelecimento
  const [documentModalOpen, setDocumentModalOpen] = useState(false);
  const [documentModalItems, setDocumentModalItems] = useState([]);
  const [documentModalLoading, setDocumentModalLoading] = useState(false);

  // confirmação de arquivar
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [archiveTargetVersion, setArchiveTargetVersion] = useState(null);

  const currentVersionId = doc?.currentVersionId;

  const fetchDocument = useCallback(async () => {
    const res = await getDocument(companyId, establishmentId, documentId, accessToken);
    setDoc(res || null);
  }, [companyId, establishmentId, documentId, accessToken]);

  const fetchVersions = useCallback(async () => {
    const res = await listVersions(companyId, establishmentId, documentId, accessToken);
    const data = res || {};
    setVersions(data.items || data || []);
  }, [companyId, establishmentId, documentId, accessToken]);

  const fetchEvidences = useCallback(async () => {
    if (!accessToken) return;
    setLoadingEvidences(true);
    setError('');
    try {
      const res = await listRelations(
        companyId,
        establishmentId,
        documentId,
        { direction: 'all', relationType: 'EVIDENCE' },
        accessToken
      );
      const data = res || {};
      const items = data.items || data || [];
      setEvidences(items);
    } catch (e) {
      console.error(e);
      const msg = 'Failed to load related documents.';
      setError(msg);
      toast.error(extractErrorMessage(e, msg), { title: 'Erro' });
      setEvidences([]);
    } finally {
      setLoadingEvidences(false);
    }
  }, [companyId, establishmentId, documentId, accessToken, toast]);

  useEffect(() => {
    if (!authReady) return;
    setError('');
    fetchDocument().catch((e) => {
      const msg = 'Failed to load document';
      setError(msg);
      toast.error(extractErrorMessage(e, msg), { title: 'Erro' });
    });
    fetchVersions().catch((e) => {
      const msg = 'Failed to load versions';
      setError(msg);
      toast.error(extractErrorMessage(e, msg), { title: 'Erro' });
    });
    fetchEvidences().catch(() => {});
  }, [authReady, documentId, fetchDocument, fetchVersions, fetchEvidences, toast]);

  // ---------- Upload de nova versão do próprio documento ----------
  async function handleUploadVersion(e) {
    e.preventDefault();
    if (!uploadFile) {
      toast.warning('Selecione um arquivo para enviar.', { title: 'Arquivo obrigatório' });
      return;
    }
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', uploadFile);
      if (uploadDescription.trim()) fd.append('changeDescription', uploadDescription.trim());

      await uploadVersion(companyId, establishmentId, documentId, fd, accessToken);

      await Promise.all([fetchVersions(), fetchDocument()]);
      setUploadFile(null);
      setUploadDescription('');
      setShowUpload(false);

      toast.success('Versão enviada com sucesso.', { title: 'Upload' });
    } catch (err) {
      console.error(err);
      const msg = 'Failed to upload version';
      setError(msg);
      toast.error(extractErrorMessage(err, msg), { title: 'Erro' });
    } finally {
      setUploading(false);
    }
  }

  async function handleActivate(versionId) {
    setError('');
    try {
      await activateVersion(companyId, establishmentId, documentId, versionId, accessToken);
      await Promise.all([fetchVersions(), fetchDocument()]);
      toast.success('Versão ativada/publicada.', { title: 'OK' });
    } catch (err) {
      console.error(err);
      const msg = 'Failed to activate version';
      setError(msg);
      toast.error(extractErrorMessage(err, msg), { title: 'Erro' });
    }
  }

  function requestArchive(version) {
    setArchiveTargetVersion(version || null);
    setArchiveConfirmOpen(true);
  }

  async function confirmArchive() {
    const v = archiveTargetVersion;
    if (!v?.id) {
      setArchiveConfirmOpen(false);
      return;
    }

    setArchiving(true);
    setError('');
    try {
      await archiveVersion(companyId, establishmentId, documentId, v.id, accessToken);
      await Promise.all([fetchVersions(), fetchDocument()]);
      toast.success('Versão despublicada (arquivada).', { title: 'OK' });
    } catch (err) {
      console.error(err);
      const msg = 'Failed to unpublish (archive) version';
      setError(msg);
      toast.error(extractErrorMessage(err, msg), { title: 'Erro' });
    } finally {
      setArchiving(false);
      setArchiveConfirmOpen(false);
      setArchiveTargetVersion(null);
    }
  }

  // ---------- Editar descrição da versão (inline na tabela) ----------
  function startEditingDescription(version) {
    setEditingVersionId(version.id);
    setEditingDescription(version.changeDescription || '');
    setError('');
  }

  function cancelEditingDescription() {
    setEditingVersionId(null);
    setEditingDescription('');
  }

  async function handleSaveDescription(version) {
    if (!version?.id) return;
    if (editingVersionId && editingVersionId !== version.id) return;

    setSavingDescription(true);
    setError('');
    try {
      await updateVersionDescription(
        companyId,
        establishmentId,
        documentId,
        version.id,
        { changeDescription: editingDescription },
        accessToken
      );
      await fetchVersions();
      setEditingVersionId(null);
      setEditingDescription('');
      toast.success('Descrição atualizada.', { title: 'OK' });
    } catch (err) {
      console.error(err);
      const msg = 'Failed to update version description';
      setError(msg);
      toast.error(extractErrorMessage(err, msg), { title: 'Erro' });
    } finally {
      setSavingDescription(false);
    }
  }

  // ---------- IDs de documentos já relacionados (mãe ou filho) ----------
  const evidenceDocumentIds = useMemo(
    () =>
      evidences
        .map((rel) => {
          if (rel.fromDocumentId === documentId) return rel.toDocumentId || rel.toDocument?.id || null;
          if (rel.toDocumentId === documentId) return rel.fromDocumentId || rel.fromDocument?.id || null;
          return null;
        })
        .filter(Boolean),
    [evidences, documentId]
  );

  // ---------- Autocomplete de tipos de evidência ----------
  const fetchEvidenceTypes = useCallback(
    async (query) => {
      if (!accessToken) return { items: [], total: 0 };
      const res = await searchDocumentTypes(query, accessToken, { kind: 'EVIDENCE', pageSize: 50 });
      return { items: res?.items || [], total: res?.total || 0 };
    },
    [accessToken]
  );

  // ---------- Autocomplete de documentos existentes ----------
  const fetchExistingDocuments = useCallback(
    async (query) => {
      if (!accessToken) return { items: [], total: 0 };
      const res = await searchDocuments(companyId, establishmentId, { q: query, pageSize: 50 }, accessToken);

      const rawItems = res?.items || [];
      const usedIds = new Set([documentId, ...evidenceDocumentIds]);
      const filtered = rawItems.filter((d) => !usedIds.has(d.id));

      return { items: filtered, total: filtered.length };
    },
    [companyId, establishmentId, accessToken, documentId, evidenceDocumentIds]
  );

  // ---------- Modal de tipos de documento ----------
  const openTypeModal = useCallback(async () => {
    setTypeModalOpen(true);

    if (!accessToken) {
      setTypeModalItems([]);
      toast.warning('Sessão expirada. Faça login novamente.', { title: 'Sessão' });
      return;
    }

    setTypeModalLoading(true);
    try {
      const res = await searchDocumentTypes('', accessToken, { pageSize: 200 });
      setTypeModalItems(res?.items || []);
    } catch (e) {
      console.error('Failed to load document types for modal', e);
      toast.error(extractErrorMessage(e, 'Failed to load document types.'), { title: 'Erro' });
      setTypeModalItems([]);
    } finally {
      setTypeModalLoading(false);
    }
  }, [accessToken, toast]);

  const filteredTypeModalItems = typeModalItems.filter((t) =>
    typeModalKindFilter ? t.kind === typeModalKindFilter : true
  );

  // ---------- Modal de documentos existentes do estabelecimento ----------
  const openDocumentModal = useCallback(async () => {
    setDocumentModalOpen(true);

    if (!accessToken) {
      setDocumentModalItems([]);
      toast.warning('Sessão expirada. Faça login novamente.', { title: 'Sessão' });
      return;
    }

    setDocumentModalLoading(true);
    try {
      const res = await searchDocuments(companyId, establishmentId, { q: '', pageSize: 200 }, accessToken);

      const rawItems = res?.items || [];
      const usedIds = new Set([documentId, ...evidenceDocumentIds]);
      const filtered = rawItems.filter((d) => !usedIds.has(d.id));

      setDocumentModalItems(filtered);
    } catch (e) {
      console.error('Failed to load documents for modal', e);
      toast.error(extractErrorMessage(e, 'Failed to load documents.'), { title: 'Erro' });
      setDocumentModalItems([]);
    } finally {
      setDocumentModalLoading(false);
    }
  }, [accessToken, companyId, establishmentId, documentId, evidenceDocumentIds, toast]);

  // ---------- Modal de REGISTROS por VERSÃO ----------
  const formatDateTime = (value) => {
    if (!value) return '—';
    try {
      const d = new Date(value);
      return d.toLocaleString('pt-BR');
    } catch {
      return String(value);
    }
  };

  const openLogModal = async (version) => {
    if (!accessToken || !companyId || !establishmentId || !documentId) return;

    setLogModalVersion(version);
    setLogModalOpen(true);
    setLogModalLoading(true);
    setLogModalError('');
    setLogModalItems([]);

    try {
      const data = await fetchDocumentVersionAccessLog(companyId, establishmentId, documentId, version.id, accessToken);
      setLogModalItems(data?.items || []);
    } catch (err) {
      console.error('Failed to load access log for this version.', err);
      setLogModalError('Failed to load access log for this version.');
    } finally {
      setLogModalLoading(false);
    }
  };

  // ---------- Criação rápida de documento relacionado (evidência) ----------
  async function handleCreateEvidence(e) {
    e.preventDefault();
    setError('');

    if (!evFile) {
      const msg = 'Selecione um arquivo de evidência.';
      setError(msg);
      toast.warning(msg, { title: 'Arquivo obrigatório' });
      return;
    }
    if (!evSelectedType?.id) {
      const msg = 'Selecione o tipo de documento de evidência.';
      setError(msg);
      toast.warning(msg, { title: 'Tipo obrigatório' });
      return;
    }

    const normalizedName = (evName || '').trim() || evFile.name || 'Evidência';
    const normalizedDescription = (evDescription || '').trim() || `Evidência vinculada ao documento ${doc?.name || ''}`;

    setSavingEvidence(true);

    try {
      // 1) Cria documento filho
      const childDoc = await createDocument(
        companyId,
        establishmentId,
        { name: normalizedName, typeId: evSelectedType.id, description: normalizedDescription },
        accessToken
      );

      // 2) Sobe versão
      const fd = new FormData();
      fd.append('file', evFile);
      const version = await uploadVersion(companyId, establishmentId, childDoc.id, fd, accessToken);

      // 3) Tenta ativar a versão
      try {
        await activateVersion(companyId, establishmentId, childDoc.id, version.id, accessToken);
      } catch (errActivate) {
        console.warn('Failed to auto-activate evidence version', errActivate);
      }

      // 4) Cria relação MÃE -> EVIDENCE
      await createRelation(
        companyId,
        establishmentId,
        documentId,
        { relationType: 'EVIDENCE', targetDocumentId: childDoc.id },
        accessToken
      );

      // 5) Refresh
      await Promise.all([fetchDocument(), fetchVersions(), fetchEvidences()]);

      setEvName('');
      setEvDescription('');
      setEvFile(null);
      setEvSelectedType(null);
      setEvidenceMode(null);

      toast.success('Documento de evidência criado e vinculado.', { title: 'OK' });
    } catch (err) {
      console.error(err);
      const msg = 'Failed to create evidence document.';
      setError(msg);
      toast.error(extractErrorMessage(err, msg), { title: 'Erro' });
    } finally {
      setSavingEvidence(false);
    }
  }

  // ---------- Relacionar documento existente como evidência ----------
  async function handleLinkExisting(e) {
    e.preventDefault();
    setError('');

    if (!selectedExistingDoc?.id) {
      const msg = 'Selecione um documento existente.';
      setError(msg);
      toast.warning(msg, { title: 'Obrigatório' });
      return;
    }
    if (selectedExistingDoc.id === documentId) {
      const msg = 'Não é possível relacionar o documento consigo mesmo.';
      setError(msg);
      toast.warning(msg, { title: 'Validação' });
      return;
    }

    setLinkingExisting(true);
    try {
      await createRelation(
        companyId,
        establishmentId,
        documentId,
        { relationType: 'EVIDENCE', targetDocumentId: selectedExistingDoc.id },
        accessToken
      );

      await fetchEvidences();
      setSelectedExistingDoc(null);
      setEvidenceMode(null);

      toast.success('Documento relacionado com sucesso.', { title: 'OK' });
    } catch (err) {
      console.error(err);
      const msg = 'Failed to link existing document as evidence.';
      setError(msg);
      toast.error(extractErrorMessage(err, msg), { title: 'Erro' });
    } finally {
      setLinkingExisting(false);
    }
  }

  if (!documentId) return <div>Select a document from the list.</div>;

  const storageBaseHint =
    versions?.[0]?.storagePath && !String(versions[0].storagePath).includes('uploads')
      ? ' (verifique se o backend está servindo /uploads corretamente)'
      : '';

  return (
    <div className="page-documents">
      <div className="header">
        <h4>Document detail</h4>
        {error && <div className="error-message">{error}</div>}

        {doc ? (
          <div className="card" style={{ marginBottom: 16 }}>
            <div>
              <strong>Name:</strong> {doc.name}
            </div>
            <div>
              <strong>Type:</strong> {doc.type?.name || doc.typeId}
            </div>
            <div>
              <strong>Status:</strong> {doc.status}
            </div>
            <div>
              <strong>Current version:</strong> {currentVersionId || '—'}
            </div>
            {doc.description && (
              <div>
                <strong>Description:</strong> {doc.description}
              </div>
            )}
          </div>
        ) : (
          <div>Loading…</div>
        )}

        {/* ---------- Seção de versões ---------- */}
        <section style={{ marginBottom: 24 }}>
          <div className="barra-nova-versao-documento">
            <h3 style={{ margin: 0 }}>Versions</h3>

            <RequirePermission permissions={['documentVersion.create']}>
              {!showUpload && (
                <button type="button" onClick={() => setShowUpload(true)} className="secondary">
                  Upload new version
                </button>
              )}
            </RequirePermission>
          </div>

          {showUpload && (
            <RequirePermission permissions={['documentVersion.create']}>
              <form onSubmit={handleUploadVersion} className="card" style={{ marginBottom: 12, padding: 12 }}>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ marginBottom: 4 }}>File</div>
                  <FileDropzone onFile={(file) => setUploadFile(file)} />
                </div>

                {uploadFile && (
                  <div style={{ marginBottom: 8, fontSize: 13 }}>
                    Selected: <strong>{uploadFile.name}</strong> ({uploadFile.size} bytes)
                  </div>
                )}

                <div style={{ marginBottom: 8 }}>
                  <label>
                    Version description (what changed?)
                    <br />
                    <textarea
                      rows={3}
                      placeholder="Ex.: Atualização de dados do ano, inclusão de novos riscos, ajuste de layout..."
                      value={uploadDescription}
                      onChange={(e) => setUploadDescription(e.target.value)}
                    />
                  </label>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="submit" disabled={uploading || !uploadFile}>
                    {uploading ? 'Uploading…' : 'Upload'}
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowUpload(false);
                      setUploadFile(null);
                      setUploadDescription('');
                    }}
                    disabled={uploading}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </RequirePermission>
          )}

          <table className="data-table">
            <thead>
              <tr>
                <th className="mostrar-mobile">#</th>
                <th className="mostrar-mobile">Filename</th>
                <th>Description</th>
                <th>Status</th>
                <th>Size</th>
                <th>SHA-256</th>
                <th>Uploaded by</th>
                <th>Activated at</th>
                <th className="mostrar-mobile">Actions</th>
              </tr>
            </thead>

            <tbody>
              {(versions || []).map((v) => {
                const viewUrl = buildDocumentFileUrl(companyId, establishmentId, documentId, v.id, 'view', accessToken);
                const downloadUrl = buildDocumentFileUrl(
                  companyId,
                  establishmentId,
                  documentId,
                  v.id,
                  'download',
                  accessToken
                );

                const isCurrent = currentVersionId === v.id;

                return (
                  <tr key={v.id} className={isCurrent ? 'row-highlight' : ''}>
                    <td className="mostrar-mobile">{v.versionNumber}</td>
                    <td className="mostrar-mobile">{v.filename}</td>

                    <td
                      style={{
                        maxWidth: 260,
                        whiteSpace: editingVersionId === v.id ? 'normal' : 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={v.changeDescription || ''}
                    >
                      {editingVersionId === v.id ? (
                        <textarea
                          rows={3}
                          style={{ width: '100%' }}
                          value={editingDescription}
                          onChange={(e) => setEditingDescription(e.target.value)}
                        />
                      ) : (
                        v.changeDescription || '—'
                      )}
                    </td>

                    <td>{v.versionStatus}</td>
                    <td>{v.size}</td>

                    <td style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.sha256}</td>

                    <td>{v.uploadedBy?.name || v.uploadedByUserId || '—'}</td>

                    <td>{v.activatedAt ? new Date(v.activatedAt).toLocaleString('pt-BR') : '—'}</td>

                    <td className="mostrar-mobile" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <RequirePermission permissions={['document.log']}>
                        <button type="button" className="secondary" onClick={() => openLogModal(v)}>
                          Registros
                        </button>
                      </RequirePermission>

                      <RequirePermission permissions={['document.view']}>
                        <a href={viewUrl} target="_blank" rel="noreferrer" className="secondary">
                          View
                        </a>
                      </RequirePermission>

                      <RequirePermission permissions={['document.download']}>
                        <a href={downloadUrl} download={v.filename} className="secondary">
                          Download
                        </a>
                      </RequirePermission>

                      <RequirePermission permissions={['documentVersion.activate']}>
                        {!isCurrent && (
                          <button type="button" onClick={() => handleActivate(v.id)}>
                            Activate
                          </button>
                        )}
                      </RequirePermission>

                      <RequirePermission permissions={['documentVersion.archive']}>
                        {isCurrent && (
                          <button
                            type="button"
                            className="secondary"
                            disabled={archiving}
                            onClick={() => requestArchive(v)}
                          >
                            {archiving ? 'Despublicando…' : 'Despublicar'}
                          </button>
                        )}
                      </RequirePermission>

                      <RequirePermission permissions={['documentVersion.update']}>
                        {editingVersionId === v.id ? (
                          <>
                            <button type="button" onClick={() => handleSaveDescription(v)} disabled={savingDescription}>
                              {savingDescription ? 'Saving…' : 'Save'}
                            </button>
                            <button
                              type="button"
                              className="secondary"
                              onClick={cancelEditingDescription}
                              disabled={savingDescription}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button type="button" className="secondary" onClick={() => startEditingDescription(v)}>
                            Edit description
                          </button>
                        )}
                      </RequirePermission>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {!versions?.length && (
            <div style={{ marginTop: 8, fontSize: 13 }}>
              No versions yet. Use &quot;Upload new version&quot; to send the first file.
              {storageBaseHint}
            </div>
          )}
        </section>

        {/* ---------- Seção de documentos relacionados ---------- */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0 }}>Related documents (evidences, annexes)</h3>

            <RequirePermission permissions={['document.create', 'documentVersion.create']}>
              <button
                type="button"
                className={'secondary' + (evidenceMode === 'new' ? ' primary-outline' : '')}
                onClick={() => setEvidenceMode('new')}
              >
                Upload new related document
              </button>
            </RequirePermission>

            <RequirePermission permissions={['document.create', 'documentVersion.create']}>
              <button
                type="button"
                className={'secondary' + (evidenceMode === 'existing' ? ' primary-outline' : '')}
                onClick={() => setEvidenceMode('existing')}
              >
                Link existing document
              </button>
            </RequirePermission>
          </div>

          {evidenceMode === 'new' && (
            <RequirePermission permissions={['document.create', 'documentVersion.create']}>
              <form onSubmit={handleCreateEvidence} className="card" style={{ marginBottom: 12, padding: 12 }}>
                <div className="grid-2">
                  <div>
                    <label>
                      Related document name (optional)
                      <br />
                      <input
                        type="text"
                        placeholder="If empty, file name will be used"
                        value={evName}
                        onChange={(e) => setEvName(e.target.value)}
                      />
                    </label>
                  </div>

                  <div>
                    <AutocompleteSelect
                      label="Related Document Type"
                      value={evSelectedType}
                      onChange={(item) => setEvSelectedType(item || null)}
                      fetcher={fetchEvidenceTypes}
                      getKey={(it) => it.id}
                      getLabel={(it) => `${it.name}${it.kind ? ` (${it.kind.toLowerCase()})` : ''}`}
                      placeholder="Search document types..."
                      minChars={0}
                      disabled={!accessToken}
                    />
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
                      <button type="button" className="secondary" onClick={openTypeModal}>
                        View all document types
                      </button>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 8 }}>
                  <label>
                    Description
                    <textarea
                      rows={3}
                      placeholder="Describe the evidence, NR, contexto, etc."
                      value={evDescription}
                      onChange={(e) => setEvDescription(e.target.value)}
                    />
                  </label>
                </div>

                <div style={{ marginTop: 8 }}>
                  <div style={{ marginBottom: 4 }}>File</div>
                  <FileDropzone onFile={(file) => setEvFile(file)} />
                </div>

                {evFile && (
                  <div style={{ marginTop: 4, fontSize: 13 }}>
                    Selected: <strong>{evFile.name}</strong> ({evFile.size} bytes)
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button type="submit" disabled={savingEvidence || !evFile || !evSelectedType?.id}>
                    {savingEvidence ? 'Saving…' : 'Save related document'}
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEvidenceMode(null);
                      setEvName('');
                      setEvDescription('');
                      setEvFile(null);
                      setEvSelectedType(null);
                    }}
                    disabled={savingEvidence}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </RequirePermission>
          )}

          {evidenceMode === 'existing' && (
            <RequirePermission permissions={['document.read']}>
              <form onSubmit={handleLinkExisting} className="card" style={{ marginBottom: 12, padding: 12 }}>
                <div className="grid-2">
                  <div>
                    <AutocompleteSelect
                      label="Existing document"
                      value={selectedExistingDoc}
                      onChange={(item) => setSelectedExistingDoc(item || null)}
                      fetcher={fetchExistingDocuments}
                      getKey={(it) => it.id}
                      getLabel={(it) => `${it.name}${it.type?.name ? ` – ${it.type.name}` : ''}`}
                      placeholder="Search documents in this establishment..."
                      minChars={0}
                      disabled={!accessToken}
                    />
                  </div>

                  <div>
                    <button type="button" className="secondary" style={{ marginTop: 22 }} onClick={openDocumentModal}>
                      View all documents
                    </button>
                  </div>
                </div>

                <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>
                  Use esta opção quando o documento de evidência já foi cadastrado/uploadado e você só quer relacioná-lo
                  como evidência/relacionado deste documento.
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button type="submit" disabled={linkingExisting || !selectedExistingDoc?.id}>
                    {linkingExisting ? 'Linking…' : 'Link as related'}
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEvidenceMode(null);
                      setSelectedExistingDoc(null);
                    }}
                    disabled={linkingExisting}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </RequirePermission>
          )}

          {loadingEvidences ? (
            <div>Loading related documents…</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Current version</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {evidences.map((rel) => {
                  const isFrom = rel.fromDocumentId === documentId;
                  const relatedDoc = isFrom ? rel.toDocument : rel.fromDocument;

                  return (
                    <tr key={rel.id}>
                      <td>{relatedDoc?.name || '—'}</td>
                      <td>{relatedDoc?.type?.name || relatedDoc?.typeId || '—'}</td>
                      <td>{relatedDoc?.status || '—'}</td>
                      <td>
                        {relatedDoc?.currentVersion?.versionNumber != null
                          ? `v${relatedDoc.currentVersion.versionNumber}`
                          : '—'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {relatedDoc?.id && (
                          <Link
                            to={`/companies/${companyId}/establishments/${establishmentId}/documents/${relatedDoc.id}`}
                            style={{ marginRight: 8 }}
                          >
                            Open
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {!evidences.length && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center' }}>
                      No related documents for this record yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </section>

        {/* ✅ ConfirmModal compartilhado */}
        <ConfirmModal
          open={archiveConfirmOpen}
          title="Despublicar versão"
          message={
            archiveTargetVersion
              ? `Confirmar despublicação (arquivar) da versão v${archiveTargetVersion.versionNumber} (${archiveTargetVersion.filename})?`
              : 'Confirmar ação?'
          }
          confirmLabel="Despublicar"
          cancelLabel="Cancelar"
          loading={archiving}
          onCancel={() => {
            if (archiving) return;
            setArchiveConfirmOpen(false);
            setArchiveTargetVersion(null);
          }}
          onConfirm={confirmArchive}
          zIndex={2000}
          maxWidth={520}
        />

        {/* ✅ Modal de REGISTROS por versão (ModalBase) */}
        <ModalBase
          open={logModalOpen}
          title={
            `Access log${
              logModalVersion ? ` — v${logModalVersion.versionNumber} (${logModalVersion.filename})` : ''
            }`
          }
          onClose={() => {
            setLogModalOpen(false);
            setLogModalVersion(null);
            setLogModalItems([]);
            setLogModalError('');
          }}
          loading={logModalLoading}
          zIndex={1200}
          maxWidth={900}
          maxHeight="80vh"
        >
          <div style={{ fontSize: 13, marginBottom: 8, color: '#555' }}>
            Registros de visualização, download e upload desta VERSÃO do documento.
          </div>

          {logModalError && (
            <div
              style={{
                marginBottom: 8,
                padding: 8,
                borderRadius: 4,
                backgroundColor: '#ffe5e5',
                color: '#a00',
                fontSize: 13,
              }}
            >
              {logModalError}
            </div>
          )}

          {logModalLoading ? (
            <div style={{ padding: 12 }}>Loading access log…</div>
          ) : (
            <table className="data-table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>VIEW</th>
                  <th>DOWNLOAD</th>
                  <th>UPLOAD</th>
                  <th>Total</th>
                  <th>Last access</th>
                </tr>
              </thead>
              <tbody>
                {logModalItems.map((item, idx) => {
                  const name = item.userName || (item.userId ? `User #${item.userId}` : 'Anonymous / Guest');
                  const email = item.userEmail || '—';
                  const viewCount = item.counts?.VIEW ?? 0;
                  const downloadCount = item.counts?.DOWNLOAD ?? 0;
                  const uploadCount = item.counts?.UPLOAD ?? 0;
                  const total = item.total ?? viewCount + downloadCount + uploadCount;

                  return (
                    <tr key={item.userId ?? `row-${idx}`}>
                      <td>{name}</td>
                      <td>{email}</td>
                      <td>{viewCount}</td>
                      <td>{downloadCount}</td>
                      <td>{uploadCount}</td>
                      <td>{total}</td>
                      <td>{formatDateTime(item.lastAccessAt)}</td>
                    </tr>
                  );
                })}

                {!logModalItems.length && !logModalLoading && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center' }}>
                      No access records for this version.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </ModalBase>

        {/* ✅ Modal de tipos de documento (ModalBase) */}
        <ModalBase
          open={typeModalOpen}
          title="Document Types (tutorial)"
          onClose={() => setTypeModalOpen(false)}
          loading={typeModalLoading}
          zIndex={999}
          maxWidth={900}
          maxHeight="80vh"
        >
          <div style={{ fontSize: 13, marginBottom: 8, color: '#555' }}>
            Clique em uma linha para selecionar esse tipo.
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#555' }}>Filter by kind:</span>
            <button
              type="button"
              className={'secondary' + (!typeModalKindFilter ? ' primary-outline' : '')}
              onClick={() => setTypeModalKindFilter('')}
            >
              All
            </button>
            <button
              type="button"
              className={'secondary' + (typeModalKindFilter === 'MAIN' ? ' primary-outline' : '')}
              onClick={() => setTypeModalKindFilter('MAIN')}
            >
              MAIN
            </button>
            <button
              type="button"
              className={'secondary' + (typeModalKindFilter === 'EVIDENCE' ? ' primary-outline' : '')}
              onClick={() => setTypeModalKindFilter('EVIDENCE')}
            >
              EVIDENCE
            </button>
            <button
              type="button"
              className={'secondary' + (typeModalKindFilter === 'SECONDARY' ? ' primary-outline' : '')}
              onClick={() => setTypeModalKindFilter('SECONDARY')}
            >
              SECONDARY
            </button>
            <button
              type="button"
              className={'secondary' + (typeModalKindFilter === 'OTHER' ? ' primary-outline' : '')}
              onClick={() => setTypeModalKindFilter('OTHER')}
            >
              OTHER
            </button>
          </div>

          {typeModalLoading ? (
            <div style={{ padding: 12 }}>Loading types…</div>
          ) : (
            <table className="data-table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Kind</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {filteredTypeModalItems.map((t) => (
                  <tr
                    key={t.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      setEvSelectedType(t);
                      setTypeModalOpen(false);
                      setEvidenceMode('new');
                    }}
                  >
                    <td>{t.name}</td>
                    <td>{t.kind || '—'}</td>
                    <td>{t.description || '—'}</td>
                  </tr>
                ))}
                {!filteredTypeModalItems.length && (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center' }}>
                      No document types found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </ModalBase>

        {/* ✅ Modal de documentos existentes (ModalBase) */}
        <ModalBase
          open={documentModalOpen}
          title="Documents in this establishment"
          onClose={() => setDocumentModalOpen(false)}
          loading={documentModalLoading}
          zIndex={1000}
          maxWidth={900}
          maxHeight="80vh"
        >
          <div style={{ fontSize: 13, marginBottom: 8, color: '#555' }}>
            Clique em uma linha para selecionar como documento relacionado.
          </div>

          {documentModalLoading ? (
            <div style={{ padding: 12 }}>Loading documents…</div>
          ) : (
            <table className="data-table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Current version</th>
                </tr>
              </thead>
              <tbody>
                {documentModalItems.map((d) => (
                  <tr
                    key={d.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      setSelectedExistingDoc(d);
                      setDocumentModalOpen(false);
                      setEvidenceMode('existing');
                    }}
                  >
                    <td>{d.name}</td>
                    <td>{d.type?.name || d.typeId || '—'}</td>
                    <td>{d.status || '—'}</td>
                    <td>{d.currentVersion?.versionNumber != null ? `v${d.currentVersion.versionNumber}` : '—'}</td>
                  </tr>
                ))}
                {!documentModalItems.length && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center' }}>
                      No documents found for this establishment.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </ModalBase>
      </div>
    </div>
  );
}
