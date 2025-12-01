// src/modules/companies/pages/Employees.jsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  listEmployeesByCompany,
  listEmployeesByEstablishment,
  deleteEmployee,
} from '../api/employees.js';
import EmployeeTable from '../components/EmployeeTable.jsx';
import Pagination from '../components/Pagination.jsx';
import { useAuth } from '../../../auth/contexts/AuthContext.js';
import ProtectedRoute from '../../../../shared/components/ProtectedRoute.js';
import { Link, useParams, useLocation } from 'react-router-dom';

export default function Employees() {
  const { accessToken } = useAuth();
  const { companyId, establishmentId } = useParams();
  const { pathname } = useLocation();

  const scope = pathname.includes('/establishments/')
    ? 'establishment'
    : 'company';

  const [q, setQ] = useState('');
  const [data, setData] = useState({
    items: [],
    total: 0,
    page: 1,
    pageSize: 20,
  });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const fetcher = useCallback(
    async (page = 1) => {
      setLoading(true);
      setErr('');

      try {
        const res =
          scope === 'company'
            ? await listEmployeesByCompany(
                companyId,
                { page, pageSize: 20, q },
                accessToken
              )
            : await listEmployeesByEstablishment(
                establishmentId,
                { page, pageSize: 20, q },
                accessToken
              );

        setData(
          res || {
            items: [],
            total: 0,
            page,
            pageSize: 20,
          }
        );
      } catch (e) {
        setErr('Failed to load employees.');
        setData((old) => ({ ...old, items: [], total: 0, page }));
      } finally {
        setLoading(false);
      }
    },
    [scope, companyId, establishmentId, q, accessToken]
  );

  useEffect(() => {
    fetcher(1);
  }, [fetcher]);

  const onDelete = async (id) => {
    if (!window.confirm('Confirm delete?')) return;
    try {
      await deleteEmployee(id, accessToken);
      fetcher(data.page);
    } catch {
      setErr('Failed to delete employee.');
    }
  };

  const newUrl =
    scope === 'company'
      ? `/companies/${companyId}/employees/new`
      : `/establishments/${establishmentId}/employees/new`;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          marginBottom: 8,
          flexWrap: 'wrap',
        }}
      >
        <input
          placeholder="Search employees..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button onClick={() => fetcher(1)}>Search</button>

        <ProtectedRoute inline permissions={['employee.create']}>
          <Link to={newUrl} className="primary">
            New Employee
          </Link>
        </ProtectedRoute>
      </div>

      {err && <div className="error-message">{err}</div>}

      {loading ? (
        <div>Loading…</div>
      ) : (
        <>
          <EmployeeTable rows={data.items} onDelete={onDelete} scope={scope} />

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
