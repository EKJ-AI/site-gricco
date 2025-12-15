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
// import BlogPost from './modules/home/components/BlogPost';

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

// --- Companies Module (lists / views)
import CompanyList from './modules/admin/companies/pages/CompanyList.jsx';
import CompanyView from './modules/admin/companies/pages/CompanyView.jsx';
import EstablishmentList from './modules/admin/companies/pages/EstablishmentList.jsx';
import EstablishmentView from './modules/admin/companies/pages/EstablishmentView.jsx';
import Documents from './modules/admin/companies/pages/Documents.jsx';
import DocumentDetail from './modules/admin/companies/pages/DocumentDetail.jsx';
import Departments from './modules/admin/companies/pages/Departments.jsx';
import Employees from './modules/admin/companies/pages/Employees.jsx';

// --- Companies Module (forms / CRUD - PAGES, que fazem o fetch)
import CompanyFormPage from './modules/admin/companies/pages/CompanyFormPage.jsx';
import EstablishmentFormPage from './modules/admin/companies/pages/EstablishmentFormPage.jsx';

import DepartmentForm from './modules/admin/companies/pages/DepartmentForm.jsx';
import EmployeeForm from './modules/admin/companies/pages/EmployeeForm.jsx';
import DocumentForm from './modules/admin/companies/pages/DocumentForm.jsx';
import DocumentVersionUpload from './modules/admin/companies/pages/DocumentVersionUpload.jsx';
// import DocumentTypes from './modules/admin/companies/pages/DocumentTypes.jsx';
import DocumentTypeList from './modules/admin/companies/pages/DocumentTypeList.jsx';
import DocumentTypeForm from './modules/admin/companies/pages/DocumentTypeForm.jsx';

// 👇 IMPORT NOVO DO DASHBOARD DO ESTABELECIMENTO
import EstablishmentDashboard from './modules/admin/companies/pages/EstablishmentDashboard.jsx';

// --- Layouts
import PublicLayout from './shared/components/layouts/PublicLayout.jsx';
import PrivateLayout from './modules/admin/components/layouts/PrivateLayout.jsx';

import './shared/styles/global.css';

