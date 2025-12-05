// import React, {
//   createContext,
//   useContext,
//   useState,
//   useEffect,
//   useRef,
// } from 'react';
// import api from '../../../api/axios';

// const AuthContext = createContext();

// export function AuthProvider({ children }) {
//   const [user, setUser] = useState(null);
//   const [accessToken, setAccessToken] = useState(null);
//   const [permissions, setPermissions] = useState([]);
//   const [loading, setLoading] = useState(true);

//   // Flag para evitar refresh durante/logout
//   const isLoggingOutRef = useRef(false);

//   // --- helpers internos ---

//   // Limpa apenas o estado local (sem chamar servidor)
//   const hardResetAuthState = () => {
//     localStorage.removeItem('access_token');
//     setAccessToken(null);
//     setUser(null);
//     setPermissions([]);
//     delete api.defaults.headers.common['Authorization'];
//   };

//   const applyAccessToken = (token, storeLocal = true) => {
//     if (storeLocal) {
//       localStorage.setItem('access_token', token);
//     }
//     setAccessToken(token);
//     api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
//   };

//   // Login interativo: email/senha -> /auth/login -> token + user + portalContext
//   const login = async (email, password) => {
//     const res = await api.post(
//       '/api/auth/login',
//       { email, password },
//       { withCredentials: true },
//     );

//     const {
//       accessToken: token,
//       user: apiUser,
//       portalContext,
//     } = res.data || {};

//     if (!token || !apiUser) {
//       throw new Error('Invalid login response');
//     }

//     applyAccessToken(token, true);

//     const fullUser = {
//       ...apiUser,
//       portalContext: portalContext || null,
//     };

//     setUser(fullUser);
//     setPermissions(fullUser?.profile?.permissions || []);

//     // devolve o user pro LoginPage poder decidir pra onde navegar
//     return fullUser;
//   };

//   const tryRefresh = async () => {
//     try {
//       const res = await api.post(
//         '/api/auth/refresh',
//         {},
//         { withCredentials: true },
//       );
//       const {
//         accessToken: newToken,
//         user: apiUser,
//         portalContext,
//       } = res.data || {};

//       if (!newToken || !apiUser) {
//         throw new Error('Sem accessToken no refresh');
//       }

//       applyAccessToken(newToken, false);

//       const fullUser = {
//         ...apiUser,
//         portalContext: portalContext || null,
//       };

//       setUser(fullUser);
//       setPermissions(fullUser?.profile?.permissions || []);

//       return newToken;
//     } catch (err) {
//       const status = err?.response?.status;
//       const msg = err?.response?.data?.message;

//       // 400 = sem cookie (usuário nunca logou ou cookie expirou)
//       // 401 = refresh inválido/expirado → trata como sessão expirada
//       if (status === 400 || status === 401) {
//         console.info(
//           '[Auth] Refresh não disponível ou inválido:',
//           status,
//           msg,
//         );
//         hardResetAuthState();
//         return null; // NÃO relança erro → initAuth segue fluxo "não logado"
//       }

//       console.warn(
//         '[Auth] Refresh falhou (erro inesperado):',
//         err?.message || err,
//       );
//       hardResetAuthState();
//       throw err; // só erros realmente inesperados sobem
//     }
//   };

//   const logout = async () => {
//     try {
//       isLoggingOutRef.current = true;
//       await api.post(
//         '/api/auth/logout',
//         {},
//         { withCredentials: true },
//       );
//     } catch (e) {
//       console.warn(
//         '[Auth] Erro ao chamar /auth/logout:',
//         e?.message || e,
//       );
//     } finally {
//       hardResetAuthState();
//       isLoggingOutRef.current = false;
//     }
//   };

//   // --- initAuth (ao montar app) ---
//   useEffect(() => {
//     const initAuth = async () => {
//       try {
//         const savedToken = localStorage.getItem('access_token');

//         if (savedToken) {
//           // tenta reaproveitar o token chamando /users/me
//           applyAccessToken(savedToken, false);
//           try {
//             const res = await api.get('/api/users/me', {
//               withCredentials: true,
//             });
//             const apiUser = res.data?.user;
//             const portalContext = res.data?.portalContext || null;

//             if (!apiUser) throw new Error('Resposta sem usuário');

//             const fullUser = {
//               ...apiUser,
//               portalContext,
//             };

//             setUser(fullUser);
//             setPermissions(fullUser?.profile?.permissions || []);
//             return; // já hidratou, não precisa tentar refresh
//           } catch (err) {
//             console.warn(
//               '[Auth] Token salvo inválido, tentando refresh...',
//               err?.message || err,
//             );
//             hardResetAuthState();
//           }
//         }

//         // Se não tinha token salvo ou falhou, tenta refresh por cookie
//         await tryRefresh();
//       } catch (error) {
//         console.error('[Auth] initAuth error (inesperado):', error);
//         hardResetAuthState();
//       } finally {
//         setLoading(false);
//       }
//     };

//     initAuth();
//   }, []);

//   // --- interceptor 401 → tenta refresh automático ---
//   useEffect(() => {
//     const interceptor = api.interceptors.response.use(
//       (res) => res,
//       async (error) => {
//         const original = error.config || {};
//         if (
//           error.response &&
//           error.response.status === 401 &&
//           !original._retry &&
//           !isLoggingOutRef.current
//         ) {
//           original._retry = true;
//           try {
//             const newToken = await tryRefresh();
//             if (newToken) {
//               original.headers = original.headers || {};
//               original.headers['Authorization'] = `Bearer ${newToken}`;
//               return api(original);
//             }
//           } catch {
//             // tryRefresh já limpou estado; segue rejeitando
//           }
//         }
//         return Promise.reject(error);
//       },
//     );
//     return () => api.interceptors.response.eject(interceptor);
//   }, []);

//   return (
//     <AuthContext.Provider
//       value={{ user, accessToken, permissions, login, logout, loading }}
//     >
//       {children}
//     </AuthContext.Provider>
//   );
// }

// export function useAuth() {
//   return useContext(AuthContext);
// }
