import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../../auth/contexts/AuthContext';
import EstablishmentForm from './EstablishmentForm.jsx';
import { createEstablishment } from '../api/establishments.js';

export default function EstablishmentCreate() {
  const { companyId } = useParams();
  const { accessToken } = useAuth();
  const navigate = useNavigate();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(payload) {
    setSubmitting(true);
    setError('');
    try {
      const created = await createEstablishment(companyId, payload, accessToken);
      const id = created?.id;
      if (id) navigate(`/establishments/${id}`);
      else navigate(`/companies/${companyId}`);
    } catch (e) {
      console.error(e);
      setError('Failed to create establishment.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container">
      <div className="page-header">
        <h2>New Establishment</h2>
      </div>
      {error && <div className="error-message">{error}</div>}
      <EstablishmentForm onSubmit={handleSubmit} submitting={submitting} />
    </div>
  );
}
