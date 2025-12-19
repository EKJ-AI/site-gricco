import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../auth/contexts/AuthContext';
import { lookupCEP, lookupCNPJ } from '../api/catalog';
import CnaeMultiInput from '../components/CnaeMultiInput';
import iconPesquisar from '../../../../shared/assets/images/admin/iconPesquisar.svg';
import { useToast, extractErrorMessage } from '../../../../shared/components/toast/ToastProvider';

function onlyDigits(v = '') {
  return String(v).replace(/\D+/g, '');
}

function validateEstablishment(form, cnaes) {
  const missing = [];

  const cnpj = onlyDigits(form.cnpj);
  const cep = onlyDigits(form.zipCode);

  if (!String(form.nickname || '').trim()) missing.push('Apelido');
  if (!cnpj || cnpj.length !== 14) missing.push('CNPJ (14 dígitos)');
  if (!cep || cep.length !== 8) missing.push('CEP (8 dígitos)');
  if (!String(form.street || '').trim()) missing.push('Logradouro');
  if (!String(form.number || '').trim()) missing.push('Número');
  if (!String(form.city || '').trim()) missing.push('Cidade');
  if (!String(form.state || '').trim()) missing.push('UF');
  if (!Array.isArray(cnaes) || cnaes.length === 0) missing.push('Ao menos 1 CNAE');

  return { ok: missing.length === 0, missing };
}

