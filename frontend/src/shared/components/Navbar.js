import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import '../styles/NavBar.css';
import logo from '../assets/images/logo-white.png'; 
import logoDark from '../assets/images/logo_dark.png';
import { useLanguage } from '../contexts/LanguageContext';
import { useTranslation } from '../i18n';
import { useAuth } from '../../modules/auth/contexts/AuthContext';

const Navbar = () => {
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  //console.log('User in Navbar: ' + (user ? user.email : 'No user'));

  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { language, changeLanguage } = useLanguage();
  const { t } = useTranslation();
  const location = useLocation();
  const isHome = location.pathname === "/";
  const publicRoutesWithScroll = ["/", "/login", "/blog", "/reset", "/qsms", "/forgot", "/sustainability", "/business", "/qsmsmanagement", "/offshore", "/etica-e-compliance", "/politica-de-compliance"];

  useEffect(() => {
    //console.log("----", location.hash, location.pathname, location.search);
    
    if(location.hash){
      window.scrollTo(0, 0); // Scrolla para o topo antes de rolar para o elemento
      const element = document.querySelector(location.hash);
      if(element){
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    }

    if (isHome) {
      const handleScroll = () => {
        setScrolled(window.scrollY > 100);
      };
      window.addEventListener("scroll", handleScroll);
      handleScroll();
      return () => window.removeEventListener("scroll", handleScroll);
    } else if (publicRoutesWithScroll.includes(location.pathname)) {
      setScrolled(true);
    } else {
      setScrolled(false);
    }
  }, [location.pathname]);

  // Fecha o menu ao clicar em algum link
  const handleLinkClick = () => {
    setMenuOpen(false);
  };

  const abreMenu = (e) => {
    //const submenu = e.currentTarget.querySelector('.submenu');
    const submenu = e.currentTarget;
    if (submenu) {
      submenu.classList.toggle('open');
    }
  }

  return (
    <>
      <header className={`navbar ${scrolled ? 'scrolled' : ''}`}>
        <div 
          className={`menuMobile${menuOpen ? ' open' : ''}`} 
          onClick={() => setMenuOpen(!menuOpen)} 
          aria-label="Toggle menu"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') setMenuOpen(!menuOpen); }}
        >
          <div></div>
          <div></div>
          <div></div>
        </div>

        <Link to="/" className="navbar-logo">
          <img src={scrolled ? logoDark : logo} alt="Gricco Logo" />
        </Link>

        <nav className="nav-links menu-desktop">
          <a href="/" onClick={handleLinkClick}>{t('menu_option0')}</a>
          <div className='item' onMouseEnter={abreMenu} onMouseLeave={abreMenu}>
            <a href="/#products" onClick={handleLinkClick}>{t('menu_option1')}</a>
            <ul className='submenu'>
              <li className='item'><a href="/sustainability">{t('services.sustainability')}</a></li>
              <li className='item'><a href="/business">{t('services.development.business')}</a></li>
              <li className='item'><a href="/qsmsmanagement">{t('services.manage.operation.qsms')}</a></li>
              <li className='item'><a href="/offshore">{t('services.industry.maritime.offshore')}</a></li>
              <li className='item'><a href="/qsms">{t('services.organization.Security')}</a></li>
            </ul>
          </div>
          <div className='item' onMouseEnter={abreMenu} onMouseLeave={abreMenu}>
            <a href="/#about-us" onClick={handleLinkClick}>{t('menu_option2')}</a>
            <ul className='submenu'>
              <li className='item'><a href="/etica-e-compliance">{t('ethic.conduct')}</a></li>
              <li className='item'><a href="/politica-de-compliance">{t('policy.compliance.ethic')}</a></li>
            </ul>
          </div>          
          <a href="/#contact" onClick={handleLinkClick}>{t('menu_option3')}</a>

          <select 
            className="language-selector"
            onChange={(e) => { changeLanguage(e.target.value); handleLinkClick(); }}
            value={language}
          >
            <option value="pt">PT</option>
            <option value="en">EN</option>
          </select>
          {/* <Link to="/login" onClick={handleLinkClick}>{t('menu_option4')}</Link> */}
          {loading ? (
            <span>Carregando…</span>
          ) : user ? (
            <>
              {/* <span style={{ marginRight: 8 }}>Olá, {user.name}</span> */}
              <Link to="/dashboard" onClick={handleLinkClick}>{t('Ola')} {user.name}</Link>
              <button onClick={handleLogout}>Sair</button>
            </>
          ) : (
            <Link to="/login" onClick={handleLinkClick}>{t('menu_option4')}</Link>
          )}          
        </nav>
      </header>

      {/* Menu lateral */}
      <aside className={`side-menu${menuOpen ? ' open' : ''} menu-mobile`} aria-hidden={!menuOpen}>
        <div className='btn-fechar-menu-mobile' onClick={() => setMenuOpen(!menuOpen)} >X</div>
        <a href="/" onClick={handleLinkClick}>{t('menu_option0')}</a>
        {/* <a href="/#products" onClick={handleLinkClick}>{t('menu_option1')}</a>
        <a href="/#about-us" onClick={handleLinkClick}>{t('menu_option2')}</a> */}
        <div className='item' onMouseEnter={abreMenu} onMouseLeave={abreMenu}>
            <a href="/#products" onClick={handleLinkClick}>{t('menu_option1')}</a>
            <ul className='submenu'>
              <li className='item'><a href="/sustainability">{t('services.sustainability')}</a></li>
              <li className='item'><a href="/business">{t('services.development.business')}</a></li>
              <li className='item'><a href="/qsmsmanagement">{t('services.manage.operation.qsms')}</a></li>
              <li className='item'><a href="/offshore">{t('services.industry.maritime.offshore')}</a></li>
              <li className='item'><a href="/qsms">{t('services.organization.Security')}</a></li>
            </ul>
          </div>
          <div className='item' onMouseEnter={abreMenu} onMouseLeave={abreMenu}>
            <a href="/#about-us" onClick={handleLinkClick}>{t('menu_option2')}</a>
            <ul className='submenu'>
              <li className='item'><a href="/etica-e-compliance">{t('ethic.conduct')}</a></li>
              <li className='item'><a href="/politica-de-compliance">{t('policy.compliance.ethic')}</a></li>
            </ul>
          </div>
        <a href="/#contact" onClick={handleLinkClick}>{t('menu_option3')}</a>
        <select 
          className="language-selector"
          onChange={(e) => { changeLanguage(e.target.value); handleLinkClick(); }}
          value={language}
        >
          <option value="pt">PT</option>
          <option value="en">EN</option>
        </select>
        {console.log("Teste", user, !loading)}
        {loading ? (
            <span>Carregando…</span>
          ) : user ? (
            <>
              <span style={{ marginRight: 8 }}>Olá, {user.name}</span>
              <button onClick={handleLogout}>Sair</button>
            </>
          ) : (
            <Link to="/login" onClick={handleLinkClick}>{t('menu_option4')}</Link>
          )}          
      </aside>
    </>
  );
};

export default Navbar;
