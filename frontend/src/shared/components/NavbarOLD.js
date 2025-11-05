import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../modules/auth/contexts/AuthContext';
import '../styles/NavBar.css';
import RequirePermission from './RequirePermission';
import { useLanguage } from '../contexts/LanguageContext';
import { useTranslation } from '../i18n';
import { useTheme } from '../contexts/ThemeContext';


export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { changeLanguage, language } = useLanguage();

  const handleLogout = () => {
    alert('Você saiu com sucesso!');
    logout();
    navigate('/login');
  };

  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();

  if (!user) return null;

  return (
    <nav className="navbar">
      <div className="navbar-title">IMAX Admin</div>
      <ul className="navbar-links">
        <li><Link to="/">Dashboard</Link></li>        
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
      </ul>
      <div className="navbar-user">
        <span>{user?.email}</span>
        <button onClick={handleLogout}>Sair</button>
        <div className="navbar">
          <button onClick={() => changeLanguage('pt')}>PT</button>
          <button onClick={() => changeLanguage('en')}>EN</button>
        </div>
        <button onClick={toggleTheme}>
          {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
        </button>
        <Link to="/settings">{t('settings')}</Link>
      </div>
    </nav>
  );
}