export default function EstablishmentForm({
  initialData = {},
  onSubmit,
  submitting = false,
  readOnly = false,
  onMainCnaeChange,
}) {
  const { accessToken } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    nickname: initialData.nickname || '',
    cnpj: initialData.cnpj || '',
    isHeadquarter: !!initialData.isHeadquarter,
    riskLevel: initialData.riskLevel ?? '',
    street: initialData.street || '',
    number: initialData.number || '',
    complement: initialData.complement || '',
    district: initialData.district || '',
    city: initialData.city || '',
    state: initialData.state || '',
    zipCode: initialData.zipCode || '',
    isActive: typeof initialData.isActive === 'boolean' ? initialData.isActive : true,
  });

  const [cnaes, setCnaes] = useState([]);

  useEffect(() => {
    setForm({
      nickname: initialData.nickname || '',
      cnpj: initialData.cnpj || '',
      isHeadquarter: !!initialData.isHeadquarter,
      riskLevel: initialData.riskLevel ?? '',
      street: initialData.street || '',
      number: initialData.number || '',
      complement: initialData.complement || '',
      district: initialData.district || '',
      city: initialData.city || '',
      state: initialData.state || '',
      zipCode: initialData.zipCode || '',
      isActive: typeof initialData.isActive === 'boolean' ? initialData.isActive : true,
    });

    const mappedCnaes = Array.isArray(initialData.cnaes)
      ? initialData.cnaes
          .map((item) => ({
            code: item.cnae?.code || item.code || '',
            title: item.cnae?.title || item.title || '',
            riskLevel:
              item.riskLevel ??
              item.nrRisk ??
              (item.cnae && item.cnae.nrRisk != null ? item.cnae.nrRisk : null),
          }))
          .filter((c) => c.code)
      : [];

    setCnaes(mappedCnaes);
  }, [initialData?.id]);

  const setVal = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const mainCnae = useMemo(() => {
    if (!cnaes.length) return null;
    const withRisk = cnaes.filter((c) => c.riskLevel != null);
    if (!withRisk.length) return cnaes[0].code;
    const max = Math.max(...withRisk.map((c) => c.riskLevel));
    const candidates = withRisk
      .filter((c) => c.riskLevel === max)
      .sort((a, b) => a.code.localeCompare(b.code));
    return candidates[0]?.code || null;
  }, [cnaes]);

  useEffect(() => {
    if (onMainCnaeChange && mainCnae) onMainCnaeChange(mainCnae);
  }, [mainCnae, onMainCnaeChange]);

  const validation = useMemo(() => validateEstablishment(form, cnaes), [form, cnaes]);
  const canSubmit = !readOnly && validation.ok && !submitting;

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
      }));
      toast.success('Endereço preenchido a partir do CEP.', { title: 'Consulta OK' });
    } catch (e) {
      console.error(e);
      toast.error(extractErrorMessage(e, 'Falha ao buscar CEP. Tente novamente.'), { title: 'Erro na consulta' });
    }
  }

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
        nickname: f.nickname || data.tradeName || data.legalName || '',
        zipCode: f.zipCode || addr.zipCode || addr.cep || '',
        street: f.street || addr.street || '',
        number: f.number || addr.number || '',
        complement: f.complement || addr.complement || '',
        district: f.district || addr.district || '',
        city: f.city || addr.city || '',
        state: f.state || addr.state || '',
      }));

      // CNAEs: main + secondary
      const cnaesFromCnpj = [];
      if (data.mainCnae) cnaesFromCnpj.push({ code: data.mainCnae, title: data.mainCnaeDesc || '', riskLevel: null });

      if (Array.isArray(data.secondaryCnaes)) {
        data.secondaryCnaes.forEach((s) => {
          if (!s?.code) return;
          cnaesFromCnpj.push({ code: s.code, title: s.title || '', riskLevel: null });
        });
      }

      if (cnaesFromCnpj.length) {
        setCnaes((prev) => {
          const byCode = new Map((Array.isArray(prev) ? prev : []).map((c) => [c.code, c]));
          cnaesFromCnpj.forEach((c) => { if (c.code && !byCode.has(c.code)) byCode.set(c.code, c); });
          return Array.from(byCode.values());
        });
      }

      toast.success('Dados preenchidos a partir do CNPJ.', { title: 'Consulta OK' });
    } catch (e) {
      console.error(e);
      toast.error(extractErrorMessage(e, 'Falha ao buscar CNPJ. Tente novamente.'), { title: 'Erro na consulta' });
    }
  }

  function handleSubmit(e) {
    e.preventDefault();

    const v = validateEstablishment(form, cnaes);
    if (!v.ok) {
      const preview = v.missing.slice(0, 4).join(', ');
      const tail = v.missing.length > 4 ? `… (+${v.missing.length - 4})` : '';
      toast.warning(`Preencha os campos obrigatórios: ${preview}${tail}`, { title: 'Campos obrigatórios' });
      return;
    }

    const payload = {
      ...form,
      cnaes,
      mainCnae: mainCnae || null,
      riskLevel:
        cnaes.length && cnaes.some((c) => c.riskLevel != null)
          ? Math.max(...cnaes.filter((c) => c.riskLevel != null).map((c) => c.riskLevel))
          : form.riskLevel || null,
    };

    onSubmit?.(payload);
  }

  return (
    <form className="pf-form" onSubmit={handleSubmit}>
      {/* Card 1: Identificação */}
      <section className="pf-section">
        <div className="grid-3">
          <label>
            Apelido *
            <input value={form.nickname} onChange={(e) => setVal('nickname', e.target.value)} disabled={readOnly} />
          </label>

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

          <label style={{ marginBottom: 0 }}>
            Matriz?
            <div style={{ marginTop: 10 }}>
              <input
                type="checkbox"
                className="pf-switch"
                checked={!!form.isHeadquarter}
                onChange={(e) => setVal('isHeadquarter', e.target.checked)}
                disabled={readOnly}
                aria-label="Matriz"
              />
            </div>
          </label>
        </div>

        <div className="pf-switch-row" style={{ marginTop: 10 }}>
          <p className="pf-switch-label">Estabelecimento ativo</p>
          <input
            type="checkbox"
            className="pf-switch"
            checked={!!form.isActive}
            onChange={(e) => setVal('isActive', e.target.checked)}
            disabled={readOnly}
            aria-label="Estabelecimento ativo"
          />
        </div>
      </section>

      {/* Card 2: CNAEs */}
      <section className="pf-section">
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <CnaeMultiInput value={cnaes} onChange={setCnaes} disabled={readOnly} />
        </div>

        <div style={{ marginTop: 10, fontSize: 13 }}>
          <b style={{ color: '#0e1b4d' }}>CNAE principal:</b>{' '}
          {mainCnae ? <span style={{ fontWeight: 800 }}>{mainCnae}</span> : <span style={{ color: '#6b7280' }}>nenhum selecionado</span>}
        </div>
      </section>

      {/* Card 3: Endereço */}
      <section className="pf-section">
        <div className="grid-3">
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

          <label>
            Cidade *
            <input value={form.city} onChange={(e) => setVal('city', e.target.value)} disabled={readOnly} />
          </label>

          <label>
            UF *
            <input value={form.state} onChange={(e) => setVal('state', e.target.value)} disabled={readOnly} />
          </label>
        </div>

        <div className="grid-3" style={{ marginTop: 10 }}>
          <label>
            Logradouro *
            <input value={form.street} onChange={(e) => setVal('street', e.target.value)} disabled={readOnly} />
          </label>

          <label>
            Número *
            <input value={form.number} onChange={(e) => setVal('number', e.target.value)} disabled={readOnly} />
          </label>

          <label>
            Complemento
            <input value={form.complement} onChange={(e) => setVal('complement', e.target.value)} disabled={readOnly} />
          </label>
        </div>

        <div className="grid-2" style={{ marginTop: 10 }}>
          <label>
            Bairro
            <input value={form.district} onChange={(e) => setVal('district', e.target.value)} disabled={readOnly} />
          </label>
          <div />
        </div>
      </section>

      {!readOnly && (
        <div className="pf-actions">
          <button type="button" className="pf-btn pf-btn-secondary" onClick={() => navigate(-1)} disabled={submitting}>
            Cancelar
          </button>

          <button type="submit" className="pf-btn pf-btn-primary" disabled={!canSubmit}>
            {submitting ? 'Salvando…' : 'Salvar cadastro'}
          </button>
        </div>
      )}
    </form>
  );
}
