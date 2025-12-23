import React, { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useNavigate, useLocation, matchPath } from "react-router-dom";
import { useAuth } from "../../../auth/contexts/AuthContext";
import "./Navbar.css";
import RequirePermission from "../../../../shared/hooks/RequirePermission";
import { useTranslation } from "../../../../shared/i18n";
import logoImg from "../../../../shared/assets/images/lgGricco_bluedark.svg";

const formatDateTimePtBR = (date) => {
  const monthsShort = [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ];

  const day = date.getDate();
  const month = monthsShort[date.getMonth()];
  const year = date.getFullYear();

  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "pm" : "am";
  hours = hours % 12 || 12;
  const hoursStr = hours.toString().padStart(2, "0");

  return `${month}, ${day} de ${year} - ${hoursStr}:${minutes}${ampm}`;
};

const Sidebar = () => {
  const { user, logout, permissions: userPerms = [] } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const [now, setNow] = useState(new Date());
  
    useEffect(() => {
      const id = setInterval(() => setNow(new Date()), 30_000);
      return () => clearInterval(id);
    }, []);

  // hooks SEMPRE no topo
  const [mobileOpen, setMobileOpen] = useState(false);

  // avatar dropdown (desktop)
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  const shellRef = useRef(null);
  const pathname = location.pathname || "";


  const shellClass = useMemo(() => {
    return `sidebar-shell ${mobileOpen ? "sidebar-shell--open" : ""}`;
  }, [mobileOpen]);

  // helper active
  const isPathIn = (...prefixes) =>
    prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));

  const triggerClass = (active) =>
    "navbar-trigger" + (active ? " navbar-trigger--active" : "");

  const subLinkClass = ({ isActive }) =>
    "navbar-subitem" + (isActive ? " navbar-subitem--active" : "");

  // Fecha ao navegar
  useEffect(() => {
    setMobileOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  // ESC fecha
  useEffect(() => {
    if (!mobileOpen && !profileOpen) return;

    const onKey = (e) => {
      if (e.key === "Escape") {
        setMobileOpen(false);
        setProfileOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen, profileOpen]);

  // click fora fecha menu do avatar
  useEffect(() => {
    if (!profileOpen) return;

    const onDown = (e) => {
      if (!profileRef.current) return;
      if (!profileRef.current.contains(e.target)) setProfileOpen(false);
    };

    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [profileOpen]);

  // trava scroll quando abrir drawer mobile
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const linkClass = ({ isActive }) =>
    "sidebar-link" + (isActive ? " sidebar-link--active" : "");

  const linkClassExact = ({ isActive }) =>
  "sidebar-link" + (isActive ? " sidebar-link--active" : "");

  const toggleMobile = () => setMobileOpen((v) => !v);
  const closeMobile = () => setMobileOpen(false);

  if (!user) return null;

  const MenuContent = ({ variant = "desktop" }) => (
    <>
      {/* Admin Global: tudo que é “admin master” */}

          <div className="sidebar-block">
            <div className="sidebar-block-title">Configurações</div>

            <RequirePermission permission="dashboard.view">
              <NavLink to="/dashboard" className={linkClass}>
                <span className="sidebar-link-icon user-icon" />
                <span>Painel</span>
              </NavLink>
            </RequirePermission>
            
            <RequirePermission permissions={["user.read", "profile.manage", "permission.manage", "audit.read", "documentType.read", "blog.post.read"]}>
              <div className="sidebar-block-title">Configurações</div>
            </RequirePermission>

            <RequirePermission permission="user.read">
              <NavLink to="/users" className={linkClass}>
                <span className="sidebar-link-icon user-icon" />
                <span>Usuários</span>
              </NavLink>
            </RequirePermission>

            <RequirePermission permission="profile.manage">
              <NavLink to="/profiles" className={linkClass}>
                <span className="sidebar-link-icon profile-icon" />
                <span>Perfis</span>
              </NavLink>
            </RequirePermission>

            <RequirePermission permission="permission.manage">
              <NavLink to="/permissions" className={linkClass}>
                <span className="sidebar-link-icon shield-icon" />
                <span>Permissões</span>
              </NavLink>
            </RequirePermission>

            <RequirePermission permission="audit.read">
              <NavLink to="/audit" className={linkClass}>
                <span className="sidebar-link-icon report-icon" />
                <span>Logs</span>
              </NavLink>
            </RequirePermission>

            <RequirePermission permission="blog.post.read">
              <NavLink to="/admin/blog/posts" className={linkClass}>
                <span className="sidebar-link-icon file-icon" />
                <span>Blog / Notícias</span>
              </NavLink>
            </RequirePermission>
          </div>

          <div className="sidebar-block">
            <div className="sidebar-block-title">Traduções</div>

            <RequirePermission permission="translation.read">
              <NavLink to="/admin/translations/translates" className={linkClass}>
                <span className="sidebar-link-icon globe-icon" />
                <span>Textos</span>
              </NavLink>
            </RequirePermission>

            <RequirePermission permission="translation.read">
              <NavLink to="/admin/translations/cultures" className={linkClass}>
                <span className="sidebar-link-icon globe-icon" />
                <span>Culturas</span>
              </NavLink>
            </RequirePermission>

            <RequirePermission permission="translation.read">
              <NavLink to="/admin/translations/labels" className={linkClass}>
                <span className="sidebar-link-icon globe-icon" />
                <span>Labels pendentes</span>
              </NavLink>
            </RequirePermission>
          </div>
    </>
  );

  return (
    <div className={shellClass} ref={shellRef}>
      {/* MOBILE TOPBAR: sempre visível (<768px via CSS) */}
      <div className="sidebar-mobile-bar">
        <img src={logoImg} className="logo-barratopo" alt="Logo Gricco" />

        {/* manter classe user-greeting como você pediu */}
        <button
          type="button"
          className="user-greeting sidebar-mobile-trigger"
          aria-label="Abrir menu"
          aria-expanded={mobileOpen}
          onClick={toggleMobile}
        >
          <span className="avatar-circle avatar-circle--sm">
            {user.name?.charAt(0)?.toUpperCase() || "U"}
          </span>
          <span className="sidebar-mobile-trigger-icon" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </button>
      </div>

      {/* OVERLAY */}
      <div className="sidebar-overlay" onClick={closeMobile} />

      {/* DRAWER MOBILE */}
      <aside className="sidebar-drawer" aria-hidden={!mobileOpen}>
        <div className="sidebar-drawer-header">
          <div className="sidebar-drawer-user">
            <div className="avatar-circle">
              {user.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div className="sidebar-drawer-userinfo">
              <div className="sidebar-drawer-hello">
                {t("Ola")}, <strong>{user.name}</strong>
              </div>
              <div className="sidebar-drawer-sub">Gricco Soluções Integradas</div>
            </div>
          </div>

          <button
            type="button"
            className="sidebar-drawer-close"
            onClick={closeMobile}
            aria-label="Fechar menu"
          >
            ✕
          </button>
        </div>

        <nav className="sidebar-drawer-nav">
          <MenuContent variant="mobile" />
        </nav>

        <div className="sidebar-drawer-footer">
          <button
            type="button"
            className="sidebar-link sidebar-link--danger"
            onClick={handleLogout}
          >
            <span className="sidebar-link-icon logout-icon" />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* DESKTOP NAVBAR (horizontal) */}
      <header className="sidebar sidebar-desktop navbar-admin" role="banner">
        <div className="navbar-left">
          <img src={logoImg} className="logo-barratopo" alt="Logo Gricco" />
        </div>

        <nav className="navbar-nav" aria-label="Menu principal">
          
        </nav>

        {/* Avatar à direita + dropdown por clique */}
        <div className="navbar-right" ref={profileRef}>
          <button
            type="button"
            className="avatar-button"
            onClick={() => setProfileOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={profileOpen}
            aria-label="Menu do usuário"
          >
            <span className="avatar-circle">
              {user.name?.charAt(0)?.toUpperCase() || "U"}
            </span>
          </button>

          <div
            className={
              "navbar-dropdown navbar-dropdown--right" + (profileOpen ? " is-open" : "")
            }
            role="menu"
          >
            <div className="navbar-userbox">
              <div className="navbar-hello">
                {t("Ola")}, <strong>{user.name}</strong>
              </div>
              <div className="navbar-sub">Gricco Soluções Integradas</div>
              <div className="navbar-sub">{formatDateTimePtBR(now)}</div>
            </div>

          <div className="sidebar-block">
            <RequirePermission permission="dashboard.view">
              <NavLink to="/dashboard" className={linkClass}>
                <span className="sidebar-link-icon user-icon" />
                <span>Painel</span>
              </NavLink>
            </RequirePermission>
            
            <RequirePermission permissions={["user.read", "profile.manage", "permission.manage", "audit.read", "documentType.read", "blog.post.read"]}>
              <div className="sidebar-block-title">Configurações</div>
            </RequirePermission>

            <RequirePermission permission="user.read">
              <NavLink to="/users" className={linkClass}>
                <span className="sidebar-link-icon user-icon" />
                <span>Usuários</span>
              </NavLink>
            </RequirePermission>

            <RequirePermission permission="profile.manage">
              <NavLink to="/profiles" className={linkClass}>
                <span className="sidebar-link-icon profile-icon" />
                <span>Perfis</span>
              </NavLink>
            </RequirePermission>

            <RequirePermission permission="permission.manage">
              <NavLink to="/permissions" className={linkClass}>
                <span className="sidebar-link-icon shield-icon" />
                <span>Permissões</span>
              </NavLink>
            </RequirePermission>

            <RequirePermission permission="audit.read">
              <NavLink to="/audit" className={linkClass}>
                <span className="sidebar-link-icon report-icon" />
                <span>Logs</span>
              </NavLink>
            </RequirePermission>            

            <RequirePermission permission="blog.post.read">
              <NavLink to="/admin/blog/posts" className={linkClass}>
                <span className="sidebar-link-icon file-icon" />
                <span>Blog / Notícias</span>
              </NavLink>
            </RequirePermission>
          </div>

          <div className="sidebar-block">
            <RequirePermission permission="translation.read">
              <div className="sidebar-block-title">Traduções</div>
            </RequirePermission>
            <RequirePermission permission="translation.read">
              <NavLink to="/admin/translations/cultures" className={linkClass}>
                <span className="sidebar-link-icon globe-icon" />
                <span>Culturas</span>
              </NavLink>
            </RequirePermission>
            <RequirePermission permission="translation.read">
              <NavLink to="/admin/translations/translates" className={linkClass}>
                <span className="sidebar-link-icon globe-icon" />
                <span>Textos</span>
              </NavLink>
            </RequirePermission>

            <RequirePermission permission="translation.read">
              <NavLink to="/admin/translations/labels" className={linkClass}>
                <span className="sidebar-link-icon globe-icon" />
                <span>Labels pendentes</span>
              </NavLink>
            </RequirePermission>
          </div>

            <button
              type="button"
              className="navbar-subitem navbar-subitem"
              onClick={handleLogout}
            >
              <span className="sidebar-link-icon logout-icon" />              
              <span>Sair</span>
            </button>
          </div>
        </div>
      </header>
    </div>
  );
};

export default Sidebar;
