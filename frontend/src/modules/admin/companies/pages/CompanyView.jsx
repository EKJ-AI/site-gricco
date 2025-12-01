// imports no topo
import React, { useEffect, useState } from 'react';
import { getCompany } from '../api/companies.js';
import { listEstablishments } from '../api/establishments.js';
import EstablishmentCard from '../components/EstablishmentCard.jsx';
import Pagination from '../components/Pagination.jsx';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../../auth/contexts/AuthContext.js';

export default function CompanyView() {
  const { accessToken } = useAuth();
  const { companyId } = useParams();

  const [company, setCompany] = useState(null);
  const [q, setQ] = useState('');
  const [data, setData] = useState({
    items: [],
    total: 0,
    page: 1,
    pageSize: 12,
  });

  const fetchEstabs = async (page = 1) => {
    const res = await listEstablishments(
      companyId,
      { page, pageSize: 12, q },
      accessToken
    );
    setData(res || { items: [], total: 0, page, pageSize: 12 });
  };

  useEffect(() => {
    getCompany(companyId, accessToken).then(setCompany);
    fetchEstabs(1);
  }, [companyId, accessToken]);

  return (
    <div className="container">
      <div className="page-header">
        <h2>{company?.legalName || 'Company'}</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            placeholder="Search establishments..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button onClick={() => fetchEstabs(1)}>Search</button>

          <Link to={`/companies/${companyId}/edit`} className="secondary">
            Edit Company
          </Link>

          <Link
            to={`/companies/${companyId}/establishments/new`}
            className="primary"
          >
            New Establishment
          </Link>

          <Link
            to={`/companies/${companyId}/employees`}
            className="secondary"
          >
            Employees
          </Link>
        </div>
      </div>

      <div className="grid">
        {data.items.map((e) => (
          <EstablishmentCard key={e.id} item={e} />
        ))}
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
