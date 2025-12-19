// src/modules/admin/companies/pages/EstablishmentFormPage.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../auth/contexts/AuthContext';
import { createEstablishment, getEstablishment, updateEstablishment } from '../api/establishments';
import EstablishmentForm from './EstablishmentForm.jsx';

import '../../../../shared/styles/padrao.css';

import { useToast, extractErrorMessage } from '../../../../shared/components/toast/ToastProvider';

export default function EstablishmentFormPage() {
  const { companyId, establishmentId } = useParams();
  const mode = establishmentId ? 'edit' : 'create';

  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [initialData, setInitialData] = useState(mode === 'create' ? {} : null);
  const [loading, setLoading] = useState(mode === 'edit');
  const [submitting, setSubmitting] = useState(false);
  const [effectiveCompanyId, setEffectiveCompanyId] = useState(companyId || null);

  useEffect(() => {
    if (mode !== 'edit') {
      setLoading(false);
      return;
    }

    if (!companyId || !establishmentId) {
      toast.error('Parâmetros de rota inválidos para edição de estabelecimento.', { title: 'Erro de rota' });
      setLoading(false);
      return;
    }

    if (!accessToken) {
      toast.warning('Sessão expirada. Faça login novamente.', { title: 'Sessão' });
      setLoading(false);
      return;
    }

    setLoading(true);

    getEstablishment(companyId, establishmentId, accessToken)
      .then((data) => {
        setInitialData(data || {});
        if (data?.companyId) setEffectiveCompanyId(data.companyId);
      })
      .catch((e) => {
        console.error('[EstablishmentFormPage] getEstablishment error', e);
        toast.error(extractErrorMessage(e, 'Failed to load establishment.'), { title: 'Falha ao carregar' });
      })
      .finally(() => setLoading(false));
  }, [mode, companyId, establishmentId, accessToken, toast]);

  const handleSubmit = async (payload) => {
    setSubmitting(true);

    try {
      if (mode === 'edit' && establishmentId) {
        const cid = effectiveCompanyId || companyId;
        await updateEstablishment(cid, establishmentId, payload, accessToken);
      } else {
        if (!companyId) throw new Error('Missing companyId in route for create');
        await createEstablishment(companyId, payload, accessToken);
      }

      toast.success('Estabelecimento salvo com sucesso.', { title: 'Salvo' });

      const redirectCompanyId = effectiveCompanyId || companyId;
      navigate(redirectCompanyId ? `/companies/${redirectCompanyId}` : '/companies');
    } catch (e) {
      console.error('[EstablishmentFormPage] submit error', e);
      toast.error(extractErrorMessage(e, 'Failed to save establishment.'), { title: 'Não foi possível salvar' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pf-page">
      <div className="pf-shell">
        <header className="pf-header">
          <div className="pf-header-left">
            <div className="pf-header-icon">▦</div>
            <div>
              <h1 className="pf-title">{mode === 'edit' ? 'Edit Establishment' : 'New Establishment'}</h1>
              <p className="pf-subtitle">Register your establishment here</p>
            </div>
          </div>
          <button type="button" className="pf-close" onClick={() => navigate(-1)} aria-label="Close">
            ×
          </button>
        </header>

        {loading && <div className="pf-section">Loading…</div>}

        {!loading && (
          <EstablishmentForm
            initialData={initialData || {}}
            onSubmit={handleSubmit}
            submitting={submitting}
            readOnly={false}
          />
        )}
      </div>
    </div>
  );
}
