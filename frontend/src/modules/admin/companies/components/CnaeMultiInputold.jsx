// import React, { useCallback, useMemo, useState } from 'react';
// import { useAuth } from '../../../auth/contexts/AuthContext.js';
// import AutocompleteSelect from './AutocompleteSelect.jsx';
// import { searchCNAE } from '../api/catalog.js';

// /**
//  * value: [
//  *   { code: string, title: string, riskLevel: number | null }
//  * ]
//  * onChange(next: value[])
//  */
// export default function CnaeMultiInput({ value = [], onChange, disabled = false }) {
//   const { accessToken } = useAuth();

//   const [modalOpen, setModalOpen] = useState(false);
//   const [modalItems, setModalItems] = useState([]);
//   const [modalLoading, setModalLoading] = useState(false);
//   const [modalRowIndex, setModalRowIndex] = useState(null);

//   // Garante que sempre tenha pelo menos 1 linha “visual”
//   const rows = useMemo(
//     () =>
//       Array.isArray(value) && value.length
//         ? value
//         : [
//             {
//               code: '',
//               title: '',
//               riskLevel: null,
//             },
//           ],
//     [value],
//   );

//   const safeOnChange = useCallback(
//     (next) => {
//       if (!onChange) return;
//       // Filtra linhas vazias (sem código)
//       const cleaned = (next || []).filter((row) => row && row.code);
//       onChange(cleaned);
//     },
//     [onChange],
//   );

//   const updateRow = useCallback(
//     (index, patch) => {
//       const next = rows.map((row, i) =>
//         i === index
//           ? {
//               ...row,
//               ...patch,
//             }
//           : row,
//       );
//       safeOnChange(next);
//     },
//     [rows, safeOnChange],
//   );

//   const handleSelectCnae = useCallback(
//     (index, item) => {
//       if (!item) {
//         updateRow(index, { code: '', title: '', riskLevel: null });
//         return;
//       }

//       const nrRisk =
//         item.riskLevel ??
//         item.nrRisk ??
//         (item.cnae && item.cnae.nrRisk != null ? item.cnae.nrRisk : null);

//       updateRow(index, {
//         code: item.code || '',
//         title: item.title || '',
//         riskLevel: nrRisk != null ? Number(nrRisk) : null,
//       });
//     },
//     [updateRow],
//   );

//   const handleChangeRisk = useCallback(
//     (index, raw) => {
//       const trimmed = String(raw || '').trim();
//       if (!trimmed) {
//         updateRow(index, { riskLevel: null });
//         return;
//       }
//       const n = Number(trimmed);
//       if (Number.isNaN(n)) {
//         updateRow(index, { riskLevel: null });
//         return;
//       }
//       // Grau de risco NR-4 normalmente 1–4; mas deixo mais solto
//       updateRow(index, { riskLevel: n });
//     },
//     [updateRow],
//   );

//   const handleAddRow = useCallback(() => {
//     const next = [...rows, { code: '', title: '', riskLevel: null }];
//     safeOnChange(next);
//   }, [rows, safeOnChange]);

//   const handleRemoveRow = useCallback(
//     (index) => {
//       // Remove a linha; se ficar vazio, pai receberá [] e aqui a UI
//       // volta a mostrar uma linha “fake” pelo useMemo(rows)
//       const next = rows.filter((_, i) => i !== index);
//       safeOnChange(next);
//     },
//     [rows, safeOnChange],
//   );

//   // Autocomplete de CNAE
//   const fetchCnaeOptions = useCallback(
//     async (query) => {
//       if (!accessToken) return { items: [], total: 0 };

//       const res = await searchCNAE(query || '', 1, 20, accessToken);
//       const items = res?.items || [];
//       return {
//         items,
//         total: res?.total ?? items.length ?? 0,
//       };
//     },
//     [accessToken],
//   );

//   // Modal “Ver todos CNAEs” para uma linha específica
//   const openModalForRow = useCallback(
//     async (rowIndex) => {
//       setModalRowIndex(rowIndex);
//       setModalOpen(true);

//       if (!accessToken) {
//         setModalItems([]);
//         return;
//       }

//       setModalLoading(true);
//       try {
//         const res = await searchCNAE('', 1, 500, accessToken);
//         const data = res || {};
//         setModalItems(data.items || data || []);
//       } catch (e) {
//         console.error('Failed to load CNAEs for modal', e);
//         setModalItems([]);
//       } finally {
//         setModalLoading(false);
//       }
//     },
//     [accessToken],
//   );

//   const handleSelectFromModal = useCallback(
//     (item) => {
//       if (modalRowIndex == null) return;
//       handleSelectCnae(modalRowIndex, item);
//       setModalOpen(false);
//     },
//     [modalRowIndex, handleSelectCnae],
//   );

//   const canEdit = !!accessToken && !disabled;

//   return (
//     <div
//       className="card"
//       style={{
//         padding: 12,
//         marginTop: 8,
//       }}
//     >
//       <div
//         style={{
//           display: 'flex',
//           justifyContent: 'space-between',
//           alignItems: 'center',
//           marginBottom: 8,
//           gap: 8,
//           flexWrap: 'wrap',
//         }}
//       >
//         <div>
//           <div style={{ fontWeight: 600 }}>CNAEs do estabelecimento</div>
//           <div style={{ fontSize: 12, color: '#555' }}>
//             Cadastre os CNAEs da empresa/estabelecimento. O grau de risco
//             será sugerido a partir da tabela NR, mas pode ser ajustado.
//           </div>
//         </div>

//         {canEdit && (
//           <button type="button" onClick={handleAddRow}>
//             Adicionar CNAE
//           </button>
//         )}
//       </div>

