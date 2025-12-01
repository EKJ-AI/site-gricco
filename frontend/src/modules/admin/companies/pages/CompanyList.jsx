import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import CompanyCard from '../components/CompanyCard.jsx';
import Pagination from '../components/Pagination.jsx';
import { listCompanies, deleteCompany } from '../api/companies.js';
import { useAuth } from '../../../auth/contexts/AuthContext.js';
import ProtectedRoute from '../../../../shared/components/ProtectedRoute.js';

export default function CompanyList() {
  const { accessToken } = useAuth();
  const [q, setQ] = useState('');
  const [data, setData] = useState({ items: [], total: 0, page: 1, pageSize: 12 });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const fetcher = async (page = 1) => {
    setLoading(true);
    setErr('');
    try {
      const res = await listCompanies({ page, pageSize: 12, q }, accessToken);
      setData(res || { items: [], total: 0, page, pageSize: 12 });
    } catch (e) {
      console.error(e);
      setErr('Failed to load companies.');
      setData({ items: [], total: 0, page, pageSize: 12 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetcher(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Confirm delete?')) return;
    setErr('');
    try {
      await deleteCompany(id, accessToken);
      fetcher(data.page);
    } catch (e) {
      console.error(e);
      setErr('Failed to delete company.');
    }
  };

  return (
    <div className="container">
      <div className="page-header">
        <h2>Companies</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            placeholder="Search..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button onClick={() => fetcher(1)}>Search</button>

          <ProtectedRoute inline permissions={['company.create']}>
            <Link to="/companies/new" className="primary">
              New Company
            </Link>
          </ProtectedRoute>
        </div>
      </div>

      {err && <div className="error-message">{err}</div>}
      {loading ? (
        <div>Loading...</div>
      ) : (
        <>
          <div className="grid">
            {data.items.map((c) => (
              <CompanyCard key={c.id} item={c} onDelete={handleDelete} />
            ))}
          </div>
          <Pagination
            page={data.page}
            pageSize={data.pageSize}
            total={data.total}
            onChange={(p) => fetcher(p)}
          />
        </>
      )}
    </div>
  );
}
