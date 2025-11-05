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

  useEffect(() => {
    const initAuth = async () => {
      try {
        const savedToken = localStorage.getItem('access_token');

        if (savedToken) {
          const decoded = decodeJwt(savedToken);
          if (decoded && decoded.exp * 1000 > Date.now()) {
            await login(savedToken, false);
          } else {
            await tryRefresh();
          }
        } else {
          await tryRefresh();
        }
      } catch (error) {
        // se refresh falhar, ficamos deslogados (sem relogar)
        console.error('[Auth] initAuth error:', error);
        hardResetAuthState();
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

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
          } catch (e) {
            // refresh falhou → seguimos rejeitando sem relogar
          }
        }
        return Promise.reject(error);
      }
    );
    return () => api.interceptors.response.eject(interceptor);
  }, []);

  const tryRefresh = async () => {
    try {
      const res = await api.post('/api/auth/refresh', {}, { withCredentials: true });
      const newToken = res.data?.accessToken;
      if (!newToken) throw new Error('Sem accessToken no refresh');
      await login(newToken, false);
      return newToken;
    } catch (err) {
      console.warn('[Auth] Refresh falhou:', err?.message || err);
      // não chama logout() aqui para não reencadear efeitos;
      hardResetAuthState();
      throw err;
    }
  };

  const setUserFromApi = async (token) => {
    try {
      const res = await api.get('/api/users/me', {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
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
    // alert('Login'); // remova debug pra não confundir
    if (storeLocal) {
      localStorage.setItem('access_token', token);
    }
    setAccessToken(token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    await setUserFromApi(token);
  };

  // Limpa apenas o estado local (sem chamar servidor)
  const hardResetAuthState = () => {
    localStorage.removeItem('access_token');
    setAccessToken(null);
    setUser(null);
    setPermissions([]);
    delete api.defaults.headers.common['Authorization'];
  };

  // Logout completo: limpa estado + invalida refresh cookie no backend
  const logout = async () => {
    try {
      isLoggingOutRef.current = true;
      await api.post('/api/auth/logout', {}, { withCredentials: true }); 
      // ^ este endpoint deve apagar/invalidar o refresh cookie no servidor
    } catch (e) {
      console.warn('[Auth] Erro ao chamar /auth/logout:', e?.message || e);
    } finally {
      hardResetAuthState();
      isLoggingOutRef.current = false;
    }
  };

  return (
    <AuthContext.Provider value={{ user, accessToken, permissions, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
