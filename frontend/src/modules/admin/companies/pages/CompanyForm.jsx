import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../../auth/contexts/AuthContext';
import { lookupCNPJ, lookupCEP } from '../api/catalog';
import { createCompany, updateCompany } from '../api/companies';
import iconPesquisar from '../../../../shared/assets/images/admin/iconPesquisar.svg';
import { useToast, extractErrorMessage } from '../../../../shared/components/toast/ToastProvider';

function onlyDigits(v = '') {
  return String(v).replace(/\D+/g, '');
}

function validateCompany(form) {
  const missing = [];

  const cnpj = onlyDigits(form.cnpj);
  const cep = onlyDigits(form.zipCode);

  if (!cnpj || cnpj.length !== 14) missing.push('CNPJ (14 dígitos)');
  if (!String(form.legalName || '').trim()) missing.push('Razão Social');
  if (!String(form.tradeName || '').trim()) missing.push('Nome Fantasia');

  if (!cep || cep.length !== 8) missing.push('CEP (8 dígitos)');
  if (!String(form.street || '').trim()) missing.push('Logradouro');
  if (!String(form.number || '').trim()) missing.push('Número');
  if (!String(form.district || '').trim()) missing.push('Bairro');
  if (!String(form.city || '').trim()) missing.push('Cidade');
  if (!String(form.state || '').trim()) missing.push('UF');

  return { ok: missing.length === 0, missing };
}

