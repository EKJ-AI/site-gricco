// // src/modules/admin/companies/pages/DocumentDetail.jsx
// import React, {
//   useCallback,
//   useEffect,
//   useMemo,
//   useState,
// } from 'react';
// import { Link, useNavigate, useParams } from 'react-router-dom';
// import { useAuth } from '../../../auth/contexts/AuthContext';
// import ProtectedRoute from '../../../../shared/components/ProtectedRoute';
// import AutocompleteSelect from '../components/AutocompleteSelect.jsx';
// import FileDropzone from '../components/FileDropzone.jsx';

// import api from '../../../../api/axios';
// import {
//   getDocument,
//   listVersions,
//   uploadVersion,
//   activateVersion,
//   listRelations,
//   createRelation,
//   deleteRelation,
//   listDocuments,
// } from '../api/documents';

// const KIND_LABEL = {
//   MAIN: 'Documento principal',
//   EVIDENCE: 'Evidência / Registro',
// };

// function buildFileUrl(storagePath) {
//   if (!storagePath) return null;
//   const base = api.defaults.baseURL || '';
//   const apiBase = base.replace(/\/api\/?$/, '');
//   return `${apiBase}${storagePath}`;
// }

// export default function DocumentDetail() {
//   const { companyId, establishmentId, documentId } = useParams();
//   const navigate = useNavigate();
//   const { accessToken } = useAuth();

//   const authReady = useMemo(
//     () => !!(accessToken && companyId && establishmentId && documentId),
//     [accessToken, companyId, establishmentId, documentId]
//   );

//   const [doc, setDoc] = useState(null);
//   const [versions, setVersions] = useState([]);
//   const [relationsAsParent, setRelationsAsParent] = useState([]); // doc -> evidências
//   const [relationsAsChild, setRelationsAsChild] = useState([]); // evidência -> pais
//   const [activeTab, setActiveTab] = useState('summary');

//   const [loading, setLoading] = useState(true);
//   const [loadingRelations, setLoadingRelations] = useState(false);
//   const [error, setError] = useState('');

//   // Upload inline
//   const [uploadOpen, setUploadOpen] = useState(false);
//   const [selectedFile, setSelectedFile] = useState(null);
//   const [uploading, setUploading] = useState(false);

//   // Linkagem de evidências
//   const [linkTarget, setLinkTarget] = useState(null);
//   const [linking, setLinking] = useState(false);

//   const currentVersionId = doc?.currentVersionId || null;
//   const currentVersion =
//     (versions || []).find((v) => v.id === currentVersionId) ||
//     doc?.currentVersion ||
//     null;

//   const isMain = (doc?.type?.kind || 'MAIN') === 'MAIN';

//   // ---------- Fetch helpers ----------

//   const fetchDocument = useCallback(async () => {
//     if (!authReady) return;
//     const res = await getDocument(
//       companyId,
//       establishmentId,
//       documentId,
//       accessToken
//     );
//     setDoc(res || null);
//   }, [authReady, companyId, establishmentId, documentId, accessToken]);

//   const fetchVersions = useCallback(async () => {
//     if (!authReady) return;
//     const res = await listVersions(
//       companyId,
//       establishmentId,
//       documentId,
//       accessToken
//     );
//     const data = res || {};
//     setVersions(data.items || data || []);
//   }, [authReady, companyId, establishmentId, documentId, accessToken]);

//   const fetchRelations = useCallback(async () => {
//     if (!authReady) return;
//     setLoadingRelations(true);
//     try {
//       // doc como PAI (MAIN -> evidências)
//       let parent = [];
//       try {
//         const resParent = await listRelations(
//           companyId,
//           establishmentId,
//           documentId,
//           { direction: 'parent', relationType: 'EVIDENCE' },
//           accessToken
//         );
//         parent = resParent?.items || resParent || [];
//       } catch (e) {
//         // se API ainda não estiver pronta, apenas ignora
//         parent = [];
//       }

//       // doc como FILHO (evidência -> pais)
//       let child = [];
//       try {
//         const resChild = await listRelations(
//           companyId,
//           establishmentId,
//           documentId,
//           { direction: 'child', relationType: 'EVIDENCE' },
//           accessToken
//         );
//         child = resChild?.items || resChild || [];
//       } catch (e) {
//         child = [];
//       }

