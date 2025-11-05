import React, { useEffect, useState } from 'react';
import { useAuth } from '../../auth/contexts/AuthContext';
import { useTranslation } from '../../../shared/i18n';
import api from '../../../api/axios';
import Navbar from '../../../shared/components/NavbarOLD';

export default function AuditLogsPage() {
  const { accessToken } = useAuth();
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError('');

      const res = await api.get('/api/audit', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      // Corrigir formato: garantir array
      if (res.data && Array.isArray(res.data.data)) {
        setLogs(res.data.data);
      } else if (res.data && res.data.data?.items) {
        setLogs(res.data.data.items);
      } else {
        setLogs([]);
      }

    } catch (err) {
      console.error('Erro ao carregar logs:', err);
      setError(t('error_loading_logs') || 'Erro ao carregar logs de auditoria.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <Navbar />
      <h2>{t('audit_logs')}</h2>
      {loading && <p className="loading-message">{t('loading') || 'Carregando...'}</p>}
      {error && <div className="error-message">{error}</div>}

      {!loading && logs.length === 0 && (
        <p className="info-message">{t('no_logs_found') || 'Nenhum log encontrado.'}</p>
      )}

      {logs.length > 0 && (
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('action')}</th>
              <th>{t('entity')}</th>
              <th>{t('details')}</th>
              <th>{t('user')}</th>
              <th>{t('datetime')}</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td>{log.action}</td>
                <td>{log.entity}</td>
                <td>{log.details}</td>
                <td>{log.user ? log.user.email : 'Sistema'}</td>
                <td>{new Date(log.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