function App() {
  return (
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
                  {/* <Route path="/blog/:id" element={<BlogPost />} /> */}

                  {/* Blog público */}
                  <Route path="/blog" element={<BlogListPage />} />
                  <Route path="/blog/:slug" element={<BlogPostPage />} />

                  <Route path="/login" element={<LoginPage />} />
                  <Route
                    path="/forgot-password"
                    element={<ForgotPasswordPage />}
                  />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />
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
                  <Route path="/offshore" element={<ServicePage {...offshore} />} />
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

                  {/* Admin - Document Types */}
                  <Route
                    path="/admin/document-types"
                    element={
                      <ProtectedRoute permissions={['documentType.read']}>
                        <DocumentTypeList />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/document-types/new"
                    element={
                      <ProtectedRoute permissions={['documentType.create']}>
                        <DocumentTypeForm mode="create" />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/document-types/:documentTypeId/edit"
                    element={
                      <ProtectedRoute permissions={['documentType.update']}>
                        <DocumentTypeForm mode="edit" />
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

                  <Route
                    path="/users"
                    element={
                      <ProtectedRoute>
                        <UsersPage />
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

                  <Route
                    path="/profiles"
                    element={
                      <ProtectedRoute>
                        <ProfilesPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/permissions"
                    element={
                      <ProtectedRoute>
                        <PermissionsPage />
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

                  {/* =========================
                      Companies / Establishments
                     ========================= */}

                  {/* Companies - List & View */}
                  <Route
                    path="/companies"
                    element={
                      <ProtectedRoute permissions={['company.read']}>
                        <CompanyList />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/companies/:companyId"
                    element={
                      <ProtectedRoute permissions={['company.read']}>
                        <CompanyView />
                      </ProtectedRoute>
                    }
                  />

                  {/* Companies - Create / Edit */}
                  <Route
                    path="/companies/new"
                    element={
                      <ProtectedRoute permissions={['company.create']}>
                        <CompanyFormPage mode="create" />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/companies/:companyId/edit"
                    element={
                      <ProtectedRoute permissions={['company.update']}>
                        <CompanyFormPage mode="edit" />
                      </ProtectedRoute>
                    }
                  />

                  {/* Establishments (list by company) */}
                  <Route
                    path="/companies/:companyId/establishments"
                    element={
                      <ProtectedRoute permissions={['establishment.read']}>
                        <EstablishmentList />
                      </ProtectedRoute>
                    }
                  />

                  {/* Establishments - Create / Edit */}
                  <Route
                    path="/companies/:companyId/establishments/new"
                    element={
                      <ProtectedRoute permissions={['establishment.create']}>
                        <EstablishmentFormPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/companies/:companyId/establishments/:establishmentId/edit"
                    element={
                      <ProtectedRoute permissions={['establishment.update']}>
                        <EstablishmentFormPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Establishment "container" page com Outlet para abas internas */}
                  <Route
                    path="/companies/:companyId/establishments/:establishmentId"
                    element={
                      <ProtectedRoute permissions={['establishment.read']}>
                        <EstablishmentView />
                      </ProtectedRoute>
                    }
                  >
                    {/* 👇 DASHBOARD COMO TELA PADRÃO (INDEX) */}
                    <Route
                      index
                      element={
                        <ProtectedRoute permissions={['establishment.read']}>
                          <EstablishmentDashboard />
                        </ProtectedRoute>
                      }
                    />

                    {/* 👇 ROTA EXPLÍCITA /dashboard */}
                    <Route
                      path="dashboard"
                      element={
                        <ProtectedRoute permissions={['establishment.read']}>
                          <EstablishmentDashboard />
                        </ProtectedRoute>
                      }
                    />

                    {/* Lista de documentos do estabelecimento */}
                    <Route
                      path="documents"
                      element={
                        <ProtectedRoute permissions={['document.read']}>
                          <Documents />
                        </ProtectedRoute>
                      }
                    />
                    {/* Detalhe de um documento */}
                    <Route
                      path="documents/:documentId"
                      element={
                        <ProtectedRoute permissions={['document.read']}>
                          <DocumentDetail />
                        </ProtectedRoute>
                      }
                    />
                    {/* Departments list (inside establishment) */}
                    <Route
                      path="departments"
                      element={
                        <ProtectedRoute permissions={['department.read']}>
                          <Departments />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="departments/new"
                      element={
                        <ProtectedRoute permissions={['department.create']}>
                          <DepartmentForm mode="create" />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="departments/:departmentId/edit"
                      element={
                        <ProtectedRoute permissions={['department.update']}>
                          <DepartmentForm mode="edit" />
                        </ProtectedRoute>
                      }
                    />
                    {/* Employees list (inside establishment) */}
                    <Route
                      path="employees"
                      element={
                        <ProtectedRoute permissions={['employee.read']}>
                          <Employees />
                        </ProtectedRoute>
                      }
                    />
                  </Route>

                  {/* Documents - Create / Edit (scoped to establishment) */}
                  <Route
                    path="/companies/:companyId/establishments/:establishmentId/documents/new"
                    element={
                      <ProtectedRoute permissions={['document.create']}>
                        <DocumentForm mode="create" />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/companies/:companyId/establishments/:establishmentId/documents/:documentId/edit"
                    element={
                      <ProtectedRoute permissions={['document.update']}>
                        <DocumentForm mode="edit" />
                      </ProtectedRoute>
                    }
                  />

                  {/* Document Versions - Upload (new file version) */}
                  <Route
                    path="/companies/:companyId/establishments/:establishmentId/documents/:documentId/versions/new"
                    element={
                      <ProtectedRoute permissions={['documentVersion.create']}>
                        <DocumentVersionUpload />
                      </ProtectedRoute>
                    }
                  />

                  {/* Employees - Company-level & Establishment-level */}
                  <Route
                    path="/companies/:companyId/employees"
                    element={
                      <ProtectedRoute permissions={['employee.read']}>
                        <Employees />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/companies/:companyId/employees/new"
                    element={
                      <ProtectedRoute permissions={['employee.create']}>
                        <EmployeeForm mode="create" />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/companies/:companyId/employees/:employeeId/edit"
                    element={
                      <ProtectedRoute permissions={['employee.update']}>
                        <EmployeeForm mode="edit" />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/companies/:companyId/establishments/:establishmentId/employees/new"
                    element={
                      <ProtectedRoute permissions={['employee.create']}>
                        <EmployeeForm mode="create" />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/companies/:companyId/establishments/:establishmentId/employees/:employeeId/edit"
                    element={
                      <ProtectedRoute permissions={['employee.update']}>
                        <EmployeeForm mode="edit" />
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
  );
}

export default App;
