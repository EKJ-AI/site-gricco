import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../auth/contexts/AuthContext';
import CompanyForm from './CompanyForm.jsx';
import { createCompany } from '../api/companies.js';

export default function CompanyCreate() {
  alert("CompanyCreate");
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(form) {
    setSubmitting(true);
    setError('');
    try {
      // cria empresa + matriz automática
      const payload = {
        ...form,
        createHeadquarter: true,
      };

      const result = await createCompany(payload, accessToken);
      const companyId = result?.company?.id ?? result?.id;
      const headId = result?.headquarter?.id;

      if (headId) {
        navigate(`/establishments/${headId}`);
      } else if (companyId) {
        navigate(`/companies/${companyId}`);
      } else {
        navigate('/companies');
      }
    } catch (e) {
      console.error(e);
      setError('Failed to create company.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container">
      <div className="page-header">
        <h2>New Company</h2>
      </div>
      {error && <div className="error-message">{error}</div>}
      <CompanyForm onSubmit={handleSubmit} submitting={submitting} />
    </div>
  );
}
