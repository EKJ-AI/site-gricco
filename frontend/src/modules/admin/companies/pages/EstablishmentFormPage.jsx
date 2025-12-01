// src/modules/admin/companies/pages/EstablishmentFormPage.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../auth/contexts/AuthContext';
import {
  createEstablishment,
  getEstablishment,
  updateEstablishment,
} from '../api/establishments';
import EstablishmentForm from './EstablishmentForm.jsx';

export default function EstablishmentFormPage() {
  const { companyId, establishmentId } = useParams();
  const mode = establishmentId ? 'edit' : 'create';

  const { accessToken } = useAuth();
  const navigate = useNavigate();

  const [initialData, setInitialData] = useState(
    mode === 'create' ? {} : null
  );
  const [loading, setLoading] = useState(mode === 'edit');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [effectiveCompanyId, setEffectiveCompanyId] = useState(companyId || null);

  useEffect(() => {
    // criação: não precisa carregar nada
    if (mode !== 'edit') {
      setLoading(false);
      return;
    }

    // edição mas sem params => erro de rota
    if (!companyId || !establishmentId) {
      console.error(
        '[EstablishmentFormPage] missing params',
        { companyId, establishmentId }
      );
      setError('Parâmetros de rota inválidos para edição de estabelecimento.');
      setLoading(false);
      return;
    }

    if (!accessToken) {
      setError('Sessão expirada. Faça login novamente.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    getEstablishment(companyId, establishmentId, accessToken)
      .then((data) => {
        setInitialData(data || {});
        if (data?.companyId) setEffectiveCompanyId(data.companyId);
      })
      .catch((e) => {
        console.error('[EstablishmentFormPage] getEstablishment error', e);
        setError('Failed to load establishment.');
      })
      .finally(() => setLoading(false));
  }, [mode, companyId, establishmentId, accessToken]);

  const handleSubmit = async (payload) => {
    setSubmitting(true);
    setError('');

    try {
      if (mode === 'edit' && establishmentId) {
        const cid = effectiveCompanyId || companyId;
        await updateEstablishment(cid, establishmentId, payload, accessToken);
      } else {
        if (!companyId) {
          throw new Error('Missing companyId in route for create');
        }
        await createEstablishment(companyId, payload, accessToken);
      }

      const redirectCompanyId = effectiveCompanyId || companyId;
      if (redirectCompanyId) {
        navigate(`/companies/${redirectCompanyId}`);
      } else {
        navigate('/companies');
      }
    } catch (e) {
      console.error('[EstablishmentFormPage] submit error', e);
      setError('Failed to save establishment.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <h2>{mode === 'edit' ? 'Edit Establishment' : 'New Establishment'}</h2>
        <div>Loading…</div>
      </div>
    );
  }

  return (
    <div className="container">
      <h2>{mode === 'edit' ? 'Edit Establishment' : 'New Establishment'}</h2>
      {error && <div className="error-message">{error}</div>}

      <EstablishmentForm
        initialData={initialData || {}}
        onSubmit={handleSubmit}
        submitting={submitting}
        readOnly={false}
      />
    </div>
  );
}
