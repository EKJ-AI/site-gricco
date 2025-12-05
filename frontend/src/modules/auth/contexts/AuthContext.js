import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from 'react';
import api from '../../../api/axios';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const isLoggingOutRef = useRef(false);

  // Limpa apenas o estado local (sem chamar servidor)
  const hardResetAuthState = () => {
    localStorage.removeItem('access_token');
    setAccessToken(null);
    setUser(null);
    setPermissions([]);
    delete api.defaults.headers.common['Authorization'];
  };

  // Aplica resposta de login/refresh (token + user + portalContext)
  const applyAuthResponse = (token, apiUser, portalContext) => {
    if (!token || !apiUser) {
      throw new Error('Resposta de autenticação inválida (sem token ou usuário).');
    }

    localStorage.setItem('access_token', token);
    setAccessToken(token);

    const fullUser = { ...apiUser, portalContext: portalContext || null };
    setUser(fullUser);
    setPermissions(fullUser.profile?.permissions || []);

    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    return fullUser;
  };

  // -------- LOGIN: chama /api/auth/login --------
  const login = async (email, password) => {
    const res = await api.post(
      '/api/auth/login',
      { email, password },
      { withCredentials: true }
    );

    const { accessToken: token, user: apiUser, portalContext } = res.data || {};
    const fullUser = applyAuthResponse(token, apiUser, portalContext);
    return fullUser; // usado pelo LoginPage para decidir para onde navegar
  };

  // -------- REFRESH: chama /api/auth/refresh --------
  const tryRefresh = async () => {
    try {
      const res = await api.post(
        '/api/auth/refresh',
        {},
        { withCredentials: true }
      );

      const { accessToken: token, user: apiUser, portalContext } = res.data || {};
      applyAuthResponse(token, apiUser, portalContext);
      return token;
    } catch (err) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message;

      if (status === 400 || status === 401) {
        console.info(
          '[Auth] Refresh não disponível ou inválido:',
          status,
          msg
        );
        hardResetAuthState();
        return null;
      }

      console.warn(
        '[Auth] Refresh falhou (erro inesperado):',
        err?.message || err
      );
      hardResetAuthState();
      throw err;
    }
  };

  // -------- LOGOUT --------
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

  // -------- initAuth (ao carregar a app) --------
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Tenta reidratar sessão usando o refresh token no cookie HttpOnly
        await tryRefresh();
      } catch (error) {
        console.error('[Auth] initAuth error (inesperado):', error);
        hardResetAuthState();
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // -------- interceptor 401 → tenta refresh automático --------
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
            // tryRefresh já limpou o estado, segue rejeitando
          }
        }

        return Promise.reject(error);
      }
    );

    return () => api.interceptors.response.eject(interceptor);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, accessToken, permissions, login, logout, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
