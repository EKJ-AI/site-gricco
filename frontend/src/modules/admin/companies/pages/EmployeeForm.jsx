// src/modules/companies/pages/EmployeeForm.jsx
import React, { useEffect, useState } from 'react';
import { createEmployee, getEmployee, updateEmployee } from '../api/employees';
import { getEstablishment } from '../api/establishments';
import { useAuth } from '../../../auth/contexts/AuthContext';
import { useNavigate, useParams, useLocation } from 'react-router-dom';

export default function EmployeeForm({ mode = 'create' }) {
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const { companyId, establishmentId, employeeId } = useParams();
  const { pathname } = useLocation();
  const scope = pathname.includes('/establishments/')
    ? 'establishment'
    : 'company';

  const [form, setForm] = useState({
    cpf: '',
    name: '',
    jobTitle: '',
    email: '',
    phone: '',
  });
  const [error, setError] = useState('');
  const [resolvedCompanyId, setResolvedCompanyId] = useState(companyId || null);
  const [loadingCompany, setLoadingCompany] = useState(false);

  // Carrega dados do funcionário no modo edição
  useEffect(() => {
    if (mode === 'edit' && employeeId) {
      getEmployee(employeeId, accessToken).then((d) => {
        setForm({
          cpf: d.cpf || '',
          name: d.name || '',
          jobTitle: d.jobTitle || '',
          email: d.email || '',
          phone: d.phone || '',
        });
      });
    }
  }, [mode, employeeId, accessToken]);

  // Resolve companyId quando estivermos criando a partir de um estabelecimento
  useEffect(() => {
    if (mode !== 'create') return;

    // Se já vier pelo param (rota /companies/:companyId/...), beleza
    if (companyId) {
      setResolvedCompanyId(companyId);
      return;
    }

    // Escopo de estabelecimento, sem companyId → buscar no backend
    if (scope === 'establishment' && establishmentId && accessToken) {
      setLoadingCompany(true);
      getEstablishment(establishmentId, accessToken)
        .then((est) => {
          setResolvedCompanyId(est?.companyId || null);
        })
        .catch(() => {
          setError('Failed to resolve company for this establishment.');
        })
        .finally(() => {
          setLoadingCompany(false);
        });
    }
  }, [mode, scope, companyId, establishmentId, accessToken]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (mode === 'edit') {
        await updateEmployee(employeeId, form, accessToken);
      } else {
        const finalCompanyId = companyId || resolvedCompanyId;

        if (!finalCompanyId || !establishmentId) {
          setError('Missing company/establishment to create employee.');
          return;
        }

        await createEmployee(
          { ...form, companyId: finalCompanyId, establishmentId },
          accessToken
        );
      }

      if (scope === 'company') {
        navigate(`/companies/${companyId}/employees`);
      } else {
        navigate(`/establishments/${establishmentId}/employees`);
      }
    } catch {
      setError('Failed to save.');
    }
  };

  const isSavingDisabled =
    mode === 'create' &&
    scope === 'establishment' &&
    !companyId &&
    (!resolvedCompanyId || loadingCompany);

  return (
    <div className="container">
      <h2>{mode === 'edit' ? 'Edit Employee' : 'New Employee'}</h2>
      {error && <div className="error-message">{error}</div>}

      {loadingCompany && mode === 'create' && scope === 'establishment' && (
        <div>Resolving company…</div>
      )}

      <form className="form" onSubmit={submit}>
        <div className="grid-2">
          <input
            placeholder="CPF"
            value={form.cpf}
            onChange={(e) => setForm({ ...form, cpf: e.target.value })}
            required
          />
          <input
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>
        <div className="grid-2">
          <input
            placeholder="Job Title"
            value={form.jobTitle}
            onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
          />
          <input
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div className="grid-1">
          <input
            placeholder="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={isSavingDisabled}>
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
