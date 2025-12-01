import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../auth/contexts/AuthContext';
import './Navbar.css';
import RequirePermission from '../../../../shared/hooks/RequirePermission';
import { useLanguage } from '../../../../shared/contexts/LanguageContext';
import { useTranslation } from '../../../../shared/i18n';
//import { useTheme } from '../../../shared/contexts/ThemeContext';


export default function Navbar() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const { changeLanguage, language } = useLanguage();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  //const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();

  if (!user) return null;

  return (
    <nav className="navbar-admin">
      <div className="navbar-title">
        IMAX Admin
        {loading ? (
          <span>Carregando…</span>
        ) : 
          <>
            {t('Ola')} {user.name}
            <button onClick={handleLogout}>Sair</button>
          </>
        }
      </div>
      <ul className="navbar-links">
        <li><Link to="/dashboard">Dashboard</Link></li>        
        <li>
          <RequirePermission permission="user.read">
            <Link to="/users">Usuários</Link>
          </RequirePermission>
        </li>
        <li>
          <RequirePermission permission="profile.manage">
            <Link to="/profiles">Perfis</Link>
          </RequirePermission>
        </li>
        <li>
          <RequirePermission permission="permission.manage">
            <Link to="/permissions">Permissões</Link>
          </RequirePermission>
        </li>
        <li>
          <RequirePermission permission="logs.read">
            <Link to="/audit">Logs</Link>
          </RequirePermission>
        </li>
        <li>
          <RequirePermission permission="logs.read">
            <Link to="/settings">{t('settings')}</Link>
          </RequirePermission>
        </li>        
      </ul>
      {/* <div className="navbar-user">
        <span>{user?.email}</span>
        <button onClick={handleLogout}>Sair</button>
        <div className="navbar">
          <button onClick={() => changeLanguage('pt')}>PT</button>
          <button onClick={() => changeLanguage('en')}>EN</button>
        </div>
        <button onClick={toggleTheme}>
          {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
        </button>
      </div> */}
    </nav>
  );
}
