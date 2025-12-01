import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import api from '../../../api/axios';
import { decodeJwt } from '../../../shared/utils/jwt';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Flag para evitar refresh durante/logout
  const isLoggingOutRef = useRef(false);

  // --- helpers internos ---

  // Limpa apenas o estado local (sem chamar servidor)
  const hardResetAuthState = () => {
    localStorage.removeItem('access_token');
    setAccessToken(null);
    setUser(null);
    setPermissions([]);
    delete api.defaults.headers.common['Authorization'];
  };

  const setUserFromApi = async (token) => {
    try {
      const res = await api.get('/api/users/me', {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      const apiUser = res.data?.user;
      if (!apiUser) throw new Error('Resposta sem usuário');

      setUser(apiUser);
      setPermissions(apiUser?.profile?.permissions || []);
    } catch (err) {
      console.error('[Auth] /users/me falhou:', err?.message || err);
      hardResetAuthState();
      throw err;
    }
  };

  const login = async (token, storeLocal = true) => {
    if (storeLocal) {
      localStorage.setItem('access_token', token);
    }
    setAccessToken(token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    await setUserFromApi(token);
  };

  const tryRefresh = async () => {
    try {
      const res = await api.post(
        '/api/auth/refresh',
        {},
        { withCredentials: true }
      );
      const newToken = res.data?.accessToken;
      if (!newToken) throw new Error('Sem accessToken no refresh');

      await login(newToken, false);
      return newToken;
    } catch (err) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message;

      // 400 = sem cookie (usuário nunca logou ou cookie expirou)
      // 401 = refresh inválido/expirado → trata como sessão expirada
      if (status === 400 || status === 401) {
        console.info('[Auth] Refresh não disponível ou inválido:', status, msg);
        hardResetAuthState();
        return null; // NÃO relança erro → initAuth segue fluxo "não logado"
      }

      console.warn('[Auth] Refresh falhou (erro inesperado):', err?.message || err);
      hardResetAuthState();
      throw err; // só erros realmente inesperados sobem
    }
  };

  const logout = async () => {
    try {
      isLoggingOutRef.current = true;
      await api.post(
        '/api/auth/logout',
        {},
        { withCredentials: true }
      );
    } catch (e) {
      console.warn('[Auth] Erro ao chamar /auth/logout:', e?.message || e);
    } finally {
      hardResetAuthState();
      isLoggingOutRef.current = false;
    }
  };

  // --- initAuth (ao montar app) ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        const savedToken = localStorage.getItem('access_token');

        if (savedToken) {
          const decoded = decodeJwt(savedToken);
          if (decoded && decoded.exp * 1000 > Date.now()) {
            // token ainda válido → reaproveita
            await login(savedToken, false);
          } else {
            // token expirado → tenta refresh
            await tryRefresh();
          }
        } else {
          // nunca logou neste browser → tenta refresh (pode existir cookie)
          await tryRefresh();
        }
      } catch (error) {
        // Só cai aqui se tryRefresh der erro inesperado (500, network, etc.)
        console.error('[Auth] initAuth error (inesperado):', error);
        hardResetAuthState();
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // --- interceptor 401 → tenta refresh automático ---
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (res) => res,
      async (error) => {
        const original = error.config || {};
        if (
          error.response &&
          error.response.status === 401 &&
          !original._retry &&
          !isLoggingOutRef.current
        ) {
          original._retry = true;
          try {
            const newToken = await tryRefresh();
            if (newToken) {
              original.headers = original.headers || {};
              original.headers['Authorization'] = `Bearer ${newToken}`;
              return api(original);
            }
          } catch {
            // tryRefresh já limpou estado; segue rejeitando
          }
        }
        return Promise.reject(error);
      }
    );
    return () => api.interceptors.response.eject(interceptor);
  }, []);

  return (
    <AuthContext.Provider value={{ user, accessToken, permissions, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