//       setRelationsAsParent(parent);
//       setRelationsAsChild(child);
//     } finally {
//       setLoadingRelations(false);
//     }
//   }, [authReady, companyId, establishmentId, documentId, accessToken]);

//   useEffect(() => {
//     if (!authReady) return;
//     setError('');
//     setLoading(true);
//     (async () => {
//       try {
//         await Promise.all([fetchDocument(), fetchVersions()]);
//         await fetchRelations();
//       } catch (e) {
//         console.error(e);
//         setError('Falha ao carregar documento.');
//       } finally {
//         setLoading(false);
//       }
//     })();
//   }, [authReady, fetchDocument, fetchVersions, fetchRelations]);

//   // ---------- Upload nova versão (inline) ----------

//   const handleUploadSubmit = async (e) => {
//     e.preventDefault();
//     if (!selectedFile) {
//       setError('Selecione um arquivo para enviar.');
//       return;
//     }
//     setUploading(true);
//     setError('');
//     try {
//       const fd = new FormData();
//       fd.append('file', selectedFile);
//       await uploadVersion(
//         companyId,
//         establishmentId,
//         documentId,
//         fd,
//         accessToken
//       );
//       setSelectedFile(null);
//       setUploadOpen(false);
//       await Promise.all([fetchVersions(), fetchDocument()]);
//     } catch (e) {
//       console.error(e);
//       setError('Falha ao enviar nova versão.');
//     } finally {
//       setUploading(false);
//     }
//   };

//   const handleActivate = async (versionId) => {
//     setError('');
//     try {
//       await activateVersion(
//         companyId,
//         establishmentId,
//         documentId,
//         versionId,
//         accessToken
//       );
//       await Promise.all([fetchVersions(), fetchDocument()]);
//     } catch (e) {
//       console.error(e);
//       setError('Falha ao ativar versão.');
//     }
//   };

//   // ---------- Linkar evidência ----------

//   const fetchDocumentsForLink = useCallback(
//     async (query) => {
//       if (!authReady) return { items: [], total: 0 };
//       const res = await listDocuments(
//         companyId,
//         establishmentId,
//         { page: 1, pageSize: 20, q: query || '' },
//         accessToken
//       );
//       const items = res?.items || res || [];
//       // evita selecionar o próprio documento
//       const filtered = items.filter((d) => d.id !== documentId);
//       return {
//         items: filtered,
//         total: res?.total ?? filtered.length,
//       };
//     },
//     [authReady, companyId, establishmentId, documentId, accessToken]
//   );

//   const handleLinkEvidence = async () => {
//     if (!linkTarget) return;
//     setLinking(true);
//     setError('');
//     try {
//       await createRelation(
//         companyId,
//         establishmentId,
//         documentId,
//         {
//           targetDocumentId: linkTarget.id,
//           relationType: 'EVIDENCE',
//         },
//         accessToken
//       );
//       setLinkTarget(null);
//       await fetchRelations();
//     } catch (e) {
//       console.error(e);
//       setError('Falha ao vincular evidência.');
//     } finally {
//       setLinking(false);
//     }
//   };

//   const handleRemoveRelation = async (relationId) => {
//     if (!window.confirm('Remover vínculo desta evidência?')) return;
//     setError('');
//     try {
//       await deleteRelation(
//         companyId,
//         establishmentId,
//         documentId,
//         relationId,
//         accessToken
//       );
//       await fetchRelations();
//     } catch (e) {
//       console.error(e);
//       setError('Falha ao remover vínculo.');
//     }
//   };

//   // ---------- Render helpers ----------

//   const renderTabButton = (id, label) => (
//     <button
//       key={id}
//       type="button"
//       className={
//         'doc-tab' + (activeTab === id ? ' doc-tab--active' : '')
//       }
//       onClick={() => setActiveTab(id)}
//     >
//       {label}
//     </button>
//   );

//   const evidencesCount = relationsAsParent.length;
//   const parentsCount = relationsAsChild.length;

