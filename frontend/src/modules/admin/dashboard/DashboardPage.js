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
    <div>
      <div className="home-page">
        <div className="hero-section">
          <div className="background-image" />
              <div className="overlay-dark">
                  <h2>{t('dashboard')}</h2>
                  <p>
                    {t('welcome')}, <strong>{user.name}</strong>!
                  </p>
                  <p>
                    {t('login')}: {user.email}
                  </p>
                  <p>
                    {t('profile')}: {user.profile?.name || t('no_profile')}
                  </p>
                  <p>{t('permissions')}:</p>
                  {user.profile?.permissions?.length > 0 ? (
                    <ul>
                      {user.profile.permissions.map((perm) => (
                        <li key={perm}>{perm}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>{t('no_permissions') || 'Nenhuma permissão atribuída.'}</p>
                  )}
              </div>
        </div>
       </div>      
    </div>
  );
}
