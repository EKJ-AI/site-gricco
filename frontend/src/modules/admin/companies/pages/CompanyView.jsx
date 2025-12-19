import React, { useEffect, useState } from 'react';
import { getCompany } from '../api/companies.js';
import {
  listEstablishments,
  deleteEstablishment,
} from '../api/establishments.js';
import EstablishmentCard from '../components/EstablishmentCard.jsx';
import Pagination from '../components/Pagination.jsx';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../../auth/contexts/AuthContext.js';
import RequirePermission from '../../../../shared/hooks/RequirePermission';

export default function CompanyView() {
  const { accessToken } = useAuth();
  const { companyId } = useParams();

  const [company, setCompany] = useState(null);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active'
  const [data, setData] = useState({
    items: [],
    total: 0,
    page: 1,
    pageSize: 12,
  });
  const [err, setErr] = useState('');

  const fetchEstabs = async (page = 1) => {
    setErr('');
    try {
      const res = await listEstablishments(
        companyId,
        { page, pageSize: 12, q, status: statusFilter },
        accessToken,
      );
      setData(res || { items: [], total: 0, page, pageSize: 12 });
    } catch (e) {
      console.error('[CompanyView] listEstablishments error', e);
      const msg =
        e?.response?.data?.message || 'Failed to load establishments.';
      setErr(msg);
      setData({ items: [], total: 0, page, pageSize: 12 });
    }
  };

  useEffect(() => {
    getCompany(companyId, accessToken)
      .then(setCompany)
      .catch((e) => {
        console.error('[CompanyView] getCompany error', e);
        setCompany(null);
      });
    fetchEstabs(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, accessToken]);

  useEffect(() => {
    fetchEstabs(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const handleDelete = async (id) => {
    if (!window.confirm('Confirm delete?')) return;
    setErr('');
    try {
      await deleteEstablishment(companyId, id, accessToken);
      fetchEstabs(data.page);
    } catch (e) {
      console.error('[CompanyView] deleteEstablishment error', e);
      const msg =
        e?.response?.data?.message || 'Failed to delete establishment.';
      setErr(msg);
      alert(msg);
    }
  };

  const isInactive = company?.isActive === false;

  return (
    <div className="container">
      <div className="page-header">
        <h2>
          {company?.legalName || 'Company'}
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
              Inativa
            </span>
          )}
        </h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {/* <input
            placeholder="Search establishments..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button onClick={() => fetchEstabs(1)}>Search</button>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All (active + inactive)</option>
            <option value="active">Only active</option>
          </select> */}

          {/* <RequirePermission permission="company.update">
            <Link
              to={`/companies/${companyId}/edit`}
              className="secondary"
            >
              Edit Company
            </Link>
          </RequirePermission> */}

          {/* <RequirePermission permission="establishment.create">
            <Link
              to={`/companies/${companyId}/establishments/new`}
              className="primary"
            >
              New Establishment
            </Link>
          </RequirePermission> */}
        </div>
      </div>

      {err && <div className="error-message">{err}</div>}

      <div className="cards">
        {data.items.map((e) => (
          <EstablishmentCard
            key={e.id}
            item={e}
            onDelete={handleDelete}
          />
        ))}
        <RequirePermission permission="establishment.create">
          <Link
            to={`/companies/${companyId}/establishments/new`}
            className="card-new">
              +
          </Link>
        </RequirePermission>   
      </div>

      <Pagination
        page={data.page}
        pageSize={data.pageSize}
        total={data.total}
        onChange={(p) => fetchEstabs(p)}
      />
    </div>
  );
}
