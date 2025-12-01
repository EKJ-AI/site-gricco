import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../../auth/contexts/AuthContext';
import { lookupCNPJ, lookupCEP } from '../api/catalog';
import { createCompany, updateCompany } from '../api/companies';

function onlyDigits(v = '') {
  return String(v).replace(/\D+/g, '');
}

/**
 * CompanyForm
 *
 * Modo “pro”:
 *  - Se receber `onSubmit`, delega o submit para o caller.
 *  - Se NÃO receber `onSubmit`, ele mesmo chama createCompany/updateCompany e navega para /companies.
 */
export default function CompanyForm({
  initialData = {},
  onSubmit,          // opcional
  submitting = false,
  readOnly = false,
}) {
  const { accessToken } = useAuth();
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
    // address
    street: initialData.street || '',
    number: initialData.number || '',
    complement: initialData.complement || '',
    district: initialData.district || '',
    city: initialData.city || '',
    state: initialData.state || '',
    zipCode: initialData.zipCode || '',
    ibgeCityCode: initialData.ibgeCityCode || '',
  });

  const [internalSubmitting, setInternalSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const isSubmitting = submitting || internalSubmitting;

  // sincroniza quando o initialData chega assíncrono (edição)
  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      ...initialData,
      startAt: initialData.startAt
        ? String(initialData.startAt).slice(0, 10)
        : prev.startAt,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData?.id]);

  const setVal = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function handleLookupCNPJ() {
    const cnpj = onlyDigits(form.cnpj);
    if (!cnpj || cnpj.length < 14) {
      alert('Informe um CNPJ válido (14 dígitos).');
      return;
    }
    try {
      const data = await lookupCNPJ(cnpj, accessToken);
      if (!data) return;

      /**
       * Backend esperado:
       * {
       *   cnpj, legalName, tradeName, startAt,
       *   size, porte, porteDescription,
       *   taxRegime, simplesOptant, meiOptant,
       *   fiscalEmail, phone,
       *   legalNature,
       *   street, number, complement, district, city, state, zipCode, ibgeCityCode,
       *   address: { ... },
       *   mainCnae, mainCnaeDesc, secondaryCnaes: [...]
       * }
       */
      const addr = data.address || data;

      setForm((f) => ({
        ...f,
        cnpj: data.cnpj || f.cnpj,

        legalName: f.legalName || data.legalName || '',
        tradeName: f.tradeName || data.tradeName || '',
        startAt:
          f.startAt || (data.startAt ? String(data.startAt).slice(0, 10) : ''),

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
    } catch (e) {
      console.error(e);
      alert('Falha ao buscar CNPJ. Tente novamente.');
    }
  }

  async function handleLookupCEP() {
    const cep = onlyDigits(form.zipCode);
    if (!cep || cep.length < 8) {
      alert('Informe um CEP válido (8 dígitos).');
      return;
    }
    try {
      const data = await lookupCEP(cep, accessToken);
      if (!data) return;
      setForm((f) => ({
        ...f,
        zipCode: data.cep ?? f.zipCode,
        street: data.street ?? f.street,
        district: data.district ?? f.district,
        city: data.city ?? f.city,
        state: data.state ?? f.state,
        ibgeCityCode: data.ibgeCityCode ?? f.ibgeCityCode,
      }));
    } catch (e) {
      console.error(e);
      alert('Falha ao buscar CEP. Tente novamente.');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMessage('');

    // Caso “controlado”: quem chamou o CompanyForm cuida do submit
    if (typeof onSubmit === 'function') {
      onSubmit(form);
      return;
    }

    // Fallback: comportamento padrão, totalmente plug-and-play
    try {
      setInternalSubmitting(true);

      if (mode === 'edit' && companyId) {
        await updateCompany(companyId, form, accessToken);
      } else {
        await createCompany(form, accessToken);
      }

      navigate('/companies');
    } catch (err) {
      console.error(err);
      setErrorMessage('Falha ao salvar empresa.');
    } finally {
      setInternalSubmitting(false);
    }
  }
  alert("CompanyForm");
  return (
    <form className="form" onSubmit={handleSubmit}>
      {errorMessage && <div className="error-message">{errorMessage}</div>}

      <div className="grid-2">
        <label>
          CNPJ
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={form.cnpj}
              onChange={(e) => setVal('cnpj', e.target.value)}
              disabled={readOnly}
              placeholder="00.000.000/0000-00"
            />
            {!readOnly && (
              <button type="button" onClick={handleLookupCNPJ}>
                Buscar CNPJ
              </button>
            )}
          </div>
        </label>
        <label>
          Início atividade
          <input
            type="date"
            value={form.startAt}
            onChange={(e) => setVal('startAt', e.target.value)}
            disabled={readOnly}
          />
        </label>
      </div>

      <div className="grid-2">
        <label>
          Razão Social
          <input
            value={form.legalName}
            onChange={(e) => setVal('legalName', e.target.value)}
            disabled={readOnly}
          />
        </label>
        <label>
          Nome Fantasia
          <input
            value={form.tradeName}
            onChange={(e) => setVal('tradeName', e.target.value)}
            disabled={readOnly}
          />
        </label>
      </div>

      <div className="grid-3">
        <label>
          Porte
          <input
            value={form.companySize}
            onChange={(e) => setVal('companySize', e.target.value)}
            disabled={readOnly}
            placeholder="ME/EPP/MEI/..."
          />
        </label>
        <label>
          Regime Tributário
          <input
            value={form.taxRegime}
            onChange={(e) => setVal('taxRegime', e.target.value)}
            disabled={readOnly}
          />
        </label>
        <label>
          E-mail Fiscal
          <input
            type="email"
            value={form.fiscalEmail}
            onChange={(e) => setVal('fiscalEmail', e.target.value)}
            disabled={readOnly}
          />
        </label>
      </div>

      <div className="grid-3">
        <label>
          Telefone
          <input
            value={form.phone}
            onChange={(e) => setVal('phone', e.target.value)}
            disabled={readOnly}
          />
        </label>
        <label>
          Website
          <input
            value={form.website}
            onChange={(e) => setVal('website', e.target.value)}
            disabled={readOnly}
          />
        </label>
        <label>
          CEP
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={form.zipCode}
              onChange={(e) => setVal('zipCode', e.target.value)}
              disabled={readOnly}
              placeholder="00000-000"
            />
            {!readOnly && (
              <button type="button" onClick={handleLookupCEP}>
                Buscar CEP
              </button>
            )}
          </div>
        </label>
      </div>

      <div className="grid-3">
        <label>
          Logradouro
          <input
            value={form.street}
            onChange={(e) => setVal('street', e.target.value)}
            disabled={readOnly}
          />
        </label>
        <label>
          Número
          <input
            value={form.number}
            onChange={(e) => setVal('number', e.target.value)}
            disabled={readOnly}
          />
        </label>
        <label>
          Complemento
          <input
            value={form.complement}
            onChange={(e) => setVal('complement', e.target.value)}
            disabled={readOnly}
          />
        </label>
      </div>

      <div className="grid-3">
        <label>
          Bairro
          <input
            value={form.district}
            onChange={(e) => setVal('district', e.target.value)}
            disabled={readOnly}
          />
        </label>
        <label>
          Cidade
          <input
            value={form.city}
            onChange={(e) => setVal('city', e.target.value)}
            disabled={readOnly}
          />
        </label>
        <label>
          UF
          <input
            value={form.state}
            onChange={(e) => setVal('state', e.target.value)}
            disabled={readOnly}
          />
        </label>
      </div>

      <input type="hidden" value={form.ibgeCityCode || ''} readOnly />

      {!readOnly && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      )}
    </form>
  );
}
