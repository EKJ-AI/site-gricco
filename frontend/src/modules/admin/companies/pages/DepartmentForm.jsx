import React, { useEffect, useState } from 'react';
import {
  createDepartmentInEstablishment,
  getDepartmentInEstablishment,
  updateDepartmentInEstablishment,
} from '../api/departments';
import { useAuth } from '../../../auth/contexts/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import usePermission from '../../../auth/hooks/usePermission';

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

  // permissões
  const canCreate = usePermission('department.create');
  const canUpdate = usePermission('department.update');

  useEffect(() => {
    if (mode === 'edit' && departmentId) {
      getDepartmentInEstablishment(
        companyId,
        establishmentId,
        departmentId,
        accessToken
      )
        .then((d) => {
          if (!d) return;
          setForm({
            name: d.name || '',
            description: d.description || '',
            shift: d.shift || '',
            workload: d.workload || '',
          });
        })
        .catch(() => {
          setError('Failed to load department.');
        });
    }
  }, [mode, departmentId, companyId, establishmentId, accessToken]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    // bloqueio por permissão
    if (mode === 'edit' && !canUpdate) {
      setError('You do not have permission to update departments.');
      return;
    }
    if (mode === 'create' && !canCreate) {
      setError('You do not have permission to create departments.');
      return;
    }

    try {
      if (mode === 'edit') {
        await updateDepartmentInEstablishment(
          companyId,
          establishmentId,
          departmentId,
          form,
          accessToken
        );
      } else {
        await createDepartmentInEstablishment(
          companyId,
          establishmentId,
          form,
          accessToken
        );
      }

      navigate(
        `/companies/${companyId}/establishments/${establishmentId}/departments`
      );
    } catch {
      setError('Failed to save.');
    }
  };

  const saveDisabled =
    (mode === 'edit' && !canUpdate) || (mode === 'create' && !canCreate);

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
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={saveDisabled}>
            Save
          </button>
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
