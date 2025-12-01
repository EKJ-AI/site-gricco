// src/layouts/PublicLayout.jsx
import React, { useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import './PublicLayout.css';
import Navbar from './Navbar';
import { useLayout } from '../../contexts/LayoutContext';
import Footer from './Footer';

function PublicLayout() {
  const location = useLocation();

  const { layout } = useLayout();
  const { transparentNavbar, showTopBar, showBottomBar, showLeftSidebar, showRightPanel, pageTitle } = layout;

  const isActive = (path) => location.pathname === path;

  return (
    <div className={`conteudo ${transparentNavbar ? 'transparent-navbar' : ''}`}>
      <div className={`public-layout ${!showTopBar ? "showTopBar-false" : ""} ${!showBottomBar && showBottomBar || "" ? "showBottomBar-false" : ""}`}>
        <Navbar />
        {/* <header className="public-header">
          <div className="public-header__inner">
            <Link to="/" className="public-logo">
              <span>Gricco SST</span>
            </Link>

            <nav className="public-nav">
              <Link
                to="/"
                className={`public-nav__link ${isActive('/') ? 'is-active' : ''}`}
              >
                Início
              </Link>
              <Link
                to="/sustainability"
                className={`public-nav__link ${isActive('/sustainability') ? 'is-active' : ''}`}
              >
                Sustentabilidade
              </Link>
              <Link
                to="/qsms"
                className={`public-nav__link ${isActive('/qsms') ? 'is-active' : ''}`}
              >
                QSMS
              </Link>
              <Link
                to="/business"
                className={`public-nav__link ${isActive('/business') ? 'is-active' : ''}`}
              >
                Business
              </Link>
              <Link
                to="/qsmsmanagement"
                className={`public-nav__link ${isActive('/qsmsmanagement') ? 'is-active' : ''}`}
              >
                Gestão QSMS
              </Link>
              <Link
                to="/offshore"
                className={`public-nav__link ${isActive('/offshore') ? 'is-active' : ''}`}
              >
                Offshore
              </Link>

              <Link
                to="/login"
                className={`public-nav__link public-nav__link--primary ${
                  isActive('/login') ? 'is-active' : ''
                }`}
              >
                Acessar área restrita
              </Link>
            </nav>
          </div>
        </header> */}

        <main className="public-main">
          {/* Aqui entram as páginas públicas */}
          <Outlet />
        </main>
        <Footer />
        {/* <footer className="public-footer">
          <div className="public-footer__inner">
            <div>© {new Date().getFullYear()} Gricco SST • Todos os direitos reservados</div>
            <div className="public-footer__links">
              <Link to="/etica-e-compliance">Ética &amp; Compliance</Link>
              <span>•</span>
              <Link to="/politica-de-compliance">Política de Compliance</Link>
            </div>
          </div>
        </footer> */}
      </div>
    </div>
  );
}

export default PublicLayout;
