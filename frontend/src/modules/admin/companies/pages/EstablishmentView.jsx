// src/modules/companies/pages/EstablishmentView.jsx
import React, { useEffect, useState } from 'react';
import { getEstablishment } from '../api/establishments.js';
import { useAuth } from '../../../auth/contexts/AuthContext.js';
import {
  useParams,
  Link,
  Outlet,
  useLocation,
  Navigate,
} from 'react-router-dom';
import ProtectedRoute from '../../../../shared/components/ProtectedRoute.js';
import Tabs from '../components/Tabs.jsx';

export default function EstablishmentView() {
  const { accessToken } = useAuth();
  const { companyId, establishmentId } = useParams();
  const location = useLocation();

  const [establishment, setEstablishment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!companyId || !establishmentId) {
      setLoading(false);
      setErr('Invalid route parameters for establishment.');
      return;
    }
    if (!accessToken) {
      setLoading(false);
      setErr('Session expired. Please login again.');
      return;
    }

    let mounted = true;
    setLoading(true);
    setErr('');

    // ✅ usa (companyId, establishmentId, token)
    getEstablishment(companyId, establishmentId, accessToken)
      .then((res) => {
        if (!mounted) return;
        setEstablishment(res || null);
      })
      .catch((error) => {
        if (!mounted) return;
        console.error('[EstablishmentView] getEstablishment error', error);
        setErr('Failed to load establishment.');
        setEstablishment(null);
      })
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, [companyId, establishmentId, accessToken]);

  const isBasePath =
    location.pathname === `/companies/${companyId}/establishments/${establishmentId}`;

  return (
    <div className="container">
      <div className="page-header">
        <h2>{establishment?.nickname || establishment?.cnpj || 'Establishment'}</h2>

        {/* 🔹 Só o botão Edit aqui – os menus Documents/Departments/Employees ficam no Tabs */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <ProtectedRoute inline permissions={['establishment.update']}>
            <Link
              to={`/companies/${companyId}/establishments/${establishmentId}/edit`}
              className="primary"
            >
              Edit
            </Link>
          </ProtectedRoute>
        </div>
      </div>

      {loading && <div>Loading…</div>}
      {err && <div className="error-message">{err}</div>}

      {!loading && !err && (
        <>
          {/* Tabs deve ser o único responsável pelos "menus" internos:
              Documents / Departments / Employees */}
          <Tabs />

          {/* Rotas filhas: documents/departments/employees */}
          <Outlet />

          {/* Abriu /companies/:companyId/establishments/:establishmentId "seco"? redireciona pra documents */}
          {isBasePath && (
            <Navigate
              to={`/companies/${companyId}/establishments/${establishmentId}/documents`}
              replace
            />
          )}
        </>
      )}
    </div>
  );
}
