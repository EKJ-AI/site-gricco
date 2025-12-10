import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../auth/contexts/AuthContext';
import { lookupCEP, lookupCNPJ } from '../api/catalog';
import CnaeMultiInput from '../components/CnaeMultiInput';
import "../styles/EstablishmentForm.css";

function onlyDigits(v = '') {
  return String(v).replace(/\D+/g, '');
}

/**
 * Props:
 *  - initialData: {
 *      id, companyId,
 *      nickname, cnpj, isHeadquarter, isActive, riskLevel,
 *      street, number, complement, district, city, state, zipCode,
 *      cnaes: [{ cnae: { code, title, nrRisk? }, riskLevel? }]
 *    }
 *  - onSubmit(payload)
 *  - submitting, readOnly
 *  - onMainCnaeChange?(code)
 */
export default function EstablishmentForm({
  initialData = {},
  onSubmit,
  submitting = false,
  readOnly = false,
  onMainCnaeChange,
}) {
  const { accessToken } = useAuth();
  const navigate = useNavigate();

  console.log('initialData: ', initialData);

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
    isActive:
      typeof initialData.isActive === 'boolean'
        ? initialData.isActive
        : true,
  });

  const [cnaes, setCnaes] = useState([]);

  // quando initialData mudar (edição), sincroniza estado interno
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
      isActive:
        typeof initialData.isActive === 'boolean'
          ? initialData.isActive
          : true,
    });

    const mappedCnaes = Array.isArray(initialData.cnaes)
      ? initialData.cnaes
          .map((item) => ({
            code: item.cnae?.code || item.code || '',
            title: item.cnae?.title || item.title || '',
            riskLevel:
              item.riskLevel ??
              item.nrRisk ??
              (item.cnae && item.cnae.nrRisk != null
                ? item.cnae.nrRisk
                : null),
          }))
          .filter((c) => c.code)
      : [];

    setCnaes(mappedCnaes);
  }, [initialData?.id]); // muda quando carregamos um estabelecimento diferente

  const setVal = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // calcula principal: maior risco; empate → menor código
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

  // notifica pai (se quiser ouvir o CNAE principal)
  useEffect(() => {
    if (onMainCnaeChange && mainCnae) onMainCnaeChange(mainCnae);
  }, [mainCnae, onMainCnaeChange]);

  async function handleLookupCEP() {
    const cep = String(form.zipCode || '').replace(/\D+/g, '');
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
      }));
    } catch (e) {
      console.error(e);
      alert('Falha ao buscar CEP. Tente novamente.');
    }
  }

  async function handleLookupCNPJ() {
    const cnpj = onlyDigits(form.cnpj);
    if (!cnpj || cnpj.length < 14) {
      alert('Informe um CNPJ válido (14 dígitos).');
      return;
    }

    try {
      const data = await lookupCNPJ(cnpj, accessToken);
      if (!data) return;

      const addr = data.address || data;

      // Preenche apenas os campos usados no cadastro do estabelecimento
      setForm((f) => ({
        ...f,
        cnpj: data.cnpj || f.cnpj,
        nickname:
          f.nickname ||
          data.tradeName ||
          data.legalName ||
          f.nickname ||
          '',
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

      if (data.mainCnae) {
        cnaesFromCnpj.push({
          code: data.mainCnae,
          title: data.mainCnaeDesc || '',
          riskLevel: null,
        });
      }

      if (Array.isArray(data.secondaryCnaes)) {
        data.secondaryCnaes.forEach((s) => {
          if (!s || !s.code) return;
          cnaesFromCnpj.push({
            code: s.code,
            title: s.title || '',
            riskLevel: null,
          });
        });
      }

      if (cnaesFromCnpj.length) {
        setCnaes((prev) => {
          const byCode = new Map(
            (Array.isArray(prev) ? prev : []).map((c) => [c.code, c]),
          );

          cnaesFromCnpj.forEach((c) => {
            if (!c.code) return;
            if (!byCode.has(c.code)) {
              byCode.set(c.code, c);
            }
          });

          return Array.from(byCode.values());
        });
      }
    } catch (e) {
      console.error(e);
      alert('Falha ao buscar CNPJ. Tente novamente.');
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      ...form,
      cnaes,
      mainCnae: mainCnae || null,
      riskLevel:
        cnaes.length && cnaes.some((c) => c.riskLevel != null)
          ? Math.max(
              ...cnaes
                .filter((c) => c.riskLevel != null)
                .map((c) => c.riskLevel),
            )
          : form.riskLevel || null,
    };
    onSubmit?.(payload);
  }

  return (
    <form className="form formEstab" onSubmit={handleSubmit}>
      <div className="grid-3">
        <label>
          Apelido
          <input
            value={form.nickname}
            onChange={(e) => setVal('nickname', e.target.value)}
            disabled={readOnly}
          />
        </label>
        <br />
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
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            checked={!!form.isHeadquarter}
            onChange={(e) => setVal('isHeadquarter', e.target.checked)}
            disabled={readOnly}
          />
          Matriz?
        </label>
      </div>

      {/* Status do estabelecimento */}
      <div style={{ marginTop: 8, marginBottom: 8 }}>
        <label
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
        >
          <input
            type="checkbox"
            checked={!!form.isActive}
            onChange={(e) => setVal('isActive', e.target.checked)}
            disabled={readOnly}
          />
          Estabelecimento ativo
        </label>
      </div>

      {/* Wrapper para não cortar horizontalmente a tabela de CNAEs */}
      <div style={{ width: '100%', overflowX: 'auto' }}>
        <CnaeMultiInput
          value={cnaes}
          onChange={setCnaes}
          disabled={readOnly}
        />
      </div>

      <div className="card" style={{ padding: 12, marginTop: 8 }}>
        <b>CNAE principal: </b>
        {mainCnae ? (
          <span className="badge">{mainCnae}</span>
        ) : (
          <span style={{ color: '#666' }}>nenhum selecionado</span>
        )}
      </div>

      <div className="grid-3" style={{ marginTop: 12 }}>
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
        <br />
        <label>
          Cidade
          <input
            value={form.city}
            onChange={(e) => setVal('city', e.target.value)}
            disabled={readOnly}
          />
        </label>
        <br />
        <label>
          UF
          <input
            value={form.state}
            onChange={(e) => setVal('state', e.target.value)}
            disabled={readOnly}
          />
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
        <br />
        <label>
          Número
          <input
            value={form.number}
            onChange={(e) => setVal('number', e.target.value)}
            disabled={readOnly}
          />
        </label>
        <br />
        <label>
          Complemento
          <input
            value={form.complement}
            onChange={(e) => setVal('complement', e.target.value)}
            disabled={readOnly}
          />
        </label>
      </div>

      {!readOnly && (
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button type="submit" disabled={submitting}>
            {submitting ? 'Salvando…' : 'Salvar'}
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => navigate(-1)}
            disabled={submitting}
          >
            Cancelar
          </button>
        </div>
      )}
    </form>
  );
}
