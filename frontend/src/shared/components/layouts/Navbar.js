// src/shared/components/navbar/NavBar.jsx
import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './NavBar.css';
import logo from '../../assets/images/lgGricco_white_002.svg';
import logoDark from '../../assets/images/lgGricco_bluedark.svg';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../../modules/auth/contexts/AuthContext';
import api from '../../../api/axios';
import { useLayout } from '../../contexts/LayoutContext';

const Navbar = () => {
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();

  const { layout } = useLayout();
  const { transparentNavbar, showTopBar, showLeftSidebar, showRightPanel, pageTitle } = layout;
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // 🌐 i18n
  const { language, changeLanguage } = useLanguage();
  const { t } = useTranslation();

  // 📜 culturas vindas do backend (público)
  const [cultures, setCultures] = useState([]);
  const [loadingCultures, setLoadingCultures] = useState(false);

  const location = useLocation();
  const isHome = location.pathname === '/';
  const publicRoutesWithScroll = [
    '/', '/login', '/blog', '/reset', '/qsms', '/forgot',
    '/sustainability', '/business', '/qsmsmanagement', '/offshore',
    '/etica-e-compliance', '/politica-de-compliance'
  ];

  // ✅ Carrega culturas usando endpoint PÚBLICO
  useEffect(() => {
    let mounted = true;

    async function loadCultures() {
      setLoadingCultures(true);
      try {
        // NOVO endpoint público sugerido no backend:
        // GET /api/public/i18n/cultures
        // retorna: { success: true, data: [{ id, description, icon? }, ...] }
        const res = await api.get('/api/public/i18n/cultures');
        const items = res?.data?.data || [];

        console.log('Culturas públicas carregadas:', items);

        if (!mounted) return;

        // Garante ícone mesmo se backend não mandar
        const normalized = items.map((c) => ({
          ...c,
          icon: c.icon ||
            (c.id.toLowerCase().startsWith('pt')
              ? '🇧🇷'
              : c.id.toLowerCase().startsWith('en')
                ? '🇺🇸'
                : ''),
        }));

        setCultures(normalized);

        // Se o idioma atual não estiver entre as culturas, tenta normalizar ou usar o primeiro
        if (normalized.length) {
          const setIds = new Set(normalized.map((c) => c.id)); // ex.: 'pt-BR', 'en-US'

          const mapShortToLong = (val) => {
            const v = String(val || '').toLowerCase();
            if (v === 'pt' || v === 'pt-br') return 'pt-BR';
            if (v === 'en' || v === 'en-us') return 'en-US';
            return val;
          };

          const currentResolved = mapShortToLong(language);
          if (!setIds.has(currentResolved)) {
            const prefer = setIds.has('pt-BR')
              ? 'pt-BR'
              : setIds.has('en-US')
                ? 'en-US'
                : normalized[0].id;

            changeLanguage(prefer);
          }
        }
      } catch (e) {
        console.warn(
          'Falha ao carregar culturas públicas; usando fallback estático.',
          e?.message || e
        );
      } finally {
        if (mounted) setLoadingCultures(false);
      }
    }
    loadCultures();
    return () => {
      mounted = false;
    };
  }, [language, changeLanguage]);

  useEffect(() => {
        
    const handleScroll = () => {
        setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [transparentNavbar]); // deps

  // Scroll / estilos da navbar
  useEffect(() => {
    if (location.hash) {
      window.scrollTo(0, 0);
      const element = document.querySelector(location.hash);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    }

    //console.log("transparentNavbar:", transparentNavbar && window.scrollY < 50);
    // if(transparentNavbar && window.scrollY < 50){
    //   setScrolled(false);
    // }else {
    //   setScrolled(true);
    // }
    // if (isHome) {
    //   const handleScroll = () => setScrolled(window.scrollY > 100);
    //   window.addEventListener('scroll', handleScroll);
    //   handleScroll();
    //   return () => window.removeEventListener('scroll', handleScroll);
    // //} else if (publicRoutesWithScroll.includes(location.pathname)) {
    // } else if (!transparentNavbar) {
    //   alert("NÃO É HOME");
    //   setScrolled(true);
    // } else {
    //   setScrolled(false);
    // }
  }, [location.pathname, isHome]);

  const handleLinkClick = () => setMenuOpen(false);

  const abreMenu = (e) => {
    const submenu = e.currentTarget;
    if (submenu) submenu.classList.toggle('open');
  };

  // 👇 trocar idioma (para cultureId que veio do backend público)
  const handleChangeLanguage = (val) => {
    changeLanguage(val);
    handleLinkClick();
  };

  // Renderiza opções do seletor de idiomas
  const renderLanguageOptions = () => {
    if (cultures && cultures.length) {
      return cultures.map((c) => (
        <option key={c.id} value={c.id}>
          {c.icon ? `${c.icon} ` : ''}
          {/* {c.description || c.id} */}
        </option>
      ));
    }

    // Fallback estático (caso API pública falhe)
    return (
      <>
        <option value="pt-BR">🇧🇷 pt-BR</option>
        <option value="en-US">🇺🇸 en-US</option>
      </>
    );
  };

  // Normaliza o value atual para bater com as cultures
  const resolvedValue = (() => {
    const val = String(language || '').trim();
    if (cultures?.some((c) => c.id === val)) return val;

    const low = val.toLowerCase();
    if (cultures?.some((c) => c.id === 'pt-BR') && (low === 'pt' || low === 'pt-br')) return 'pt-BR';
    if (cultures?.some((c) => c.id === 'en-US') && (low === 'en' || low === 'en-us')) return 'en-US';

    return val || (cultures?.[0]?.id ?? 'pt-BR');
  })();

  return (
    <>
      <header className={`navbar ${(!transparentNavbar || scrolled) ? 'scrolled' : ''}`}>
        <div
          className={`menuMobile${menuOpen ? ' open' : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') setMenuOpen(!menuOpen); }}
        >
          <div></div><div></div><div></div>
        </div>

        <Link to="/" className="navbar-logo">
          <img src={(!transparentNavbar || scrolled) ? logoDark : logo} alt="Gricco Logo" />
        </Link>

        <nav className="nav-links menu-desktop">
          <a href="/#about-us" onClick={handleLinkClick}>{t('menu.option0')}</a>
          <div className='item' onMouseEnter={abreMenu} onMouseLeave={abreMenu}>
            <a href="/" onClick={handleLinkClick}>{t('menu.option5')}</a>
            <ul className='submenu'>
              <li className='item'><a href="/sustainability">{t('services.sustainability')}</a></li>
              <li className='item'><a href="/business">{t('services.development.business')}</a></li>
              <li className='item'><a href="/qsmsmanagement">{t('services.manage.operation.qsms')}</a></li>
              <li className='item'><a href="/offshore">{t('services.industry.maritime.offshore')}</a></li>
              <li className='item'><a href="/qsms">{t('services.organization.Security')}</a></li>
            </ul>
          </div>
          <div className='item' onMouseEnter={abreMenu} onMouseLeave={abreMenu}>
            <a href="/#about-us" onClick={handleLinkClick}>{t('menu.option2')}</a>
            <ul className='submenu'>
              <li className='item'><a href="/etica-e-compliance">{t('ethic.conduct')}</a></li>
              <li className='item'><a href="/politica-de-compliance">{t('policy.compliance.ethic')}</a></li>
            </ul>
          </div>
          <a href="/" onClick={handleLinkClick}>{t('menu.option6')}</a>
          <a href="/" onClick={handleLinkClick}>{t('menu.option7')}</a>
          <a href="/" onClick={handleLinkClick}>{t('menu.option8')}</a>

          <select
            className="language-selector"
            onChange={(e) => handleChangeLanguage(e.target.value)}
            value={resolvedValue}
            disabled={loadingCultures}
            title={loadingCultures ? 'Carregando idiomas…' : 'Selecionar idioma'}
          >
            {renderLanguageOptions()}
          </select>

          {loading ? (
            <span>Carregando…</span>
          ) : user ? (
            <>
              <Link to="/dashboard" onClick={handleLinkClick}>{t('Ola')} {user.name}</Link>
              <button onClick={handleLogout}>Sair</button>
            </>
          ) : (
            <Link to="/login" className='btn-login' onClick={handleLinkClick}>{t('menu.option4')}</Link>
          )}
        </nav>
      </header>

      {/* Menu lateral (mobile) */}
      <aside className={`side-menu${menuOpen ? ' open' : ''} menu-mobile`} aria-hidden={!menuOpen}>
        <div className='btn-fechar-menu-mobile' onClick={() => setMenuOpen(!menuOpen)} >X</div>
        
        {/* <a href="/" onClick={handleLinkClick}>{t('menu.option0')}</a>
        <div className='item' onMouseEnter={abreMenu} onMouseLeave={abreMenu}>
          <a href="/#products" onClick={handleLinkClick}>{t('menu.option1')}</a>
          <ul className='submenu'>
            <li className='item'><a href="/sustainability">{t('services.sustainability')}</a></li>
            <li className='item'><a href="/business">{t('services.development.business')}</a></li>
            <li className='item'><a href="/qsmsmanagement">{t('services.manage.operation.qsms')}</a></li>
            <li className='item'><a href="/offshore">{t('services.industry.maritime.offshore')}</a></li>
            <li className='item'><a href="/qsms">{t('services.organization.Security')}</a></li>
          </ul>
        </div>

        <div className='item' onMouseEnter={abreMenu} onMouseLeave={abreMenu}>
          <a href="/#about-us" onClick={handleLinkClick}>{t('menu.option2')}</a>
          <ul className='submenu'>
            <li className='item'><a href="/etica-e-compliance">{t('ethic.conduct')}</a></li>
            <li className='item'><a href="/politica-de-compliance">{t('policy.compliance.ethic')}</a></li>
          </ul>
        </div>

        <a href="/#contact" onClick={handleLinkClick}>{t('menu.option3')}</a> */}

          <a href="/#about-us" onClick={handleLinkClick}>{t('menu.option0')}</a>
          <div className='item' onMouseEnter={abreMenu} onMouseLeave={abreMenu}>
            <a href="/" onClick={handleLinkClick}>{t('menu.option5')}</a>
            <ul className='submenu'>
              <li className='item'><a href="/sustainability">{t('services.sustainability')}</a></li>
              <li className='item'><a href="/business">{t('services.development.business')}</a></li>
              <li className='item'><a href="/qsmsmanagement">{t('services.manage.operation.qsms')}</a></li>
              <li className='item'><a href="/offshore">{t('services.industry.maritime.offshore')}</a></li>
              <li className='item'><a href="/qsms">{t('services.organization.Security')}</a></li>
            </ul>
          </div>
          <div className='item' onMouseEnter={abreMenu} onMouseLeave={abreMenu}>
            <a href="/#about-us" onClick={handleLinkClick}>{t('menu.option2')}</a>
            <ul className='submenu'>
              <li className='item'><a href="/etica-e-compliance">{t('ethic.conduct')}</a></li>
              <li className='item'><a href="/politica-de-compliance">{t('policy.compliance.ethic')}</a></li>
            </ul>
          </div>
          <a href="/" onClick={handleLinkClick}>{t('menu.option6')}</a>
          <a href="/" onClick={handleLinkClick}>{t('menu.option7')}</a>
          <a href="/" onClick={handleLinkClick}>{t('menu.option8')}</a>
          <select
            className="language-selector"
            onChange={(e) => handleChangeLanguage(e.target.value)}
            value={resolvedValue}
            disabled={loadingCultures}
            title={loadingCultures ? 'Carregando idiomas…' : 'Selecionar idioma'}
          >
            {renderLanguageOptions()}
          </select>

        {/* <select
          className="language-selector"
          onChange={(e) => handleChangeLanguage(e.target.value)}
          value={resolvedValue}
          disabled={loadingCultures}
          title={loadingCultures ? 'Carregando idiomas…' : 'Selecionar idioma'}
        >
          {renderLanguageOptions()}
        </select> */}

        {loading ? (
          <span>Carregando…</span>
        ) : user ? (
          <>
            <span style={{ marginRight: 8 }}>Olá, {user.name}</span>
            <button onClick={handleLogout}>Sair</button>
          </>
        ) : (
          <Link to="/login" onClick={handleLinkClick}>{t('menu.option4')}</Link>
        )}
      </aside>
    </>
  );
};

export default Navbar;
