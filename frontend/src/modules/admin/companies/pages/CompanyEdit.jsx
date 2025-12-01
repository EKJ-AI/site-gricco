import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../../auth/contexts/AuthContext';
import CompanyForm from './CompanyForm.jsx';
import { getCompany, updateCompany } from '../api/companies.js';

export default function CompanyEdit() {
  alert("EDIT");

  const { companyId } = useParams();
  const { accessToken } = useAuth();
  const navigate = useNavigate();

  const [initial, setInitial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);

    getCompany(companyId, accessToken)
      .then((c) => {
        if (!active) return;
        setInitial(c || null);
      })
      .catch((e) => {
        console.error(e);
        if (active) setError('Failed to load company.');
      })
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [companyId, accessToken]);

  async function handleSubmit(form) {
    setSubmitting(true);
    setError('');
    try {
      await updateCompany(companyId, form, accessToken);
      navigate(`/companies/${companyId}`);
    } catch (e) {
      console.error(e);
      setError('Failed to update company.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="container">
        <div>Loading…</div>
      </div>
    );
  }

  if (!initial) {
    return (
      <div className="container">
        <div className="error-message">Company not found.</div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-header">
        <h2>Edit Company</h2>
      </div>
      {error && <div className="error-message">{error}</div>}
      <CompanyForm initialData={initial} onSubmit={handleSubmit} submitting={submitting} />
    </div>
  );
}
