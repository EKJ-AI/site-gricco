import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../../auth/contexts/AuthContext';
import EstablishmentForm from './EstablishmentForm.jsx';
import { getEstablishment, updateEstablishment } from '../api/establishments.js';

export default function EstablishmentEdit() {
  const { establishmentId } = useParams();
  const { accessToken } = useAuth();
  const navigate = useNavigate();

  const [initial, setInitial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);

    getEstablishment(establishmentId, accessToken)
      .then((res) => {
        if (!active) return;
        setInitial(res || null);
      })
      .catch((e) => {
        console.error(e);
        if (active) setError('Failed to load establishment.');
      })
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [establishmentId, accessToken]);

  async function handleSubmit(payload) {
    setSubmitting(true);
    setError('');
    try {
      await updateEstablishment(establishmentId, payload, accessToken);
      navigate(`/establishments/${establishmentId}`);
    } catch (e) {
      console.error(e);
      setError('Failed to update establishment.');
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
        <div className="error-message">Establishment not found.</div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-header">
        <h2>Edit Establishment</h2>
      </div>
      {error && <div className="error-message">{error}</div>}
      <EstablishmentForm initialData={initial} onSubmit={handleSubmit} submitting={submitting} />
    </div>
  );
}
