import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../auth/contexts/AuthContext';
import { lookupCEP } from '../api/catalog';
import CnaeMultiInput from '../components/CnaeMultiInput';

/**
 * Props:
 *  - initialData: {
 *      id, companyId,
 *      nickname, cnpj, isHeadquarter, riskLevel,
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

  console.log("initialData: ", initialData);

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
                .map((c) => c.riskLevel)
            )
          : form.riskLevel || null,
    };
    onSubmit?.(payload);
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <div className="grid-3">
        <label>
          Apelido
          <input
            value={form.nickname}
            onChange={(e) => setVal('nickname', e.target.value)}
            disabled={readOnly}
          />
        </label>
        <label>
          CNPJ
          <input
            value={form.cnpj}
            onChange={(e) => setVal('cnpj', e.target.value)}
            disabled={readOnly}
            placeholder="00.000.000/0000-00"
          />
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

      <CnaeMultiInput value={cnaes} onChange={setCnaes} disabled={readOnly} />

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

      {!readOnly && (
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button type="submit" disabled={submitting}>
            Salvar
          </button>
        </div>
      )}
    </form>
  );
}
