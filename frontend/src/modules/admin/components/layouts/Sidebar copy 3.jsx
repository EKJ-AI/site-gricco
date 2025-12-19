// import React, { useEffect, useMemo, useRef, useState } from "react";
// import { NavLink, useNavigate, useLocation, matchPath } from "react-router-dom";
// import { useAuth } from "../../../auth/contexts/AuthContext";
// import "./Navbar.css";
// import RequirePermission from "../../../../shared/hooks/RequirePermission";
// import { useTranslation } from "../../../../shared/i18n";
// import logoImg from "../../../../shared/assets/images/lgGricco_bluedark.svg";

// const Sidebar = () => {
//   const { user, logout, permissions: userPerms = [] } = useAuth();
//   const navigate = useNavigate();
//   const location = useLocation();
//   const { t } = useTranslation();

//   // hooks SEMPRE no topo
//   const [mobileOpen, setMobileOpen] = useState(false);
//   const shellRef = useRef(null);

//   const pathname = location.pathname || "";

//   // match com params do establishment para admin de empresa (que não tem portalContext)
//   const establishmentMatch =
//     matchPath("/companies/:companyId/establishments/:establishmentId/*", pathname) ||
//     matchPath("/companies/:companyId/establishments/:establishmentId", pathname);

//   const isInEstablishment = !!establishmentMatch;
//   const routeCompanyId = establishmentMatch?.params?.companyId || null;
//   const routeEstablishmentId = establishmentMatch?.params?.establishmentId || null;

//   const portalContext = user?.portalContext || null;
//   const hasPortalEstablishment = !!portalContext?.companyId && !!portalContext?.establishmentId;

//   const isGlobalAdmin = (userPerms || []).includes("system.admin.global");
//   const isCompanyAdmin = isGlobalAdmin || (userPerms || []).includes("company.admin");

//   const drawerCompanyId = hasPortalEstablishment ? portalContext.companyId : routeCompanyId;
//   const drawerEstablishmentId = hasPortalEstablishment ? portalContext.establishmentId : routeEstablishmentId;

//   const shellClass = useMemo(() => {
//     return `sidebar-shell ${mobileOpen ? "sidebar-shell--open" : ""}`;
//   }, [mobileOpen]);

//   // Fecha ao navegar
//   useEffect(() => {
//     setMobileOpen(false);
//   }, [location.pathname]);

//   // ESC fecha
//   useEffect(() => {
//     if (!mobileOpen) return;

//     const onKey = (e) => {
//       if (e.key === "Escape") setMobileOpen(false);
//     };
//     window.addEventListener("keydown", onKey);
//     return () => window.removeEventListener("keydown", onKey);
//   }, [mobileOpen]);

//   // trava scroll quando abrir
//   useEffect(() => {
//     if (!mobileOpen) return;
//     const prev = document.body.style.overflow;
//     document.body.style.overflow = "hidden";
//     return () => {
//       document.body.style.overflow = prev;
//     };
//   }, [mobileOpen]);

//   const handleLogout = () => {
//     logout();
//     navigate("/login");
//   };

//   const linkClass = ({ isActive }) =>
//     "sidebar-link" + (isActive ? " sidebar-link--active" : "");

//   const toggleMobile = () => setMobileOpen((v) => !v);
//   const closeMobile = () => setMobileOpen(false);

//   if (!user) return null;

//   const MenuContent = ({ variant = "desktop" }) => (
//     <>
//       {/* Estabelecimento: somente quando estiver DENTRO do estabelecimento */}
//       {(isCompanyAdmin || hasPortalEstablishment) && isInEstablishment && (
//         <div className={`sidebar-block ${variant === "mobile" ? "sidebar-block--mobile" : ""}`}>
//           <div className="sidebar-block-title">Estabelecimento</div>

//           <RequirePermission permission="document.read">
//             <NavLink
//               to={
//                 drawerCompanyId && drawerEstablishmentId
//                   ? `/companies/${drawerCompanyId}/establishments/${drawerEstablishmentId}/documents`
//                   : "/companies"
//               }
//               className={linkClass}
//             >
//               <span className="sidebar-link-icon document-icon" />
//               <span>Documentos</span>
//             </NavLink>
//           </RequirePermission>

//           <RequirePermission permission="inspection.read">
//             <NavLink to="/inspections" className={linkClass}>
//               <span className="sidebar-link-icon file-icon" />
//               <span>Inspeções</span>
//             </NavLink>
//           </RequirePermission>

//           <RequirePermission permission="report.read">
//             <NavLink to="/reports" className={linkClass}>
//               <span className="sidebar-link-icon report-icon" />
//               <span>Relatórios</span>
//             </NavLink>
//           </RequirePermission>

//           <RequirePermission permission="training.read">
//             <NavLink to="/trainings" className={linkClass}>
//               <span className="sidebar-link-icon training-icon" />
//               <span>Treinamentos</span>
//             </NavLink>
//           </RequirePermission>
//         </div>
//       )}

//       {/* Admin Global: tudo que é “admin master” */}
//       {isGlobalAdmin && (
//         <>
//           <div className="sidebar-block">
//             <div className="sidebar-block-title">Apps</div>

//             <RequirePermission permission="company.read">
//               <NavLink to="/companies" className={linkClass}>
//                 <span className="sidebar-link-icon user-icon" />
//                 <span>Empresas</span>
//               </NavLink>
//             </RequirePermission>

//             <RequirePermission permission="inspection.read">
//               <NavLink to="/inspections" className={linkClass}>
//                 <span className="sidebar-link-icon file-icon" />
//                 <span>Inspeções</span>
//               </NavLink>
//             </RequirePermission>

//             <RequirePermission permission="report.read">
//               <NavLink to="/reports" className={linkClass}>
//                 <span className="sidebar-link-icon report-icon" />
//                 <span>Relatórios</span>
//               </NavLink>
//             </RequirePermission>

//             <RequirePermission permission="training.read">
//               <NavLink to="/trainings" className={linkClass}>
//                 <span className="sidebar-link-icon training-icon" />
//                 <span>Treinamentos</span>
//               </NavLink>
//             </RequirePermission>
//           </div>

//           <div className="sidebar-block">
//             <div className="sidebar-block-title">Configurações</div>

//             <RequirePermission permission="user.read">
//               <NavLink to="/users" className={linkClass}>
//                 <span className="sidebar-link-icon user-icon" />
//                 <span>Usuários</span>
//               </NavLink>
//             </RequirePermission>

//             <RequirePermission permission="profile.manage">
//               <NavLink to="/profiles" className={linkClass}>
//                 <span className="sidebar-link-icon profile-icon" />
//                 <span>Perfis</span>
//               </NavLink>
//             </RequirePermission>

//             <RequirePermission permission="permission.manage">
//               <NavLink to="/permissions" className={linkClass}>
//                 <span className="sidebar-link-icon shield-icon" />
//                 <span>Permissões</span>
//               </NavLink>
//             </RequirePermission>

//             <RequirePermission permission="audit.read">
//               <NavLink to="/audit" className={linkClass}>
//                 <span className="sidebar-link-icon report-icon" />
//                 <span>Logs</span>
//               </NavLink>
//             </RequirePermission>

//             <RequirePermission permission="documentType.read">
//               <NavLink to="/admin/document-types" className={linkClass}>
//                 <span className="sidebar-link-icon file-icon" />
//                 <span>Tipos de Documentos</span>
//               </NavLink>
//             </RequirePermission>

//             <RequirePermission permission="blog.post.read">
//               <NavLink to="/admin/blog/posts" className={linkClass}>
//                 <span className="sidebar-link-icon file-icon" />
//                 <span>Blog / Notícias</span>
//               </NavLink>
//             </RequirePermission>
//           </div>

//           <div className="sidebar-block">
//             <div className="sidebar-block-title">Traduções</div>

//             <RequirePermission permission="translation.read">
//               <NavLink to="/admin/translations/translates" className={linkClass}>
//                 <span className="sidebar-link-icon globe-icon" />
//                 <span>Textos</span>
//               </NavLink>
//             </RequirePermission>

//             <RequirePermission permission="translation.read">
//               <NavLink to="/admin/translations/cultures" className={linkClass}>
//                 <span className="sidebar-link-icon globe-icon" />
//                 <span>Culturas</span>
//               </NavLink>
//             </RequirePermission>

//             <RequirePermission permission="translation.read">
//               <NavLink to="/admin/translations/labels" className={linkClass}>
//                 <span className="sidebar-link-icon globe-icon" />
//                 <span>Labels pendentes</span>
//               </NavLink>
//             </RequirePermission>
//           </div>
//         </>
//       )}
//     </>
//   );

//   return (
//     <div className={shellClass} ref={shellRef}>
//       {/* MOBILE TOPBAR: sempre visível (<768px via CSS) */}
//       <div className="sidebar-mobile-bar">
//         <img src={logoImg} className="logo-barratopo" alt="Logo Gricco" />

//         {/* manter classe user-greeting como você pediu */}
//         <button
//           type="button"
//           className="user-greeting sidebar-mobile-trigger"
//           aria-label="Abrir menu"
//           aria-expanded={mobileOpen}
//           onClick={toggleMobile}
//         >
//           <span className="avatar-circle avatar-circle--sm">
//             {user.name?.charAt(0)?.toUpperCase() || "U"}
//           </span>
//           <span className="sidebar-mobile-trigger-icon" aria-hidden="true">
//             <span />
//             <span />
//             <span />
//           </span>
//         </button>
//       </div>

//       {/* OVERLAY */}
//       <div className="sidebar-overlay" onClick={closeMobile} />

//       {/* DRAWER MOBILE */}
//       <aside className="sidebar-drawer" aria-hidden={!mobileOpen}>
//         <div className="sidebar-drawer-header">
//           <div className="sidebar-drawer-user">
//             <div className="avatar-circle">
//               {user.name?.charAt(0)?.toUpperCase() || "U"}
//             </div>
//             <div className="sidebar-drawer-userinfo">
//               <div className="sidebar-drawer-hello">
//                 {t("Ola")}, <strong>{user.name}</strong>
//               </div>
//               <div className="sidebar-drawer-sub">Gricco Soluções Integradas</div>
//             </div>
//           </div>

//           <button
//             type="button"
//             className="sidebar-drawer-close"
//             onClick={closeMobile}
//             aria-label="Fechar menu"
//           >
//             ✕
//           </button>
//         </div>

//         <nav className="sidebar-drawer-nav">
//           <MenuContent variant="mobile" />
//         </nav>

//         <div className="sidebar-drawer-footer">
//           <button
//             type="button"
//             className="sidebar-link sidebar-link--danger"
//             onClick={handleLogout}
//           >
//             <span className="sidebar-link-icon logout-icon" />
//             <span>Sair</span>
//           </button>
//         </div>
//       </aside>

//       {/* DESKTOP SIDEBAR */}
//       <aside className="sidebar sidebar-desktop">
//         <div className="sidebar-top">
//           <img src={logoImg} className="logo-barratopo sidebar-desktop-logo" alt="Logo Gricco" />
//         </div>

//         <nav className="sidebar-nav">
//           <MenuContent />
//         </nav>

//         <div className="sidebar-bottom">
//           <div className="sidebar-profile">
//             <div className="avatar-circle">
//               {user.name?.charAt(0)?.toUpperCase() || "U"}
//             </div>
//             <div className="user-info">
//               <div className="user-greeting">
//                 {t("Ola")}, {user.name}
//               </div>
//               <div className="user-company">Gricco Soluções Integradas</div>
//             </div>
//           </div>

//           <button
//             type="button"
//             className="sidebar-link sidebar-link--danger"
//             onClick={handleLogout}
//           >
//             <span className="sidebar-link-icon logout-icon" />
//             <span>Sair</span>
//           </button>
//         </div>
//       </aside>
//     </div>
//   );
// };

// export default Sidebar;
