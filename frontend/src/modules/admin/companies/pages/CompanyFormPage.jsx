// src/modules/admin/companies/pages/CompanyFormPage.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../auth/contexts/AuthContext';
import { createCompany, getCompany, updateCompany } from '../api/companies';
import CompanyForm from './CompanyForm.jsx';
import usePermission from '../../../auth/hooks/usePermission';

import '../../../../shared/styles/padrao.css';

import { useToast, extractErrorMessage } from '../../../../shared/components/toast/ToastProvider';

export default function CompanyFormPage() {
  const params = useParams();
  const companyId = params.companyId || params.id || null;
  const mode = companyId ? 'edit' : 'create';

  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [initialData, setInitialData] = useState(mode === 'create' ? {} : null);
  const [loading, setLoading] = useState(mode === 'edit');
  const [submitting, setSubmitting] = useState(false);

  const canUpdate = usePermission('company.update');
  const canCreate = usePermission('company.create');

  useEffect(() => {
    if (mode !== 'edit' || !companyId) {
      setInitialData({});
      setLoading(false);
      return;
    }

    let mounted = true;
    setLoading(true);

    getCompany(companyId, accessToken)
      .then((data) => {
        if (!mounted) return;
        const company = data?.company || data;
        setInitialData(company || {});
      })
      .catch((e) => {
        console.error('[CompanyFormPage] getCompany error', e);
        if (!mounted) return;
        toast.error(extractErrorMessage(e, 'Failed to load company.'), { title: 'Falha ao carregar' });
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [mode, companyId, accessToken, toast]);

  const handleSubmit = async (payload) => {
    setSubmitting(true);

    try {
      if (mode === 'edit' && companyId) {
        if (!canUpdate) {
          toast.warning('Você não tem permissão para atualizar esta empresa.', { title: 'Permissão' });
          return;
        }
        await updateCompany(companyId, payload, accessToken);
      } else {
        if (!canCreate) {
          toast.warning('Você não tem permissão para criar empresas.', { title: 'Permissão' });
          return;
        }
        await createCompany(payload, accessToken);
      }

      toast.success('Empresa salva com sucesso.', { title: 'Salvo' });
      navigate('/companies');
    } catch (e) {
      console.error('[CompanyFormPage] submit error', e);
      toast.error(extractErrorMessage(e, 'Failed to save company.'), { title: 'Não foi possível salvar' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || (mode === 'edit' && !initialData)) {
    return (
      <div className="pf-page">
        <div className="pf-shell">
          <header className="pf-header">
            <div className="pf-header-left">
              <div className="pf-header-icon">▦</div>
              <div>
                <h1 className="pf-title">{mode === 'edit' ? 'Edit Company' : 'New Company'}</h1>
                <p className="pf-subtitle">Register your company here</p>
              </div>
            </div>
            <button type="button" className="pf-close" onClick={() => navigate(-1)} aria-label="Close">
              ×
            </button>
          </header>

          <div className="pf-section">
            <div>Loading…</div>
          </div>
        </div>
      </div>
    );
  }

  const readOnly = mode === 'edit' && !canUpdate;

  return (
    <div className="pf-page">
      <div className="pf-shell">
        <header className="pf-header">
          <div className="pf-header-left">
            <div className="pf-header-icon">▦</div>
            <div>
              <h1 className="pf-title">{mode === 'edit' ? 'Edit Company' : 'New Company'}</h1>
              <p className="pf-subtitle">Register your company here</p>
            </div>
          </div>
          <button type="button" className="pf-close" onClick={() => navigate(-1)} aria-label="Close">
            ×
          </button>
        </header>

        <CompanyForm
          key={companyId || 'new'}
          initialData={initialData || {}}
          onSubmit={handleSubmit}
          submitting={submitting}
          readOnly={readOnly}
        />
      </div>
    </div>
  );
}