export default function CompanyForm({ initialData = {}, onSubmit, submitting = false, readOnly = false }) {
  const { accessToken } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { companyId } = useParams();
  const mode = companyId ? 'edit' : 'create';

  const [form, setForm] = useState({
    cnpj: initialData.cnpj || '',
    legalName: initialData.legalName || '',
    tradeName: initialData.tradeName || '',
    startAt: initialData.startAt ? String(initialData.startAt).slice(0, 10) : '',
    companySize: initialData.companySize || '',
    taxRegime: initialData.taxRegime || '',
    fiscalEmail: initialData.fiscalEmail || '',
    phone: initialData.phone || '',
    website: initialData.website || '',
    street: initialData.street || '',
    number: initialData.number || '',
    complement: initialData.complement || '',
    district: initialData.district || '',
    city: initialData.city || '',
    state: initialData.state || '',
    zipCode: initialData.zipCode || '',
    ibgeCityCode: initialData.ibgeCityCode || '',
    isActive: typeof initialData.isActive === 'boolean' ? initialData.isActive : true,
  });

  const [internalSubmitting, setInternalSubmitting] = useState(false);
  const isSubmitting = submitting || internalSubmitting;

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      ...initialData,
      startAt: initialData.startAt ? String(initialData.startAt).slice(0, 10) : prev.startAt,
      isActive: typeof initialData.isActive === 'boolean' ? initialData.isActive : (prev.isActive ?? true),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData?.id]);

  const setVal = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const validation = useMemo(() => validateCompany(form), [form]);
  const canSubmit = !readOnly && validation.ok && !isSubmitting;

  async function handleLookupCNPJ() {
    const cnpj = onlyDigits(form.cnpj);
    if (!cnpj || cnpj.length !== 14) {
      toast.warning('Informe um CNPJ válido com 14 dígitos.', { title: 'CNPJ inválido' });
      return;
    }

    try {
      const data = await lookupCNPJ(cnpj, accessToken);
      if (!data) {
        toast.warning('Não foi possível localizar o CNPJ informado.', { title: 'Sem retorno' });
        return;
      }

      const addr = data.address || data;

      setForm((f) => ({
        ...f,
        cnpj: data.cnpj || f.cnpj,
        legalName: f.legalName || data.legalName || '',
        tradeName: f.tradeName || data.tradeName || '',
        startAt: f.startAt || (data.startAt ? String(data.startAt).slice(0, 10) : ''),
        companySize:
          f.companySize ||
          data.porteDescription ||
          data.porte ||
          (data.size != null ? String(data.size) : '') ||
          '',
        taxRegime: f.taxRegime || data.taxRegime || '',
        fiscalEmail: f.fiscalEmail || data.fiscalEmail || data.email || '',
        phone: f.phone || data.phone || '',
        street: f.street || addr.street || '',
        number: f.number || addr.number || '',
        complement: f.complement || addr.complement || '',
        district: f.district || addr.district || '',
        city: f.city || addr.city || '',
        state: f.state || addr.state || '',
        zipCode: f.zipCode || addr.zipCode || '',
        ibgeCityCode: f.ibgeCityCode || addr.ibgeCityCode || '',
      }));

      toast.success('Dados preenchidos a partir do CNPJ.', { title: 'Consulta OK' });
    } catch (e) {
      console.error(e);
      toast.error(extractErrorMessage(e, 'Falha ao buscar CNPJ. Tente novamente.'), { title: 'Erro na consulta' });
    }
  }

  async function handleLookupCEP() {
    const cep = onlyDigits(form.zipCode);
    if (!cep || cep.length !== 8) {
      toast.warning('Informe um CEP válido com 8 dígitos.', { title: 'CEP inválido' });
      return;
    }

    try {
      const data = await lookupCEP(cep, accessToken);
      if (!data) {
        toast.warning('Não foi possível localizar o CEP informado.', { title: 'Sem retorno' });
        return;
      }

      setForm((f) => ({
        ...f,
        zipCode: data.cep ?? f.zipCode,
        street: data.street ?? f.street,
        district: data.district ?? f.district,
        city: data.city ?? f.city,
        state: data.state ?? f.state,
        ibgeCityCode: data.ibgeCityCode ?? f.ibgeCityCode,
      }));

      toast.success('Endereço preenchido a partir do CEP.', { title: 'Consulta OK' });
    } catch (e) {
      console.error(e);
      toast.error(extractErrorMessage(e, 'Falha ao buscar CEP. Tente novamente.'), { title: 'Erro na consulta' });
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const v = validateCompany(form);
    if (!v.ok) {
      const preview = v.missing.slice(0, 4).join(', ');
      const tail = v.missing.length > 4 ? `… (+${v.missing.length - 4})` : '';
      toast.warning(`Preencha os campos obrigatórios: ${preview}${tail}`, { title: 'Campos obrigatórios' });
      return;
    }

    if (typeof onSubmit === 'function') {
      onSubmit(form);
      return;
    }

    try {
      setInternalSubmitting(true);

      if (mode === 'edit' && companyId) await updateCompany(companyId, form, accessToken);
      else await createCompany(form, accessToken);

      toast.success('Empresa salva com sucesso.', { title: 'Salvo' });
      navigate('/companies');
    } catch (err) {
      console.error(err);
      toast.error(extractErrorMessage(err, 'Falha ao salvar empresa.'), { title: 'Não foi possível salvar' });
    } finally {
      setInternalSubmitting(false);
    }
  }

  return (
    <form className="pf-form" onSubmit={handleSubmit}>
      {/* Card 1: Identificação */}
      <section className="pf-section">
        <div className="grid-2">
          <label>
            CNPJ *
            <div className="pf-input-group">
              <input
                value={form.cnpj}
                onChange={(e) => setVal('cnpj', e.target.value)}
                disabled={readOnly}
                placeholder="00.000.000/0000-00"
              />
              {!readOnly && (
                <button type="button" className="pf-icon-btn" onClick={handleLookupCNPJ} aria-label="Buscar CNPJ" title="Buscar CNPJ">
                  <img src={iconPesquisar} alt="Buscar CNPJ" />
                </button>
              )}
            </div>
          </label>

          <label>
            Início atividades
            <input type="date" value={form.startAt} onChange={(e) => setVal('startAt', e.target.value)} disabled={readOnly} />
          </label>
        </div>

        <div className="pf-switch-row" style={{ marginTop: 10 }}>
          <p className="pf-switch-label">Empresa ativa</p>
          <input
            type="checkbox"
            className="pf-switch"
            checked={!!form.isActive}
            onChange={(e) => setVal('isActive', e.target.checked)}
            disabled={readOnly}
            aria-label="Empresa ativa"
          />
        </div>
      </section>

      {/* Card 2: Nomes */}
      <section className="pf-section">
        <div className="grid-2">
          <label>
            Razão Social *
            <input
              value={form.legalName}
              onChange={(e) => setVal('legalName', e.target.value)}
              disabled={readOnly}
              placeholder="Ex.: ACME LTDA"
            />
          </label>

          <label>
            Nome Fantasia *
            <input
              value={form.tradeName}
              onChange={(e) => setVal('tradeName', e.target.value)}
              disabled={readOnly}
              placeholder="Ex.: ACME"
            />
          </label>
        </div>
      </section>

      {/* Card 3: Dados fiscais/contato */}
      <section className="pf-section">
        <div className="grid-2">
          <label>
            Porte
            <input value={form.companySize} onChange={(e) => setVal('companySize', e.target.value)} disabled={readOnly} placeholder="ME/EPP/MEI/..." />
          </label>

          <label>
            Regime tributário
            <input value={form.taxRegime} onChange={(e) => setVal('taxRegime', e.target.value)} disabled={readOnly} placeholder="Simples / Lucro Presumido / ..." />
          </label>
        </div>

        <div className="grid-2" style={{ marginTop: 10 }}>
          <label>
            E-mail Fiscal
            <input type="email" value={form.fiscalEmail} onChange={(e) => setVal('fiscalEmail', e.target.value)} disabled={readOnly} placeholder="exemplo@empresa.com" />
          </label>

          <label>
            Telefone
            <input value={form.phone} onChange={(e) => setVal('phone', e.target.value)} disabled={readOnly} placeholder="+55 (xx) x xxxx-xxxx" />
          </label>
        </div>

        <div style={{ marginTop: 10 }}>
          <label>
            Website
            <input value={form.website} onChange={(e) => setVal('website', e.target.value)} disabled={readOnly} placeholder="https://www.exemplo.com" />
          </label>
        </div>
      </section>

      {/* Card 4: Endereço */}
      <section className="pf-section">
        <div className="grid-2">
          <label>
            CEP *
            <div className="pf-input-group">
              <input
                value={form.zipCode}
                onChange={(e) => setVal('zipCode', e.target.value)}
                disabled={readOnly}
                placeholder="00000-000"
              />
              {!readOnly && (
                <button type="button" className="pf-icon-btn" onClick={handleLookupCEP} aria-label="Buscar CEP" title="Buscar CEP">
                  <img src={iconPesquisar} alt="Buscar CEP" />
                </button>
              )}
            </div>
          </label>

          <label className="pf-input-sm">
            Número *
            <input value={form.number} onChange={(e) => setVal('number', e.target.value)} disabled={readOnly} placeholder="000" />
          </label>
        </div>

        <div className="grid-2" style={{ marginTop: 10 }}>
          <label>
            Logradouro *
            <input value={form.street} onChange={(e) => setVal('street', e.target.value)} disabled={readOnly} />
          </label>

          <label>
            Complemento
            <input value={form.complement} onChange={(e) => setVal('complement', e.target.value)} disabled={readOnly} placeholder="Apto, bloco, sala..." />
          </label>
        </div>

        <div className="grid-2" style={{ marginTop: 10 }}>
          <label>
            Bairro *
            <input value={form.district} onChange={(e) => setVal('district', e.target.value)} disabled={readOnly} />
          </label>

          <label>
            Cidade *
            <input value={form.city} onChange={(e) => setVal('city', e.target.value)} disabled={readOnly} />
          </label>
        </div>

        <div className="grid-2" style={{ marginTop: 10 }}>
          <label className="pf-input-sm">
            UF *
            <input value={form.state} onChange={(e) => setVal('state', e.target.value)} disabled={readOnly} />
          </label>
          <div />
        </div>

        <input type="hidden" value={form.ibgeCityCode || ''} readOnly />
      </section>

      {!readOnly && (
        <div className="pf-actions">
          <button type="button" className="pf-btn pf-btn-secondary" onClick={() => navigate(-1)} disabled={isSubmitting}>
            Cancelar
          </button>

          <button type="submit" className="pf-btn pf-btn-primary" disabled={!canSubmit}>
            {isSubmitting ? 'Salvando…' : 'Salvar cadastro'}
          </button>
        </div>
      )}
    </form>
  );
}
