import React, { useEffect, useState } from 'react';
import {
  listDepartmentsInEstablishment,
  deleteDepartmentInEstablishment,
} from '../api/departments.js';
import DepartmentTable from '../components/DepartmentTable.jsx';
import Pagination from '../components/Pagination.jsx';
import { useAuth } from '../../../auth/contexts/AuthContext.js';
import RequirePermission from '../../../../shared/hooks/RequirePermission';
import { Link, useParams } from 'react-router-dom';

export default function Departments() {
  const { accessToken } = useAuth();
  const { companyId, establishmentId } = useParams();

  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('active'); // all | active | inactive
  const [data, setData] = useState({
    items: [],
    total: 0,
    page: 1,
    pageSize: 20,
  });

  const fetcher = async (page = 1) => {
    try {
      const res = await listDepartmentsInEstablishment(
        companyId,
        establishmentId,
        { page, pageSize: 20, q, status: statusFilter },
        accessToken,
      );
      setData(res || { items: [], total: 0, page, pageSize: 20 });
    } catch {
      setData({ items: [], total: 0, page, pageSize: 20 });
    }
  };

  useEffect(() => {
    fetcher(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, establishmentId, accessToken, statusFilter]);

  const onDelete = async (id) => {
    if (!window.confirm('Confirm delete?')) return;
    await deleteDepartmentInEstablishment(
      companyId,
      establishmentId,
      id,
      accessToken,
    );
    fetcher(data.page);
  };

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
          placeholder="Search departments..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button onClick={() => fetcher(1)}>Search</button>

        {/* Filtro de status */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All</option>
          <option value="active">Only active</option>
          <option value="inactive">Only inactive</option>
        </select>

        <RequirePermission permissions={['department.create']}>
          <Link
            to={`/companies/${companyId}/establishments/${establishmentId}/departments/new`}
            className="primary"
          >
            New Department
          </Link>
        </RequirePermission>
      </div>

      <DepartmentTable rows={data.items} onDelete={onDelete} />
      <Pagination
        page={data.page}
        pageSize={data.pageSize}
        total={data.total}
        onChange={(p) => fetcher(p)}
      />
    </div>
  );
}