//   if (!documentId) {
//     return <div>Selecione um documento na lista.</div>;
//   }

//   if (loading && !doc) {
//     return <div>Carregando documento…</div>;
//   }

//   return (
//     <div className="container">
//       {/* Breadcrumb simples */}
//       <div style={{ marginBottom: 8, fontSize: 12 }}>
//         <button
//           type="button"
//           className="secondary"
//           onClick={() =>
//             navigate(
//               `/companies/${companyId}/establishments/${establishmentId}/documents`
//             )
//           }
//         >
//           &larr; Voltar para documentos
//         </button>
//       </div>

//       {error && <div className="error-message">{error}</div>}

//       {doc && (
//         <>
//           {/* Header "inteligente" do documento */}
//           <header
//             className="doc-header card"
//             style={{
//               padding: 16,
//               marginBottom: 12,
//               display: 'flex',
//               flexDirection: 'column',
//               gap: 8,
//             }}
//           >
//             <div
//               style={{
//                 display: 'flex',
//                 justifyContent: 'space-between',
//                 gap: 12,
//                 alignItems: 'flex-start',
//                 flexWrap: 'wrap',
//               }}
//             >
//               <div>
//                 <h2 style={{ margin: 0 }}>{doc.name}</h2>
//                 <div
//                   style={{
//                     marginTop: 4,
//                     display: 'flex',
//                     flexWrap: 'wrap',
//                     gap: 8,
//                     fontSize: 12,
//                   }}
//                 >
//                   <span className="pill pill--soft">
//                     {doc.type?.name || 'Sem tipo'}
//                   </span>
//                   <span className="pill pill--outline">
//                     {KIND_LABEL[doc.type?.kind] ||
//                       doc.type?.kind ||
//                       'Tipo não classificado'}
//                   </span>
//                   <span className="pill pill--status">
//                     Status: {doc.status}
//                   </span>
//                   {currentVersion && (
//                     <span className="pill pill--version">
//                       Versão atual: v{currentVersion.versionNumber}
//                     </span>
//                   )}
//                   {evidencesCount > 0 && isMain && (
//                     <span className="pill pill--info">
//                       {evidencesCount} evidência
//                       {evidencesCount > 1 ? 's' : ''} vinculada
//                     </span>
//                   )}
//                   {!isMain && parentsCount > 0 && (
//                     <span className="pill pill--info">
//                       Vinculado a {parentsCount} documento
//                       {parentsCount > 1 ? 's' : ''}
//                     </span>
//                   )}
//                 </div>
//               </div>

//               {/* Ações rápidas */}
//               <div
//                 style={{
//                   display: 'flex',
//                   flexDirection: 'column',
//                   gap: 6,
//                   alignItems: 'flex-end',
//                 }}
//               >
//                 {currentVersion && currentVersion.storagePath && (
//                   <ProtectedRoute inline permissions={['document.view']}>
//                     <div style={{ display: 'flex', gap: 6 }}>
//                       <a
//                         href={buildFileUrl(currentVersion.storagePath)}
//                         target="_blank"
//                         rel="noreferrer"
//                         className="secondary"
//                       >
//                         Ver versão atual
//                       </a>
//                       <a
//                         href={buildFileUrl(currentVersion.storagePath)}
//                         download={currentVersion.filename}
//                         className="secondary"
//                       >
//                         Download versão atual
//                       </a>
//                     </div>
//                   </ProtectedRoute>
//                 )}

//                 <ProtectedRoute
//                   inline
//                   permissions={['documentVersion.create']}
//                 >
//                   <button
//                     type="button"
//                     onClick={() => setUploadOpen((o) => !o)}
//                   >
//                     {uploadOpen
//                       ? 'Fechar envio de nova versão'
//                       : 'Enviar nova versão'}
//                   </button>
//                 </ProtectedRoute>
//               </div>
//             </div>

//             {doc.description && (
//               <p style={{ marginTop: 8, fontSize: 13, color: '#555' }}>
//                 {doc.description}
//               </p>
//             )}
//           </header>

