// src/components/layout/Sidebar.jsx
import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../../auth/contexts/AuthContext";
import "./Navbar.css";
import RequirePermission from "../../../../shared/hooks/RequirePermission";
import { useLanguage } from "../../../../shared/contexts/LanguageContext";
import { useTranslation } from "../../../../shared/i18n";

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { changeLanguage, language } = useLanguage();
  const { t } = useTranslation();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (!user) return null;

  const linkClass = ({ isActive }) =>
    "sidebar-link" + (isActive ? " sidebar-link--active" : "");

  return (
    <aside className="sidebar">
      {/* Cabeçalho / Perfil */}
      <div className="sidebar-header">
        <div className="avatar-circle">
          {user.name?.charAt(0)?.toUpperCase() || "U"}
        </div>
        <div className="user-info">
          <div className="user-greeting">
            {t("Ola")}, {user.name}
          </div>
          <div className="user-company">Gricco Soluções Integradas</div>
        </div>
      </div>

      {/* MENU PRINCIPAL */}
      <nav className="sidebar-nav">
        {/* =========================
            Navegação principal
           ========================= */}
        <div className="sidebar-section">
          {/* Painel */}
          <RequirePermission permission="dashboard.view">
            <NavLink to="/dashboard" end className={linkClass}>
              <span className="sidebar-link-icon home-icon" />
              <span>Painel</span>
            </NavLink>
          </RequirePermission>

          {/* Empresas */}
          <RequirePermission permission="company.read">
            <NavLink to="/companies" className={linkClass}>
              <span className="sidebar-link-icon document-icon" />
              <span>Empresas</span>
            </NavLink>
          </RequirePermission>

          {/* Inspeções */}
          <RequirePermission permission="inspection.read">
            <NavLink to="/inspections" className={linkClass}>
              <span className="sidebar-link-icon file-icon" />
              <span>Inspeções</span>
            </NavLink>
          </RequirePermission>

          {/* Relatórios */}
          <RequirePermission permission="report.read">
            <NavLink to="/reports" className={linkClass}>
              <span className="sidebar-link-icon report-icon" />
              <span>Relatórios</span>
            </NavLink>
          </RequirePermission>

          {/* Treinamentos */}
          <RequirePermission permission="training.read">
            <NavLink to="/trainings" className={linkClass}>
              <span className="sidebar-link-icon training-icon" />
              <span>Treinamentos</span>
            </NavLink>
          </RequirePermission>
        </div>

        {/* =========================
            Configurações
           ========================= */}
        <div className="sidebar-section">
          <div className="sidebar-section-title">Configurações</div>

          {/* Usuários */}
          <RequirePermission permission="user.read">
            <NavLink to="/users" className={linkClass}>
              <span className="sidebar-link-icon user-icon" />
              <span>Usuários</span>
            </NavLink>
          </RequirePermission>

          {/* Perfis */}
          <RequirePermission permission="profile.manage">
            <NavLink to="/profiles" className={linkClass}>
              <span className="sidebar-link-icon profile-icon" />
              <span>Perfis</span>
            </NavLink>
          </RequirePermission>

          {/* Permissões */}
          <RequirePermission permission="permission.manage">
            <NavLink to="/permissions" className={linkClass}>
              <span className="sidebar-link-icon shield-icon" />
              <span>Permissões</span>
            </NavLink>
          </RequirePermission>

          {/* Logs */}
          <RequirePermission permission="logs.read">
            <NavLink to="/audit" className={linkClass}>
              <span className="sidebar-link-icon report-icon" />
              <span>Logs</span>
            </NavLink>
          </RequirePermission>

          {/* Tipos de Documentos */}
          <RequirePermission permission="documentType.read">
            <NavLink to="/admin/document-types" className={linkClass}>
              <span className="sidebar-link-icon file-icon" />
              <span>Tipos de Documentos</span>
            </NavLink>
          </RequirePermission>
        </div>

        {/* =========================
            Traduções
           ========================= */}
        <div className="sidebar-section">
          <div className="sidebar-section-title">Traduções</div>

          {/* Translates */}
          <RequirePermission permission="translation.read">
            <NavLink
              to="/admin/translations/translates"
              className={linkClass}
            >
              <span className="sidebar-link-icon globe-icon" />
              <span>Textos</span>
            </NavLink>
          </RequirePermission>

          {/* Cultures */}
          <RequirePermission permission="translation.read">
            <NavLink to="/admin/translations/cultures" className={linkClass}>
              <span className="sidebar-link-icon globe-icon" />
              <span>Culturas</span>
            </NavLink>
          </RequirePermission>

          {/* Labels / Missing */}
          <RequirePermission permission="translation.read">
            <NavLink to="/admin/translations/labels" className={linkClass}>
              <span className="sidebar-link-icon globe-icon" />
              <span>Labels pendentes</span>
            </NavLink>
          </RequirePermission>
        </div>
      </nav>

      {/* RODAPÉ DO MENU */}
      <div className="sidebar-footer">
        {/* Troca de idioma */}
        <div className="sidebar-langs">
          <button
            type="button"
            className={
              "sidebar-lang-btn" +
              (language === "pt" ? " sidebar-lang-btn--active" : "")
            }
            onClick={() => changeLanguage("pt")}
          >
            PT
          </button>
          <button
            type="button"
            className={
              "sidebar-lang-btn" +
              (language === "en" ? " sidebar-lang-btn--active" : "")
            }
            onClick={() => changeLanguage("en")}
          >
            EN
          </button>
        </div>

        {/* Sair */}
        <button
          type="button"
          className="sidebar-link sidebar-link--ghost"
          onClick={handleLogout}
        >
          <span className="sidebar-link-icon logout-icon" />
          <span className="sidebar-link-danger">Sair</span>
        </button>

        {/* Ajuda / FAQ */}
        <button
          type="button"
          className="sidebar-link sidebar-link--ghost sidebar-help"
          onClick={() => navigate("/help")}
        >
          <span className="sidebar-help-text">Dúvidas?</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
