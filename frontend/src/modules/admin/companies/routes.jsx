// src/modules/companies/companiesRoutes.jsx
import React from 'react';
import { Route, Navigate } from 'react-router-dom';

import CompanyList from './pages/CompanyList.jsx';
import CompanyView from './pages/CompanyView.jsx';
import CompanyFormPage from './pages/CompanyFormPage.jsx';

import EstablishmentList from './pages/EstablishmentList.jsx';
import EstablishmentView from './pages/EstablishmentView.jsx';
import Documents from './pages/Documents.jsx';
import DocumentDetail from './pages/DocumentDetail.jsx';
import DocumentForm from './pages/DocumentForm.jsx';
import DocumentVersionUpload from './pages/DocumentVersionUpload.jsx';
import Departments from './pages/Departments.jsx';
import Employees from './pages/Employees.jsx';
import EmployeeForm from './pages/EmployeeForm.jsx';

// 👇 NOVO: dashboard do estabelecimento
import EstablishmentDashboard from './pages/EstablishmentDashboard.jsx';

// Helper to mount inside your <Routes>
export default function companiesRoutes() {
  return (
    <>
      {/* Companies */}
      <Route path="/companies" element={<CompanyList />} />
      <Route
        path="/companies/new"
        element={<CompanyFormPage mode="create" />}
      />
      <Route
        path="/companies/:companyId"
        element={<CompanyView />}
      />
      <Route
        path="/companies/:companyId/edit"
        element={<CompanyFormPage mode="edit" />}
      />

      {/* Establishments list from company */}
      <Route
        path="/companies/:companyId/establishments"
        element={<EstablishmentList />}
      />

      {/* Establishment "view" with tabs */}
      <Route
        path="/companies/:companyId/establishments/:establishmentId"
        element={<EstablishmentView />}
      >
        {/* 👇 index agora redireciona para o dashboard */}
        <Route index element={<Navigate to="dashboard" replace />} />

        {/* 👇 nova rota de dashboard */}
        <Route path="dashboard" element={<EstablishmentDashboard />} />

        <Route path="documents" element={<Documents />} />
        <Route path="documents/:documentId" element={<DocumentDetail />} />
        <Route path="departments" element={<Departments />} />
        <Route path="employees" element={<Employees />} />
      </Route>

      {/* Documents - create/edit */}
      <Route
        path="/companies/:companyId/establishments/:establishmentId/documents/new"
        element={<DocumentForm mode="create" />}
      />
      <Route
        path="/companies/:companyId/establishments/:establishmentId/documents/:documentId/edit"
        element={<DocumentForm mode="edit" />}
      />

      {/* Document version upload */}
      <Route
        path="/companies/:companyId/establishments/:establishmentId/documents/:documentId/versions/new"
        element={<DocumentVersionUpload />}
      />

      {/* Employees list for company */}
      <Route
        path="/companies/:companyId/employees"
        element={<Employees />}
      />

      {/* Employees - create/edit for company */}
      <Route
        path="/companies/:companyId/employees/new"
        element={<EmployeeForm mode="create" />}
      />
      <Route
        path="/companies/:companyId/employees/:employeeId/edit"
        element={<EmployeeForm mode="edit" />}
      />

      {/* Employees - create/edit for establishment */}
      <Route
        path="/companies/:companyId/establishments/:establishmentId/employees/new"
        element={<EmployeeForm mode="create" />}
      />
      <Route
        path="/companies/:companyId/establishments/:establishmentId/employees/:employeeId/edit"
        element={<EmployeeForm mode="edit" />}
      />
    </>
  );
}
