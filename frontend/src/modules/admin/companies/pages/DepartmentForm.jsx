// src/modules/companies/pages/DepartmentForm.jsx
import React, { useEffect, useState } from 'react';
import { createDepartment, getDepartment, updateDepartment } from '../api/departments';
import { useAuth } from '../../../auth/contexts/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';

export default function DepartmentForm({ mode = 'create' }) {
  const { accessToken } = useAuth();
  const { companyId, establishmentId, departmentId } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    description: '',
    shift: '',
    workload: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (mode === 'edit' && departmentId) {
      getDepartment(departmentId, accessToken).then((d) => {
        if (!d) return;
        setForm({
          name: d.name || '',
          description: d.description || '',
          shift: d.shift || '',
          workload: d.workload || '',
        });
      });
    }
  }, [mode, departmentId, accessToken]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (mode === 'edit') {
        await updateDepartment(departmentId, form, accessToken);
      } else {
        // API atual: createDepartment(establishmentId, payload, token)
        await createDepartment(establishmentId, form, accessToken);
      }

      navigate(
        `/companies/${companyId}/establishments/${establishmentId}/departments`
      );
    } catch {
      setError('Failed to save.');
    }
  };

  return (
    <div className="container">
      <h2>{mode === 'edit' ? 'Edit Department' : 'New Department'}</h2>
      {error && <div className="error-message">{error}</div>}

      <form className="form" onSubmit={submit}>
        <div className="grid-2">
          <input
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            placeholder="Shift"
            value={form.shift}
            onChange={(e) => setForm({ ...form, shift: e.target.value })}
          />
        </div>
        <div className="grid-2">
          <input
            placeholder="Workload"
            value={form.workload}
            onChange={(e) => setForm({ ...form, workload: e.target.value })}
          />
          <input
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit">Save</button>
          <button
            type="button"
            className="secondary"
            onClick={() => navigate(-1)}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