//           {/* Tabs internas */}
//           <div
//             className="doc-tabs"
//             style={{
//               borderBottom: '1px solid #eee',
//               marginBottom: 12,
//               display: 'flex',
//               gap: 8,
//               flexWrap: 'wrap',
//             }}
//           >
//             {renderTabButton('summary', 'Resumo')}
//             {renderTabButton(
//               'versions',
//               `Versões${versions.length ? ` (${versions.length})` : ''}`
//             )}
//             {isMain &&
//               renderTabButton(
//                 'evidences',
//                 `Evidências${
//                   evidencesCount ? ` (${evidencesCount})` : ''
//                 }`
//               )}
//             {!isMain &&
//               parentsCount > 0 &&
//               renderTabButton(
//                 'relatedTo',
//                 `Relacionado a (${parentsCount})`
//               )}
//           </div>

//           {/* Conteúdo das tabs */}
//           {activeTab === 'summary' && (
//             <section>
//               <div className="card" style={{ padding: 16 }}>
//                 <h3 style={{ marginTop: 0 }}>Resumo do documento</h3>
//                 <div className="grid-2">
//                   <div>
//                     <strong>Nome:</strong> {doc.name}
//                     <br />
//                     <strong>Tipo:</strong>{' '}
//                     {doc.type?.name || doc.typeId || '—'}
//                     <br />
//                     <strong>Categoria:</strong>{' '}
//                     {KIND_LABEL[doc.type?.kind] ||
//                       doc.type?.kind ||
//                       '—'}
//                     <br />
//                     <strong>Status:</strong> {doc.status}
//                   </div>
//                   <div>
//                     <strong>Versão atual:</strong>{' '}
//                     {currentVersion
//                       ? `v${currentVersion.versionNumber}`
//                       : '—'}
//                     <br />
//                     <strong>Criado em:</strong>{' '}
//                     {doc.createdAt
//                       ? new Date(doc.createdAt).toLocaleString()
//                       : '—'}
//                     <br />
//                     <strong>Atualizado em:</strong>{' '}
//                     {doc.updatedAt
//                       ? new Date(doc.updatedAt).toLocaleString()
//                       : '—'}
//                   </div>
//                 </div>

//                 {isMain && (
//                   <div style={{ marginTop: 16 }}>
//                     <h4>Evidências vinculadas</h4>
//                     {loadingRelations ? (
//                       <div>Carregando evidências…</div>
//                     ) : evidencesCount ? (
//                       <ul>
//                         {relationsAsParent.map((rel) => {
//                           const target =
//                             rel.targetDocument ||
//                             rel.child ||
//                             rel.document ||
//                             rel.target ||
//                             {};
//                           return (
//                             <li key={rel.id}>
//                               <Link
//                                 to={`/companies/${companyId}/establishments/${establishmentId}/documents/${target.id}`}
//                               >
//                                 {target.name}
//                               </Link>{' '}
//                               –{' '}
//                               {target.type?.name ||
//                                 target.typeId ||
//                                 'Sem tipo'}
//                             </li>
//                           );
//                         })}
//                       </ul>
//                     ) : (
//                       <div>Nenhuma evidência vinculada ainda.</div>
//                     )}
//                   </div>
//                 )}

//                 {!isMain && (
//                   <div style={{ marginTop: 16 }}>
//                     <h4>Vinculado a</h4>
//                     {loadingRelations ? (
//                       <div>Carregando…</div>
//                     ) : parentsCount ? (
//                       <ul>
//                         {relationsAsChild.map((rel) => {
//                           const parent =
//                             rel.sourceDocument ||
//                             rel.parent ||
//                             rel.document ||
//                             rel.source ||
//                             {};
//                           return (
//                             <li key={rel.id}>
//                               <Link
//                                 to={`/companies/${companyId}/establishments/${establishmentId}/documents/${parent.id}`}
//                               >
//                                 {parent.name}
//                               </Link>{' '}
//                               –{' '}
//                               {parent.type?.name ||
//                                 parent.typeId ||
//                                 'Sem tipo'}
//                             </li>
//                           );
//                         })}
//                       </ul>
//                     ) : (
//                       <div>
//                         Nenhum documento principal vinculado. Este registro
//                         ainda não está sendo usado como evidência.
//                       </div>
//                     )}
//                   </div>
//                 )}
//               </div>
//             </section>
//           )}