//       <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
//         {rows.map((row, index) => {
//           const selectedItem = row.code
//             ? {
//                 code: row.code,
//                 title: row.title,
//                 nrRisk: row.riskLevel,
//               }
//             : null;

//           return (
//             <div
//               key={row.code || `row-${index}`}
//               className="grid-3"
//               style={{
//                 alignItems: 'flex-start',
//                 borderTop: index === 0 ? 'none' : '1px dashed #eee',
//                 paddingTop: index === 0 ? 0 : 8,
//                 marginTop: index === 0 ? 0 : 4,
//               }}
//             >
//               {/* CNAE (autocomplete + botão ver todos) */}
//               <div>
//                 <AutocompleteSelect
//                   label={index === 0 ? 'CNAE' : 'CNAE (adicional)'}
//                   value={selectedItem}
//                   onChange={(item) => handleSelectCnae(index, item)}
//                   fetcher={fetchCnaeOptions}
//                   getKey={(it) => it.id ?? it.code}
//                   getLabel={(it) =>
//                     `${it.code} - ${it.title}${
//                       it.nrRisk != null
//                         ? ` (Risco ${it.nrRisk})`
//                         : ''
//                     }`
//                   }
//                   placeholder="Buscar CNAE por código ou descrição..."
//                   minChars={0}
//                   disabled={!canEdit}
//                 />
//                 {canEdit && (
//                   <div
//                     style={{
//                       display: 'flex',
//                       gap: 8,
//                       alignItems: 'center',
//                       marginTop: 4,
//                       flexWrap: 'wrap',
//                     }}
//                   >
//                     <button
//                       type="button"
//                       className="secondary"
//                       onClick={() => openModalForRow(index)}
//                     >
//                       Ver todos CNAEs
//                     </button>
//                   </div>
//                 )}
//               </div>

//               {/* Grau de risco */}
//               <div>
//                 <label style={{ fontSize: 12, display: 'block' }}>
//                   Grau de risco (NR)
//                 </label>
//                 <input
//                   type="number"
//                   min={1}
//                   max={4}
//                   placeholder="Ex.: 3"
//                   value={row.riskLevel ?? ''}
//                   onChange={(e) =>
//                     handleChangeRisk(index, e.target.value)
//                   }
//                   disabled={!canEdit}
//                 />
//                 <div
//                   style={{
//                     fontSize: 11,
//                     color: '#777',
//                     marginTop: 4,
//                   }}
//                 >
//                   Se deixado em branco, o sistema pode considerar o grau
//                   padrão desse CNAE (quando disponível).
//                 </div>
//               </div>

//               {/* Remover linha */}
//               <div
//                 style={{
//                   display: 'flex',
//                   alignItems: 'center',
//                   justifyContent: 'flex-end',
//                 }}
//               >
//                 {canEdit && rows.length > 1 && (
//                   <button
//                     type="button"
//                     className="secondary"
//                     onClick={() => handleRemoveRow(index)}
//                   >
//                     Remover
//                   </button>
//                 )}
//               </div>
//             </div>
//           );
//         })}
//       </div>

//       {/* ---------- Modal de CNAEs ---------- */}
//       {modalOpen && (
//         <div
//           style={{
//             position: 'fixed',
//             inset: 0,
//             backgroundColor: 'rgba(0,0,0,0.35)',
//             display: 'flex',
//             alignItems: 'center',
//             justifyContent: 'center',
//             zIndex: 999,
//           }}
//         >
//           <div
//             style={{
//               background: '#fff',
//               borderRadius: 8,
//               padding: 16,
//               width: '90%',
//               maxWidth: 900,
//               maxHeight: '80vh',
//               display: 'flex',
//               flexDirection: 'column',
//             }}
//           >
//             <div
//               style={{
//                 display: 'flex',
//                 justifyContent: 'space-between',
//                 alignItems: 'center',
//                 marginBottom: 8,
//               }}
//             >
//               <h3 style={{ margin: 0 }}>Catálogo de CNAEs</h3>
//               <button
//                 type="button"
//                 className="secondary"
//                 onClick={() => setModalOpen(false)}
//               >
//                 Fechar
//               </button>
//             </div>

//             <div
//               style={{
//                 fontSize: 13,
//                 marginBottom: 8,
//                 color: '#555',
//               }}
//             >
//               Lista de CNAEs cadastrados no sistema. Clique em uma linha
//               para selecionar o CNAE para este estabelecimento. O grau de
//               risco será sugerido automaticamente quando houver.
//             </div>

//             <div
//               style={{
//                 flex: 1,
//                 overflow: 'auto',
//                 border: '1px solid #eee',
//                 borderRadius: 4,
//               }}
//             >
//               {modalLoading ? (
//                 <div style={{ padding: 12 }}>Carregando CNAEs…</div>
//               ) : (
//                 <table className="data-table" style={{ margin: 0 }}>
//                   <thead>
//                     <tr>
//                       <th>Código</th>
//                       <th>Descrição</th>
//                       <th>Grau de risco</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {modalItems.map((cnae) => (
//                       <tr
//                         key={cnae.id ?? cnae.code}
//                         style={{ cursor: 'pointer' }}
//                         onClick={() => handleSelectFromModal(cnae)}
//                       >
//                         <td>{cnae.code}</td>
//                         <td>{cnae.title}</td>
//                         <td>
//                           {cnae.nrRisk != null
//                             ? cnae.nrRisk
//                             : '—'}
//                         </td>
//                       </tr>
//                     ))}
//                     {!modalItems.length && (
//                       <tr>
//                         <td colSpan={3} style={{ textAlign: 'center' }}>
//                           Nenhum CNAE encontrado.
//                         </td>
//                       </tr>
//                     )}
//                   </tbody>
//                 </table>
//               )}
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }
