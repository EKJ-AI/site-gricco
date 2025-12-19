// // src/components/layout/Sidebar.jsx
// import React from "react";
// import { NavLink, useNavigate, useLocation, matchPath } from "react-router-dom";
// import { useAuth } from "../../../auth/contexts/AuthContext";
// import "./Navbar.css";
// import RequirePermission from "../../../../shared/hooks/RequirePermission";
// import { useLanguage } from "../../../../shared/contexts/LanguageContext";
// import { useTranslation } from "../../../../shared/i18n";
// import logoImg from "../../../../shared/assets/images/lgGricco_bluedark.svg";

// const Sidebar = () => {
//   const { user, logout, permissions: userPerms = [] } = useAuth();
//   const navigate = useNavigate();
//   const location = useLocation();
//   const { changeLanguage, language } = useLanguage();
//   const { t } = useTranslation();

//   const handleLogout = () => {
//     logout();
//     navigate("/login");
//   };

//   if (!user) return null;

//   const linkClass = ({ isActive }) =>
//     "sidebar-link" + (isActive ? " sidebar-link--active" : "");

//   // contexto de portal (colaborador/sub-admin vinculado a Employee)
//   const portalContext = user.portalContext || null;
//   const hasPortalEstablishment =
//     portalContext &&
//     portalContext.companyId &&
//     portalContext.establishmentId;

//   // 🔐 Admin Global
//   const isGlobalAdmin = userPerms.includes("system.admin.global");
//   const isCompanyAdmin = isGlobalAdmin || userPerms.includes("company.admin");

//   // 📍 contexto de rota: só mostra "Empresas" quando estiver dentro do ESTABELECIMENTO
//   const pathname = location.pathname || "";
//   const isInEstablishment =
//     !!matchPath(
//       "/companies/:companyId/establishments/:establishmentId/*",
//       pathname
//     ) ||
//     !!matchPath(
//       "/companies/:companyId/establishments/:establishmentId",
//       pathname
//     );

//     console.log("isGlobalAdmin", isGlobalAdmin, "isCompanyAdmin", isCompanyAdmin);
//     console.log("isInEstablishment", isInEstablishment, "pathname", pathname);
//     console.log("user", user);

//   // console.log("portalContext", portalContext, user);

//   return (
//     <aside className="sidebar">
//       <img src={logoImg} className="logo-barratopo" alt="Logo Gricco" />

//       {/* MENU PRINCIPAL */}
//       <nav className="sidebar-nav">
//         <div className="sidebar-apps">
//           {/* =========================
//               EMPRESAS
//               - Só aparece dentro do estabelecimento
//             ========================= */}
//           {(isCompanyAdmin || hasPortalEstablishment) && (isInEstablishment) && (
//             <>
//               <RequirePermission permission="document.read">
//                 <NavLink to={`/companies/${portalContext.companyId}/establishments/${portalContext.establishmentId}/documents`} className={linkClass}>
//                   <span className="sidebar-link-icon document-icon" />
//                   <span>Documentos</span>
//                 </NavLink>
//               </RequirePermission>
//               {/* Inspeções */}
//               <RequirePermission permission="inspection.read">
//                 <NavLink to="/inspections" className={linkClass}>
//                   <span className="sidebar-link-icon file-icon" />
//                   <span>Inspeções</span>
//                 </NavLink>
//               </RequirePermission>

//               {/* Relatórios */}
//               <RequirePermission permission="report.read">
//                 <NavLink to="/reports" className={linkClass}>
//                   <span className="sidebar-link-icon report-icon" />
//                   <span>Relatórios</span>
//                 </NavLink>
//               </RequirePermission>

//               {/* Treinamentos */}
//               <RequirePermission permission="training.read">
//                 <NavLink to="/trainings" className={linkClass}>
//                   <span className="sidebar-link-icon training-icon" />
//                   <span>Treinamentos</span>
//                 </NavLink>
//               </RequirePermission>
//             </>
//           )}
//         </div>

//         {/* =========================
//             Configurações (somente Admin Global)
//            ========================= */}

//         {isGlobalAdmin && (
//           <div className="sidebar-section">
//               <RequirePermission permission="company.read">
//                 <div className="sidebar-section-title">Apps</div>
//                 <NavLink to="/companies" className={linkClass}>
//                   <span className="sidebar-link-icon user-icon" />
//                   <span>Empresas</span>
//                 </NavLink>
//               </RequirePermission>
//               <RequirePermission permission="inspection.read">
//                 <NavLink to="/inspections" className={linkClass}>
//                   <span className="sidebar-link-icon file-icon" />
//                   <span>Inspeções</span>
//                 </NavLink>
//               </RequirePermission>

//               {/* Relatórios */}
//               <RequirePermission permission="report.read">
//                 <NavLink to="/reports" className={linkClass}>
//                   <span className="sidebar-link-icon report-icon" />
//                   <span>Relatórios</span>
//                 </NavLink>
//               </RequirePermission>

//               {/* Treinamentos */}
//               <RequirePermission permission="training.read">
//                 <NavLink to="/trainings" className={linkClass}>
//                   <span className="sidebar-link-icon training-icon" />
//                   <span>Treinamentos</span>
//                 </NavLink>
//               </RequirePermission>
            
//           </div>
//         )}

//         {isGlobalAdmin && (
//           <div className="sidebar-section">
//             <RequirePermission permission="user.read">
//               <div className="sidebar-section-title">Configurações</div>
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
//         )}

//         {/* =========================
//             Traduções (somente Admin Global)
//            ========================= */}
//         {isGlobalAdmin && (
//           <div className="sidebar-section">
//             <RequirePermission permission="translation.read">
//               <div className="sidebar-section-title">Traduções</div>
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
//         )}
//       </nav>

//       {/* RODAPÉ DO MENU */}
//       {/* <div className="sidebar-footer">
//         <div className="sidebar-langs">
//           <button
//             type="button"
//             className={
//               "sidebar-lang-btn" +
//               (language === "pt" ? " sidebar-lang-btn--active" : "")
//             }
//             onClick={() => changeLanguage("pt")}
//           >
//             PT
//           </button>
//           <button
//             type="button"
//             className={
//               "sidebar-lang-btn" +
//               (language === "en" ? " sidebar-lang-btn--active" : "")
//             }
//             onClick={() => changeLanguage("en")}
//           >
//             EN
//           </button>
//         </div>

//         <button
//           type="button"
//           className="sidebar-link sidebar-link--ghost"
//           onClick={handleLogout}
//         >
//           <span className="sidebar-link-icon logout-icon" />
//           <span className="sidebar-link-danger">Sair</span>
//         </button>

//         <button
//           type="button"
//           className="sidebar-link sidebar-link--ghost sidebar-help"
//           onClick={() => navigate("/help")}
//         >
//           <span className="sidebar-help-text">Dúvidas?</span>
//         </button>
//       </div> */}

//       {/* Cabeçalho / Perfil */}
//       <div className="sidebar-header">
//         <div className="avatar-circle">
//           {user.name?.charAt(0)?.toUpperCase() || "U"}
//         </div>
//         <div className="user-info">
//           <div className="user-greeting">
//             {t("Ola")}, {user.name}
//           </div>
//           <div className="user-company">Gricco Soluções Integradas</div>
//           <button
//             type="button"
//             className="sidebar-link sidebar-link--ghost"
//             onClick={handleLogout}
//           >
//             <span className="sidebar-link-icon logout-icon" />
//             <span className="sidebar-link-danger">Sair</span>
//           </button>
//         </div>
//       </div>
//     </aside>
//   );
// };

// export default Sidebar;