//           {activeTab === 'versions' && (
//             <section>
//               <h3>Versões</h3>

//               {/* Tabela de versões */}
//               <table className="data-table">
//                 <thead>
//                   <tr>
//                     <th>#</th>
//                     <th>Arquivo</th>
//                     <th>Status</th>
//                     <th>Tamanho</th>
//                     <th>SHA-256</th>
//                     <th>Ativada em</th>
//                     <th style={{ width: 220 }}>Ações</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {(versions || []).map((v) => {
//                     const isCurrent = v.id === currentVersionId;
//                     const url = buildFileUrl(v.storagePath);
//                     return (
//                       <tr
//                         key={v.id}
//                         className={isCurrent ? 'row-highlight' : ''}
//                       >
//                         <td>v{v.versionNumber}</td>
//                         <td>{v.filename}</td>
//                         <td>{v.versionStatus}</td>
//                         <td>{v.size || '—'}</td>
//                         <td
//                           style={{
//                             maxWidth: 260,
//                             overflow: 'hidden',
//                             textOverflow: 'ellipsis',
//                             fontSize: 11,
//                           }}
//                           title={v.sha256}
//                         >
//                           {v.sha256}
//                         </td>
//                         <td>
//                           {v.activatedAt
//                             ? new Date(
//                                 v.activatedAt
//                               ).toLocaleString()
//                             : '—'}
//                         </td>
//                         <td>
//                           <div
//                             style={{
//                               display: 'flex',
//                               gap: 6,
//                               flexWrap: 'wrap',
//                             }}
//                           >
//                             {url && (
//                               <ProtectedRoute
//                                 inline
//                                 permissions={['document.view']}
//                               >
//                                 <a
//                                   href={url}
//                                   target="_blank"
//                                   rel="noreferrer"
//                                   className="secondary"
//                                 >
//                                   Ver
//                                 </a>
//                                 <a
//                                   href={url}
//                                   download={v.filename}
//                                   className="secondary"
//                                 >
//                                   Download
//                                 </a>
//                               </ProtectedRoute>
//                             )}

//                             <ProtectedRoute
//                               inline
//                               permissions={[
//                                 'documentVersion.activate',
//                               ]}
//                             >
//                               {!isCurrent && (
//                                 <button
//                                   type="button"
//                                   onClick={() =>
//                                     handleActivate(v.id)
//                                   }
//                                 >
//                                   Ativar
//                                 </button>
//                               )}
//                             </ProtectedRoute>
//                           </div>
//                         </td>
//                       </tr>
//                     );
//                   })}
//                   {!versions.length && (
//                     <tr>
//                       <td colSpan={7} style={{ textAlign: 'center' }}>
//                         Nenhuma versão enviada ainda.
//                       </td>
//                     </tr>
//                   )}
//                 </tbody>
//               </table>

//               {/* Upload inline dentro da aba de versões */}
//               <ProtectedRoute
//                 inline
//                 permissions={['documentVersion.create']}
//               >
//                 <div style={{ marginTop: 16 }}>
//                   <button
//                     type="button"
//                     onClick={() => setUploadOpen((o) => !o)}
//                   >
//                     {uploadOpen
//                       ? 'Cancelar envio'
//                       : 'Enviar nova versão'}
//                   </button>

//                   {uploadOpen && (
//                     <form
//                       onSubmit={handleUploadSubmit}
//                       className="card"
//                       style={{ marginTop: 12, padding: 16 }}
//                     >
//                       <h4 style={{ marginTop: 0 }}>
//                         Nova versão do documento
//                       </h4>
//                       <FileDropzone onFile={setSelectedFile} />
//                       {selectedFile && (
//                         <div style={{ marginTop: 8, fontSize: 13 }}>
//                           Selecionado:{' '}
//                           <strong>{selectedFile.name}</strong> (
//                           {selectedFile.size} bytes)
//                         </div>
//                       )}
//                       <div
//                         style={{
//                           marginTop: 12,
//                           display: 'flex',
//                           gap: 8,
//                         }}
//                       >
//                         <button
//                           type="submit"
//                           disabled={uploading || !selectedFile}
//                         >
//                           {uploading
//                             ? 'Enviando…'
//                             : 'Enviar versão'}
//                         </button>
//                         <button
//                           type="button"
//                           className="secondary"
//                           onClick={() => {
//                             setUploadOpen(false);
//                             setSelectedFile(null);
//                           }}
//                         >
//                           Cancelar
//                         </button>
//                       </div>
//                     </form>
//                   )}
//                 </div>
//               </ProtectedRoute>
//             </section>
//           )}

