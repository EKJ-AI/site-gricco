import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../../../api/axios';
import { decodeJwt } from '../../../shared/utils/jwt';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  /**
   * Inicializa a autenticação ao montar o app
   */
  useEffect(() => {
    const initAuth = async () => {
      try {
        const savedToken = localStorage.getItem('access_token');

        if (savedToken) {
          const decoded = decodeJwt(savedToken);
          if (decoded && decoded.exp * 1000 > Date.now()) {
            console.log('[Auth] ✅ Token válido no localStorage');
            await login(savedToken, false);
          } else {
            console.warn('[Auth] ⚠️ Token expirado — tentando refresh');
            await tryRefresh();
          }
        } else {
          console.log('[Auth] ⚠️ Nenhum token salvo — tentando refresh');
          await tryRefresh();
        }
      } catch (error) {
        console.error('[Auth] ❌ Erro ao inicializar auth:', error);
        logout();
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  /**
   * Interceptor global: se 401 ➜ tenta refresh
   */
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      res => res,
      async (error) => {
        if (
          error.response &&
          error.response.status === 401 &&
          !error.config._retry
        ) {
          error.config._retry = true;
          console.warn('[Auth] ⚠️ 401 recebido — tentando refresh automático');

          const newToken = await tryRefresh();
          if (newToken) {
            error.config.headers['Authorization'] = `Bearer ${newToken}`;
            return api(error.config);
          }
        }
        return Promise.reject(error);
      }
    );
    return () => api.interceptors.response.eject(interceptor);
  }, []);

  /**
   * Faz refresh no token usando cookie HttpOnly
   */
  const tryRefresh = async () => {
  try {
    const res = await api.post('/api/auth/refresh', {}, { withCredentials: true });
    if (res.data && res.data.accessToken) {
      console.log('[Auth] ✅ Refresh bem-sucedido');
      login(res.data.accessToken, false);
      return res.data.accessToken;
    }
    throw new Error('Sem accessToken');
  } catch (err) {
    console.error('[Auth] ❌ Refresh falhou:', err.message);
    logout();
    throw err;
  }
};

  /**
   * Decodifica token e busca user do backend
   */
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
      console.error('[Auth] ❌ Falha ao carregar usuário via /users/me:', err.message);
      logout();
    }
  };

  /**
   * Login: salva token e busca perfil completo
   */
  const login = async (token, storeLocal = true) => {
    alert('Login');
    console.log('[Auth] 🔑 Iniciando login', storeLocal);
    if (storeLocal) {
      localStorage.setItem('access_token', token);
    }
    setAccessToken(token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    await setUserFromApi(token);
    console.log('[Auth] ✅ Login completo com usuário carregado');
  };

  /**
   * Logout completo
   */
  const logout = () => {
    console.log('[Auth] 🔒 Efetuando logout');
    localStorage.removeItem('access_token');
    setAccessToken(null);
    setUser(null);
    setPermissions([]);
    delete api.defaults.headers.common['Authorization'];
    console.log('[Auth] ✅ Logout efetuado');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        permissions,
        login,
        logout,
        loading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
