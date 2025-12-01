import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../auth/contexts/AuthContext';
import { createCompany, getCompany, updateCompany } from '../api/companies';
import CompanyForm from './CompanyForm.jsx';

export default function CompanyFormPage() {
  const params = useParams();
  // suporta tanto /companies/:companyId/edit quanto /companies/:id/edit
  const companyId = params.companyId || params.id || null;
  const mode = companyId ? 'edit' : 'create';
  const { accessToken } = useAuth();
  const navigate = useNavigate();

  const [initialData, setInitialData] = useState(mode === 'create' ? {} : null);
  const [loading, setLoading] = useState(mode === 'edit');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (mode !== 'edit' || !companyId) {
      setInitialData({});
      setLoading(false);
      return;
    }

    let mounted = true;
    setLoading(true);
    setError('');

    getCompany(companyId, accessToken)
      .then((data) => {
        if (!mounted) return;
        // aceita tanto { id, ... } quanto { company: {...} }
        const company = data?.company || data;
        setInitialData(company || {});
      })
      .catch((e) => {
        console.error('[CompanyFormPage] getCompany error', e);
        if (!mounted) return;
        setError('Failed to load company.');
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [mode, companyId, accessToken]);

  const handleSubmit = async (payload) => {
    setSubmitting(true);
    setError('');
    try {
      if (mode === 'edit' && companyId) {
        await updateCompany(companyId, payload, accessToken);
      } else {
        // criação – backend já cria a matriz automaticamente
        await createCompany(payload, accessToken);
      }
      navigate('/companies');
    } catch (e) {
      console.error('[CompanyFormPage] submit error', e);
      setError('Failed to save company.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || (mode === 'edit' && !initialData)) {
    return (
      <div className="container">
        <h2>{mode === 'edit' ? 'Edit Company' : 'New Company'}</h2>
        <div>Loading…</div>
      </div>
    );
  }

  return (
    <div className="container">
      <h2>{mode === 'edit' ? 'Edit Company' : 'New Company'}</h2>
      {error && <div className="error-message">{error}</div>}

      <CompanyForm
        key={companyId || 'new'}
        initialData={initialData || {}}
        onSubmit={handleSubmit}
        submitting={submitting}
        readOnly={false}
      />
    </div>
  );
}
