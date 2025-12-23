// src/App.jsx
import I18nGate from './shared/i18n/I18nGate';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './modules/auth/contexts/AuthContext';
import ProtectedRoute from './shared/components/ProtectedRoute';
import { LayoutProvider } from './shared/contexts/LayoutContext';

import LoginPage from './modules/auth/pages/LoginPage';
import DashboardPage from './modules/admin/dashboard/DashboardPage';
import UsersPage from './modules/admin/user/UsersPage';
import AuditLogsPage from './modules/admin/audit/AuditLogsPage';
import ProfilesPage from './modules/admin/user/ProfilesPage';
import PermissionsPage from './modules/auth/pages/PermissionsPage';
import { LanguageProvider } from './shared/contexts/LanguageContext';
import ForgotPasswordPage from './modules/auth/pages/ForgotPasswordPage';
import ResetPasswordPage from './modules/auth/pages/ResetPasswordPage';
import ResetSuccessPage from './modules/auth/pages/ResetSuccessPage';
import SettingsPage from './modules/admin/settings/SettingsPage';
import UsersEditPage from './modules/admin/user/UsersEditPage';
import HomePage from './modules/home/HomePage';
import Etich from './modules/about/Etich';
import Compliance from './modules/about/Compliance';

// 🔹 Páginas públicas de blog
import BlogListPage from './modules/blog/BlogListPage.jsx';
import BlogPostPage from './modules/blog/BlogPostPage.jsx';

// 🔹 Admin - Blog
import BlogList from './modules/admin/blog/pages/BlogList.jsx';
import BlogForm from './modules/admin/blog/pages/BlogForm.jsx';

import './shared/styles/theme.css';
import './shared/i18n';
import ServicePage from './modules/services/ServicesPage';
import Forbidden from './shared/components/Forbidden';
import {
  sustainability,
  qsms,
  business,
  qsmsmanagement,
  offshore,
} from './modules/services/data/ServiceData';
import TranslationsAdmin from './modules/admin/translation/Translations.js';
import CulturesAdmin from './modules/admin/translation/Cultures';
import TranslateMissing from './modules/admin/translation/TranslateMissing';

// --- Layouts
import PublicLayout from './shared/components/layouts/PublicLayout.jsx';
import PrivateLayout from './modules/admin/components/layouts/PrivateLayout.jsx';

import { ToastProvider } from './shared/components/toast/ToastProvider';
import './shared/styles/global.css';

// ✅ NOVAS PÁGINAS (FORMs)
import UsersFormPage from './modules/admin/user/UsersFormPage.js';
import ProfileFormPage from './modules/admin/user/ProfileFormPage.js';

// ✅ NOVAS PÁGINAS (PERMISSIONS FORM)
import PermissionFormPage from './modules/auth/pages/PermissionFormPage.js';

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <LanguageProvider>
            <I18nGate>
              <LayoutProvider>
                <Routes>
                  {/* =========================
                      ÁREA PÚBLICA
                    ========================= */}
                  <Route element={<PublicLayout />}>
                    <Route path="/" element={<HomePage />} />

                    {/* Blog público */}
                    <Route path="/blog" element={<BlogListPage />} />
                    <Route path="/blog/:slug" element={<BlogPostPage />} />

                    <Route path="/login" element={<LoginPage />} />
                    <Route
                      path="/forgot-password"
                      element={<ForgotPasswordPage />}
                    />
                    <Route
                      path="/reset-password"
                      element={<ResetPasswordPage />}
                    />
                    <Route path="/reset-success" element={<ResetSuccessPage />} />

                    <Route
                      path="/sustainability"
                      element={<ServicePage {...sustainability} />}
                    />
                    <Route path="/qsms" element={<ServicePage {...qsms} />} />
                    <Route
                      path="/business"
                      element={<ServicePage {...business} />}
                    />
                    <Route
                      path="/qsmsmanagement"
                      element={<ServicePage {...qsmsmanagement} />}
                    />
                    <Route
                      path="/offshore"
                      element={<ServicePage {...offshore} />}
                    />

                    <Route path="/etica-e-compliance" element={<Etich />} />
                    <Route
                      path="/politica-de-compliance"
                      element={<Compliance />}
                    />
                    <Route path="/403" element={<Forbidden />} />
                  </Route>

                  {/* =========================
                      ÁREA PRIVADA (PROTEGIDA)
                    ========================= */}
                  <Route element={<PrivateLayout />}>
                    {/* Admin - i18n */}
                    <Route
                      path="/admin/translations/translates"
                      element={
                        <ProtectedRoute permissions={['translation.read']}>
                          <TranslationsAdmin />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/translations/cultures"
                      element={
                        <ProtectedRoute permissions={['translation.read']}>
                          <CulturesAdmin />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/translations/labels"
                      element={
                        <ProtectedRoute permissions={['translation.read']}>
                          <TranslateMissing />
                        </ProtectedRoute>
                      }
                    />

                    {/* Admin - Blog */}
                    <Route
                      path="/admin/blog/posts"
                      element={
                        <ProtectedRoute permissions={['blog.post.read']}>
                          <BlogList />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/blog/posts/new"
                      element={
                        <ProtectedRoute permissions={['blog.post.create']}>
                          <BlogForm mode="create" />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/blog/posts/:postId/edit"
                      element={
                        <ProtectedRoute permissions={['blog.post.update']}>
                          <BlogForm mode="edit" />
                        </ProtectedRoute>
                      }
                    />

                    {/* Protected (general) */}
                    <Route
                      path="/dashboard"
                      element={
                        <ProtectedRoute permissions={['dashboard.view']}>
                          <DashboardPage />
                        </ProtectedRoute>
                      }
                    />

                    {/* USERS */}
                    <Route
                      path="/users"
                      element={
                        <ProtectedRoute>
                          <UsersPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/users/new"
                      element={
                        <ProtectedRoute>
                          <UsersFormPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/users/edit/:id"
                      element={
                        <ProtectedRoute>
                          <UsersEditPage />
                        </ProtectedRoute>
                      }
                    />

                    {/* PROFILES */}
                    <Route
                      path="/profiles"
                      element={
                        <ProtectedRoute>
                          <ProfilesPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/profiles/new"
                      element={
                        <ProtectedRoute>
                          <ProfileFormPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/profiles/edit/:id"
                      element={
                        <ProtectedRoute>
                          <ProfileFormPage />
                        </ProtectedRoute>
                      }
                    />

                    {/* PERMISSIONS */}
                    <Route
                      path="/permissions"
                      element={
                        <ProtectedRoute>
                          <PermissionsPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/permissions/new"
                      element={
                        <ProtectedRoute>
                          <PermissionFormPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/permissions/edit/:id"
                      element={
                        <ProtectedRoute>
                          <PermissionFormPage />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/audit"
                      element={
                        <ProtectedRoute>
                          <AuditLogsPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/settings"
                      element={
                        <ProtectedRoute>
                          <SettingsPage />
                        </ProtectedRoute>
                      }
                    />
                  </Route>
                </Routes>
              </LayoutProvider>
            </I18nGate>
          </LanguageProvider>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
