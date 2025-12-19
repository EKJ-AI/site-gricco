// src/layouts/PrivateLayout.jsx
import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import './PrivateLayout.css';
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

function PrivateLayout() {
  const location = useLocation();

  const isActiveStartsWith = (prefix) =>
    location.pathname === prefix || location.pathname.startsWith(prefix + '/');

  return (
    <div className="private-layout">
      {/* Área principal */}
      <Sidebar />

      {/* Conteúdo das páginas privadas */}
      <main className="private-main">
        {/* <Topbar /> */}
        <section className="private-content">
          <Outlet />
        </section>
      </main>
    </div>
  );
}

export default PrivateLayout;
