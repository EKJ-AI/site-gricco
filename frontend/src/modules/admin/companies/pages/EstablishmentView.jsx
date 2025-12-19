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
import RequirePermission from '../../../../shared/hooks/RequirePermission';
import { NavLink } from 'react-router-dom';
import Tabs from '../components/Tabs.jsx';
import iconVoltar from '../../../../shared/assets/images/admin/iconSetaEsquerda.svg';

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
    location.pathname ===
    `/companies/${companyId}/establishments/${establishmentId}`;

  const isInactive = establishment?.isActive === false;

  return (
    <div className="container">
      <div className='barra-superior-pagina-interna'>
        <div className="page-header titulo">
          <RequirePermission permissions={['establishment.read']}>
            <NavLink to={`/companies/${companyId}`}>
                <img src={iconVoltar} alt="Voltar" style={{width: '24px', height: '24px', marginRight: '8px'}} />
            </NavLink>
          </RequirePermission>
          <h2>
            {establishment?.nickname || establishment?.cnpj || 'Establishment'}
            {isInactive && (
              <span
                style={{
                  marginLeft: 8,
                  padding: '2px 6px',
                  fontSize: 11,
                  borderRadius: 4,
                  backgroundColor: '#eee',
                  color: '#b00',
                  textTransform: 'uppercase',
                }}
              >
                Inativo
              </span>
            )}
          </h2>

          {/* <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <RequirePermission permission="establishment.update">
              <Link
                to={`/companies/${companyId}/establishments/${establishmentId}/edit`}
                className="primary"
              >
                Edit
              </Link>
            </RequirePermission>
          </div> */}
        </div>
        <Tabs />
      </div>

      {loading && <div>Loading…</div>}
      {err && <div className="error-message">{err}</div>}

      {!loading && !err && (
        <>
          <Outlet />

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
