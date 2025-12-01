import React from 'react';
import { useAuth } from '../../auth/contexts/AuthContext';
import { useTranslation } from '../../../shared/i18n';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const { t } = useTranslation();

  if (loading) {
    return (
      <div>
        {/* <Navbar /> */}
        <p>{t('loading') || 'Carregando...'}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div>
        {/* <Navbar /> */}
        <h2>{t('dashboard')}</h2>
        <p>{t('not_logged_in') || 'Você não está logado.'}</p>
      </div>
    );
  }

  return (    
    <div className="page-wrapper">
      <p className="page-placeholder">[Páginas internas]</p>
    </div>
  );
}
