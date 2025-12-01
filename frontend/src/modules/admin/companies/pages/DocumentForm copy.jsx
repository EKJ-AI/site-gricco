// // src/modules/companies/pages/DocumentForm.jsx
// import React, { useEffect, useState, useCallback } from 'react';
// import { createDocument, getDocument, updateDocument } from '../api/documents';
// import { searchDocumentTypes } from '../api/documents';
// import { useAuth } from '../../../auth/contexts/AuthContext';
// import { useNavigate, useParams } from 'react-router-dom';
// import AutocompleteSelect from '../components/AutocompleteSelect.jsx';

// const DOCUMENT_STATUS = ['DRAFT', 'ACTIVE', 'INACTIVE'];

// export default function DocumentForm({ mode = 'create' }) {
//   const { accessToken } = useAuth();
//   const { companyId, establishmentId, documentId } = useParams();
//   const navigate = useNavigate();

//   const [form, setForm] = useState({
//     name: '',
//     typeId: '',
//     description: '',
//     status: 'DRAFT',
//   });
//   const [selectedType, setSelectedType] = useState(null);
//   const [error, setError] = useState('');
//   const [loadingDoc, setLoadingDoc] = useState(mode === 'edit');

//   useEffect(() => {
//     if (mode === 'edit' && documentId && accessToken) {
//       setLoadingDoc(true);
//       getDocument(companyId, establishmentId, documentId, accessToken)
//         .then((d) => {
//           if (!d) return;
//           setForm({
//             name: d.name || '',
//             typeId: d.typeId || '',
//             description: d.description || '',
//             status: d.status || 'DRAFT',
//           });
//           setSelectedType(d.type || null);
//         })
//         .catch(() => {
//           setError('Failed to load document.');
//         })
//         .finally(() => setLoadingDoc(false));
//     }
//   }, [mode, companyId, establishmentId, documentId, accessToken]);

//   const fetchDocumentTypes = useCallback(
//     async (query) => {
//       if (!accessToken) return { items: [], total: 0 };
//       const res = await searchDocumentTypes(query, accessToken);
//       return {
//         items: res?.items || [],
//         total: res?.total || 0,
//       };
//     },
//     [accessToken]
//   );

//   const submit = async (e) => {
//     e.preventDefault();
//     setError('');

//     if (!form.name.trim()) {
//       setError('Name is required.');
//       return;
//     }
//     if (!form.typeId) {
//       setError('Document Type is required.');
//       return;
//     }

//     try {
//       if (mode === 'edit') {
//         await updateDocument(
//           companyId,
//           establishmentId,
//           documentId,
//           {
//             name: form.name.trim(),
//             typeId: form.typeId,
//             description: form.description || null,
//             // status normalmente é controlado pelas versões; mantemos leitura apenas,
//             ...(DOCUMENT_STATUS.includes(form.status)
//               ? { status: form.status }
//               : {}),
//           },
//           accessToken
//         );
//       } else {
//         await createDocument(
//           companyId,
//           establishmentId,
//           {
//             name: form.name.trim(),
//             typeId: form.typeId,
//             description: form.description || null,
//             // status inicial DRAFT (default do backend)
//           },
//           accessToken
//         );
//       }
//       navigate(
//         `/companies/${companyId}/establishments/${establishmentId}/documents`
//       );
//     } catch {
//       setError('Failed to save.');
//     }
//   };

//   return (
//     <div className="container">
//       <h2>{mode === 'edit' ? 'Edit Document' : 'New Document'}</h2>
//       {error && <div className="error-message">{error}</div>}
//       {loadingDoc ? (
//         <div>Loading…</div>
//       ) : (
//         <form className="form" onSubmit={submit}>
//           <div className="grid-2">
//             <div>
//               <label>
//                 Name
//                 <input
//                   placeholder="Document name"
//                   value={form.name}
//                   onChange={(e) =>
//                     setForm((f) => ({ ...f, name: e.target.value }))
//                   }
//                   required
//                 />
//               </label>
//             </div>
//             <div>
//               <AutocompleteSelect
//                 label="Document Type"
//                 value={selectedType}
//                 onChange={(item) => {
//                   setSelectedType(item);
//                   setForm((f) => ({
//                     ...f,
//                     typeId: item?.id || '',
//                   }));
//                 }}
//                 fetcher={fetchDocumentTypes}
//                 getKey={(it) => it.id}
//                 getLabel={(it) => it.name}
//                 placeholder="Search document types..."
//                 minChars={1}
//                 disabled={!accessToken}
//               />
//             </div>
//           </div>

//           <div style={{ marginTop: 12 }}>
//             <label>
//               Description
//               <textarea
//                 rows={3}
//                 placeholder="Optional description (e.g. NR, scope, observations)..."
//                 value={form.description}
//                 onChange={(e) =>
//                   setForm((f) => ({ ...f, description: e.target.value }))
//                 }
//               />
//             </label>
//           </div>

//           {mode === 'edit' && (
//             <div style={{ marginTop: 12 }}>
//               <label>
//                 Status (read-only, controlled by versions)
//                 <input value={form.status} readOnly />
//               </label>
//             </div>
//           )}

//           <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
//             <button type="submit">Save</button>
//             <button
//               type="button"
//               className="secondary"
//               onClick={() => navigate(-1)}
//             >
//               Cancel
//             </button>
//           </div>
//         </form>
//       )}
//     </div>
//   );
// }