//           {activeTab === 'evidences' && isMain && (
//             <section>
//               <h3>Evidências vinculadas</h3>

//               <p style={{ fontSize: 13, color: '#555' }}>
//                 Vincule documentos que comprovam este programa/laudo
//                 (ASOs, relatórios, checklists, registros de treinamento
//                 etc.).
//               </p>

//               <ProtectedRoute inline permissions={['document.update']}>
//                 <div
//                   className="card"
//                   style={{ padding: 16, marginBottom: 16 }}
//                 >
//                   <h4 style={{ marginTop: 0 }}>Vincular evidência</h4>
//                   <AutocompleteSelect
//                     label="Documento para vincular"
//                     value={linkTarget}
//                     onChange={(item) => setLinkTarget(item)}
//                     fetcher={fetchDocumentsForLink}
//                     getKey={(it) => it.id}
//                     getLabel={(it) =>
//                       `${it.name} – ${
//                         it.type?.name || 'Sem tipo'
//                       }`
//                     }
//                     placeholder="Busque por nome ou tipo..."
//                     minChars={1}
//                     disabled={!authReady}
//                   />
//                   <div
//                     style={{
//                       marginTop: 12,
//                       display: 'flex',
//                       gap: 8,
//                     }}
//                   >
//                     <button
//                       type="button"
//                       onClick={handleLinkEvidence}
//                       disabled={!linkTarget || linking}
//                     >
//                       {linking
//                         ? 'Vinculando…'
//                         : 'Vincular como evidência'}
//                     </button>
//                     <button
//                       type="button"
//                       className="secondary"
//                       onClick={() => setLinkTarget(null)}
//                     >
//                       Limpar seleção
//                     </button>
//                   </div>
//                 </div>
//               </ProtectedRoute>

//               <div className="card" style={{ padding: 16 }}>
//                 {loadingRelations ? (
//                   <div>Carregando evidências…</div>
//                 ) : evidencesCount ? (
//                   <table className="data-table">
//                     <thead>
//                       <tr>
//                         <th>Documento</th>
//                         <th>Tipo</th>
//                         <th>Status</th>
//                         <th>Versão atual</th>
//                         <th style={{ width: 200 }}>Ações</th>
//                       </tr>
//                     </thead>
//                     <tbody>
//                       {relationsAsParent.map((rel) => {
//                         const d =
//                           rel.targetDocument ||
//                           rel.child ||
//                           rel.document ||
//                           rel.target ||
//                           {};
//                         const current =
//                           d.currentVersion || null;
//                         const url = current
//                           ? buildFileUrl(
//                               current.storagePath
//                             )
//                           : null;

//                         return (
//                           <tr key={rel.id}>
//                             <td>
//                               <Link
//                                 to={`/companies/${companyId}/establishments/${establishmentId}/documents/${d.id}`}
//                               >
//                                 {d.name}
//                               </Link>
//                             </td>
//                             <td>
//                               {d.type?.name ||
//                                 d.typeId ||
//                                 'Sem tipo'}
//                             </td>
//                             <td>{d.status || '—'}</td>
//                             <td>
//                               {current
//                                 ? `v${current.versionNumber}`
//                                 : '—'}
//                             </td>
//                             <td>
//                               <div
//                                 style={{
//                                   display: 'flex',
//                                   gap: 6,
//                                   flexWrap: 'wrap',
//                                 }}
//                               >
//                                 {url && (
//                                   <ProtectedRoute
//                                     inline
//                                     permissions={[
//                                       'document.view',
//                                     ]}
//                                   >
//                                     <a
//                                       href={url}
//                                       target="_blank"
//                                       rel="noreferrer"
//                                       className="secondary"
//                                     >
//                                       Ver
//                                     </a>
//                                     <a
//                                       href={url}
//                                       download={
//                                         current.filename
//                                       }
//                                       className="secondary"
//                                     >
//                                       Download
//                                     </a>
//                                   </ProtectedRoute>
//                                 )}

//                                 <ProtectedRoute
//                                   inline
//                                   permissions={[
//                                     'document.update',
//                                   ]}
//                                 >
//                                   <button
//                                     type="button"
//                                     onClick={() =>
//                                       handleRemoveRelation(
//                                         rel.id
//                                       )
//                                     }
//                                   >
//                                     Remover vínculo
//                                   </button>
//                                 </ProtectedRoute>
//                               </div>
//                             </td>
//                           </tr>
//                         );
//                       })}
//                     </tbody>
//                   </table>
//                 ) : (
//                   <div>
//                     Nenhuma evidência vinculada ainda. Use o bloco
//                     acima para associar documentos existentes como
//                     evidência SST.
//                   </div>
//                 )}
//               </div>
//             </section>
//           )}

//           {activeTab === 'relatedTo' && !isMain && (
//             <section>
//               <h3>Relacionado a</h3>
//               <p style={{ fontSize: 13, color: '#555' }}>
//                 Este documento está sendo utilizado como evidência para
//                 os seguintes programas/laudos:
//               </p>

//               <div className="card" style={{ padding: 16 }}>
//                 {loadingRelations ? (
//                   <div>Carregando…</div>
//                 ) : parentsCount ? (
//                   <table className="data-table">
//                     <thead>
//                       <tr>
//                         <th>Documento principal</th>
//                         <th>Tipo</th>
//                         <th>Status</th>
//                         <th>Versão atual</th>
//                         <th style={{ width: 180 }}>Ações</th>
//                       </tr>
//                     </thead>
//                     <tbody>
//                       {relationsAsChild.map((rel) => {
//                         const d =
//                           rel.sourceDocument ||
//                           rel.parent ||
//                           rel.document ||
//                           rel.source ||
//                           {};
//                         const current =
//                           d.currentVersion || null;
//                         const url = current
//                           ? buildFileUrl(
//                               current.storagePath
//                             )
//                           : null;
//                         return (
//                           <tr key={rel.id}>
//                             <td>
//                               <Link
//                                 to={`/companies/${companyId}/establishments/${establishmentId}/documents/${d.id}`}
//                               >
//                                 {d.name}
//                               </Link>
//                             </td>
//                             <td>
//                               {d.type?.name ||
//                                 d.typeId ||
//                                 'Sem tipo'}
//                             </td>
//                             <td>{d.status || '—'}</td>
//                             <td>
//                               {current
//                                 ? `v${current.versionNumber}`
//                                 : '—'}
//                             </td>
//                             <td>
//                               <div
//                                 style={{
//                                   display: 'flex',
//                                   gap: 6,
//                                   flexWrap: 'wrap',
//                                 }}
//                               >
//                                 {url && (
//                                   <ProtectedRoute
//                                     inline
//                                     permissions={[
//                                       'document.view',
//                                     ]}
//                                   >
//                                     <a
//                                       href={url}
//                                       target="_blank"
//                                       rel="noreferrer"
//                                       className="secondary"
//                                     >
//                                       Ver
//                                     </a>
//                                     <a
//                                       href={url}
//                                       download={
//                                         current.filename
//                                       }
//                                       className="secondary"
//                                     >
//                                       Download
//                                     </a>
//                                   </ProtectedRoute>
//                                 )}
//                               </div>
//                             </td>
//                           </tr>
//                         );
//                       })}
//                     </tbody>
//                   </table>
//                 ) : (
//                   <div>
//                     Este documento ainda não está vinculado a nenhum
//                     PGR/PCMSO/LTCAT/AET. Você pode criar vínculos a
//                     partir da aba <strong>Evidências</strong> dos
//                     documentos principais.
//                   </div>
//                 )}
//               </div>
//             </section>
//           )}
//         </>
//       )}
//     </div>
//   );
// }
