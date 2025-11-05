import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './modules/auth/contexts/AuthContext';
import { ThemeProvider } from './shared/contexts/ThemeContext';
//import PrivateRoute from './components/PrivateRoute';
import ProtectedRoute from './shared/components/ProtectedRoute';
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
import BlogPost from './modules/home/components/BlogPost';
import './shared/styles/theme.css';
import './shared/i18n';
// import Footer from './shared/components/Footer';
// import Navbar from './modules/home/components/Navbar';
import ServicePage from './modules/services/ServicesPage';
import {
  sustainability,
  qsms,
  business,
  qsmsmanagement,
  offshore
} from "./modules/services/data/ServiceData";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <LanguageProvider>
          <ThemeProvider>
            {/* <Navbar/> */}
            <Routes>
              {/* Rotas Públicas */}
              <Route path="/" element={<HomePage />} />
              <Route path="/blog/:id" element={<BlogPost />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/reset-success" element={<ResetSuccessPage />} />
              <Route path="/sustainability" element={<ServicePage {...sustainability} />} />
              <Route path="/qsms" element={<ServicePage {...qsms} />} />
              <Route path="/business" element={<ServicePage {...business} />} />
              <Route path="/qsmsmanagement" element={<ServicePage {...qsmsmanagement} />} />
              <Route path="/offshore" element={<ServicePage {...offshore} />} />
              <Route path="/etica-e-compliance" element={<Etich />} />
              <Route path="/politica-de-compliance" element={<Compliance />} />

              {/* Rotas Protegidas */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              } />

              <Route path="/users" element={
                <ProtectedRoute>
                  <UsersPage />
                </ProtectedRoute>
              } />

              <Route path="/users/edit/:id" element={
                <ProtectedRoute>
                  <UsersEditPage />
                </ProtectedRoute>
              } />

              <Route path="/profiles" element={
                <ProtectedRoute>
                  <ProfilesPage />
                </ProtectedRoute>
              } />

              <Route path="/permissions" element={
                <ProtectedRoute>
                  <PermissionsPage />
                </ProtectedRoute>
              } />

              <Route path="/audit" element={
                <ProtectedRoute>
                  <AuditLogsPage />
                </ProtectedRoute>
              } />

              <Route path="/settings" element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              } />
            </Routes>
            {/* <Footer/> */}
          </ThemeProvider>
        </LanguageProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;