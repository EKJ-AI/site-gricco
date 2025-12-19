// src/modules/admin/companies/pages/EmployeeForm.jsx
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  createEmployee,
  getEmployee,
  updateEmployee,
  getEmployeeInEstablishment,
  updateEmployeeInEstablishment,
} from '../api/employees';
import { getEstablishment } from '../api/establishments';
import { useAuth } from '../../../auth/contexts/AuthContext';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import AutocompleteSelect from '../components/AutocompleteSelect.jsx';
import { searchCBO, lookupCEP } from '../api/catalog';
import api from '../../../../api/axios';
import usePermission from '../../../auth/hooks/usePermission';
import { listDepartmentsInEstablishment } from '../api/departments';

import iconPesquisar from '../../../../shared/assets/images/admin/iconPesquisar.svg';
import { useToast, extractErrorMessage } from '../../../../shared/components/toast/ToastProvider';
import ModalBase from '../../../../shared/components/modals/ModalBase';

function onlyDigits(v = '') {
  return String(v).replace(/\D+/g, '');
}

function isEmailLike(v = '') {
  const s = String(v || '').trim();
  if (!s) return false;
  return s.includes('@') && s.includes('.') && s.length >= 6;
}

function validateEmployee({ form, mode, selectedPortalProfile }) {
  const missing = [];

  const cpf = onlyDigits(form.cpf);
  if (!cpf || cpf.length !== 11) missing.push('CPF (11 dígitos)');
  if (!String(form.name || '').trim()) missing.push('Nome');

  if (form.portalAccessEnabled) {
    if (!isEmailLike(form.email)) missing.push('E-mail válido (portal)');
    if (!selectedPortalProfile?.id) missing.push('Perfil do portal');

    const pwd = String(form.portalPassword || '');
    const pwd2 = String(form.portalPasswordConfirm || '');

    const wantsPassword = mode === 'create' || pwd.length > 0 || pwd2.length > 0;

    if (wantsPassword) {
      if (pwd.length < 8) missing.push('Senha do portal (mín. 8)');
      if (pwd !== pwd2) missing.push('Confirmação da senha (igual)');
    }
  }

  return { ok: missing.length === 0, missing };
}

export default function EmployeeForm({ mode = 'create' }) {
  const { accessToken } = useAuth();
  const toast = useToast();

  const navigate = useNavigate();
  const { companyId, establishmentId, employeeId } = useParams();
  const { pathname } = useLocation();

  const scope = pathname.includes('/establishments/') ? 'establishment' : 'company';

  // permissões
  const canCreate = usePermission('employee.create');
  const canUpdate = usePermission('employee.update');
  const canWrite = mode === 'edit' ? canUpdate : canCreate;

  const [form, setForm] = useState({
    cpf: '',
    name: '',
    jobTitle: '',
    email: '',
    phone: '',
    nationality: '',
    language: '',
    // endereço
    street: '',
    number: '',
    complement: '',
    district: '',
    city: '',
    state: '',
    zipCode: '',
    ibgeCityCode: '',
    // acesso portal
    portalAccessEnabled: false,
    portalPassword: '',
    portalPasswordConfirm: '',
    // status
    isActive: true,
  });

  const [selectedCbo, setSelectedCbo] = useState(null);
  const [selectedPortalProfile, setSelectedPortalProfile] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(null);

  const [resolvedCompanyId, setResolvedCompanyId] = useState(companyId || null);
  const [loadingCompany, setLoadingCompany] = useState(false);
  const [loadingEmployee, setLoadingEmployee] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Modal de CBOs
  const [cboModalOpen, setCboModalOpen] = useState(false);
  const [cboModalItems, setCboModalItems] = useState([]);
  const [cboModalLoading, setCboModalLoading] = useState(false);

  // Modal de Departamentos
  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [deptModalItems, setDeptModalItems] = useState([]);
  const [deptModalLoading, setDeptModalLoading] = useState(false);

  // Modal de Profiles (Portal)
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileModalItems, setProfileModalItems] = useState([]);
  const [profileModalLoading, setProfileModalLoading] = useState(false);

  const noPermToastRef = useRef(false);

  const setFormVal = (key, value) =>
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));

  // aviso de permissão (toast-only, uma vez)
  useEffect(() => {
    if (!noPermToastRef.current && !canWrite) {
      noPermToastRef.current = true;
      toast.warning(
        `Você não tem permissão para ${mode === 'edit' ? 'atualizar' : 'criar'} colaboradores.`,
        { title: 'Permissão' }
      );
    }
  }, [canWrite, mode, toast]);

  // aplicar seleção de CBO
  const applyCboSelection = useCallback((item) => {
    const cbo = item || null;
    setSelectedCbo(cbo);

    if (cbo) {
      setForm((prev) => ({
        ...prev,
        jobTitle: prev.jobTitle?.trim() ? prev.jobTitle : (cbo.title || prev.jobTitle),
      }));
    }
  }, []);

  // aplicar seleção de Departamento
  const applyDepartmentSelection = useCallback((item) => {
    const dept = item || null;
    setSelectedDepartment(dept);
  }, []);

  // Fetch CBO (autocomplete)
  const fetchCboOptions = useCallback(
    async (query) => {
      if (!accessToken) return { items: [], total: 0 };
      const res = await searchCBO(query, 1, 20, accessToken);
      return { items: res.items || [], total: res.total || 0 };
    },
    [accessToken]
  );

  // Fetch Departments (autocomplete) — somente ativos
  const fetchDepartmentOptions = useCallback(
    async (query) => {
      if (!accessToken) return { items: [], total: 0 };

      const finalCompanyId = companyId || resolvedCompanyId;
      if (!finalCompanyId || !establishmentId) return { items: [], total: 0 };

      const res = await listDepartmentsInEstablishment(
        finalCompanyId,
        establishmentId,
        { page: 1, pageSize: 50, q: query || '', status: 'active' },
        accessToken
      );

      const rawItems = res?.items || [];
      const items = rawItems.filter((d) => d?.isActive !== false);

      return { items, total: res?.total ?? items.length ?? 0 };
    },
    [accessToken, companyId, resolvedCompanyId, establishmentId]
  );

  // Fetch Profiles (portal)
  const fetchPortalProfiles = useCallback(
    async (query) => {
      if (!accessToken) return { items: [], total: 0 };
      const res = await api.get('/api/profiles', {
        params: { q: query || '', page: 1, pageSize: 50 },
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = res.data?.data || res.data || {};
      const items = data.items || data || [];
      return { items, total: items.length };
    },
    [accessToken]
  );

  // Carrega dados no modo edição
  useEffect(() => {
    if (mode !== 'edit' || !employeeId || !accessToken) return;

    const load = async () => {
      try {
        setLoadingEmployee(true);

        let d;
        if (companyId && establishmentId) {
          d = await getEmployeeInEstablishment(companyId, establishmentId, employeeId, accessToken);
        } else {
          d = await getEmployee(employeeId, accessToken);
        }
        if (!d) return;

        setForm((prev) => ({
          ...prev,
          cpf: d.cpf || '',
          name: d.name || '',
          jobTitle: d.jobTitle || '',
          email: d.email || '',
          phone: d.phone || '',
          nationality: d.nationality || '',
          language: d.preferredLanguage || d.language || '',
          street: d.street || '',
          number: d.number || '',
          complement: d.complement || '',
          district: d.district || '',
          city: d.city || '',
          state: d.state || '',
          zipCode: d.zipCode || '',
          ibgeCityCode: d.ibgeCityCode || '',
          portalAccessEnabled: !!d.portalUserId,
          portalPassword: '',
          portalPasswordConfirm: '',
          isActive: typeof d.isActive === 'boolean' ? d.isActive : true,
        }));

        if (d.cbo) setSelectedCbo(d.cbo);
        if (d.portalUser?.profile) setSelectedPortalProfile(d.portalUser.profile);
        if (d.department) setSelectedDepartment(d.department);
      } catch (err) {
        console.error(err);
        toast.error(extractErrorMessage(err, 'Falha ao carregar colaborador.'), { title: 'Falha ao carregar' });
      } finally {
        setLoadingEmployee(false);
      }
    };

    load();
  }, [mode, employeeId, companyId, establishmentId, accessToken, toast]);

  // Resolve companyId quando criando via establishment (sem companyId na rota)
  useEffect(() => {
    if (mode !== 'create') return;

    if (companyId) {
      setResolvedCompanyId(companyId);
      return;
    }

    if (scope === 'establishment' && establishmentId && accessToken) {
      setLoadingCompany(true);
      getEstablishment(establishmentId, accessToken)
        .then((est) => setResolvedCompanyId(est?.companyId || null))
        .catch((e) => {
          toast.error(extractErrorMessage(e, 'Falha ao resolver empresa do estabelecimento.'), { title: 'Erro' });
        })
        .finally(() => setLoadingCompany(false));
    }
  }, [mode, scope, companyId, establishmentId, accessToken, toast]);

  // Modal CBOs
  const openCboModal = useCallback(async () => {
    setCboModalOpen(true);

    if (!accessToken) {
      toast.warning('Sessão expirada. Faça login novamente.', { title: 'Sessão' });
      setCboModalItems([]);
      return;
    }

    setCboModalLoading(true);
    try {
      const res = await searchCBO('', 1, 500, accessToken);
      const data = res || {};
      setCboModalItems(data.items || data || []);
    } catch (e) {
      console.error('Failed to load CBOs for modal', e);
      toast.error(extractErrorMessage(e, 'Falha ao carregar CBOs.'), { title: 'Erro' });
      setCboModalItems([]);
    } finally {
      setCboModalLoading(false);
    }
  }, [accessToken, toast]);

  // Modal Departamentos (somente ativos)
  const openDeptModal = useCallback(async () => {
    setDeptModalOpen(true);

    const finalCompanyId = companyId || resolvedCompanyId;
    if (!accessToken || !finalCompanyId || !establishmentId) {
      toast.warning('Seleção de departamentos indisponível (faltam dados de empresa/estabelecimento).', { title: 'Atenção' });
      setDeptModalItems([]);
      return;
    }

    setDeptModalLoading(true);
    try {
      const res = await listDepartmentsInEstablishment(
        finalCompanyId,
        establishmentId,
        { page: 1, pageSize: 500, q: '', status: 'active' },
        accessToken
      );
      const data = res || {};
      const rawItems = data.items || data || [];
      setDeptModalItems(rawItems.filter((d) => d?.isActive !== false));
    } catch (e) {
      console.error('Failed to load departments for modal', e);
      toast.error(extractErrorMessage(e, 'Falha ao carregar departamentos.'), { title: 'Erro' });
      setDeptModalItems([]);
    } finally {
      setDeptModalLoading(false);
    }
  }, [accessToken, companyId, resolvedCompanyId, establishmentId, toast]);

  // Modal Profiles
  const openProfileModal = useCallback(async () => {
    setProfileModalOpen(true);

    if (!accessToken) {
      toast.warning('Sessão expirada. Faça login novamente.', { title: 'Sessão' });
      setProfileModalItems([]);
      return;
    }

    setProfileModalLoading(true);
    try {
      const res = await api.get('/api/profiles', {
        params: { q: '', page: 1, pageSize: 500 },
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const data = res.data?.data || res.data || {};
      const items = data.items || data || [];
      setProfileModalItems(items);
    } catch (e) {
      console.error('Failed to load profiles for modal', e);
      toast.error(extractErrorMessage(e, 'Falha ao carregar perfis.'), { title: 'Erro' });
      setProfileModalItems([]);
    } finally {
      setProfileModalLoading(false);
    }
  }, [accessToken, toast]);

  // Lookup CEP (toast-only)
  const handleLookupCEP = useCallback(async () => {
    const cep = onlyDigits(form.zipCode);
    if (!cep || cep.length !== 8) {
      toast.warning('Informe um CEP válido (8 dígitos).', { title: 'CEP inválido' });
      return;
    }

    try {
      const data = await lookupCEP(cep, accessToken);
      if (!data) {
        toast.warning('Não foi possível localizar o CEP informado.', { title: 'Sem retorno' });
        return;
      }
      setForm((prev) => ({
        ...prev,
        zipCode: data.cep ?? prev.zipCode,
        street: data.street ?? prev.street,
        district: data.district ?? prev.district,
        city: data.city ?? prev.city,
        state: data.state ?? prev.state,
        ibgeCityCode: data.ibgeCityCode ?? prev.ibgeCityCode,
      }));
      toast.success('Endereço preenchido a partir do CEP.', { title: 'Consulta OK' });
    } catch (e) {
      console.error(e);
      toast.error(extractErrorMessage(e, 'Falha ao buscar CEP. Tente novamente.'), { title: 'Erro na consulta' });
    }
  }, [form.zipCode, accessToken, toast]);

  // Validação obrigatória
  const validation = useMemo(
    () => validateEmployee({ form, mode, selectedPortalProfile }),
    [form, mode, selectedPortalProfile]
  );

  const finalCompanyId = companyId || resolvedCompanyId;
  const canUseDepartment = !!establishmentId;

  const isSavingDisabledBase =
    submitting ||
    loadingEmployee ||
    (mode === 'create' && scope === 'establishment' && !companyId && (loadingCompany || !resolvedCompanyId));

  const permDisabled = !canWrite;
  const isSavingDisabled = isSavingDisabledBase || permDisabled || !validation.ok;

  const submit = async (e) => {
    e.preventDefault();

    // obrigatório
    if (!validation.ok) {
      const preview = validation.missing.slice(0, 4).join(', ');
      const tail = validation.missing.length > 4 ? `… (+${validation.missing.length - 4})` : '';
      toast.warning(`Preencha os campos obrigatórios: ${preview}${tail}`, { title: 'Campos obrigatórios' });
      return;
    }

    // permissão
    if (!canWrite) {
      toast.warning(
        `Você não tem permissão para ${mode === 'edit' ? 'atualizar' : 'criar'} colaboradores.`,
        { title: 'Permissão' }
      );
      return;
    }

    // create: precisa company/establishment
    if (mode === 'create') {
      if (!finalCompanyId || !establishmentId) {
        toast.error('Faltam dados de empresa/estabelecimento para criar o colaborador.', { title: 'Erro' });
        return;
      }
    }

    try {
      setSubmitting(true);

      const cpfDigits = onlyDigits(form.cpf);
      const zipDigits = onlyDigits(form.zipCode);

      const pwd = String(form.portalPassword || '');
      const pwd2 = String(form.portalPasswordConfirm || '');
      const wantsPassword = form.portalAccessEnabled && (mode === 'create' || pwd.length > 0 || pwd2.length > 0);

      const payload = {
        cpf: cpfDigits,
        name: String(form.name || '').trim(),
        jobTitle: String(form.jobTitle || '').trim() || null,
        email: String(form.email || '').trim() || null,
        phone: String(form.phone || '').trim() || null,
        nationality: String(form.nationality || '').trim() || null,
        language: String(form.language || '').trim() || null,
        cboId: selectedCbo?.id || null,
        departmentId: canUseDepartment ? (selectedDepartment?.id || null) : null,

        street: String(form.street || '').trim() || null,
        number: String(form.number || '').trim() || null,
        complement: String(form.complement || '').trim() || null,
        district: String(form.district || '').trim() || null,
        city: String(form.city || '').trim() || null,
        state: String(form.state || '').trim() || null,
        zipCode: zipDigits || null,
        ibgeCityCode: String(form.ibgeCityCode || '').trim() || null,

        portalAccessEnabled: !!form.portalAccessEnabled,
        portalProfileId: form.portalAccessEnabled ? (selectedPortalProfile?.id || null) : null,
        portalPassword: form.portalAccessEnabled
          ? (wantsPassword ? pwd : null)
          : null,

        isActive: !!form.isActive,
      };

      if (mode === 'edit') {
        if (companyId && establishmentId) {
          await updateEmployeeInEstablishment(companyId, establishmentId, employeeId, payload, accessToken);
        } else {
          await updateEmployee(employeeId, payload, accessToken);
        }
      } else {
        await createEmployee(
          {
            ...payload,
            companyId: finalCompanyId,
            establishmentId,
          },
          accessToken
        );
      }

      toast.success('Colaborador salvo com sucesso.', { title: 'Salvo' });

      if (scope === 'company') {
        navigate(`/companies/${finalCompanyId}/employees`);
      } else {
        navigate(`/companies/${finalCompanyId}/establishments/${establishmentId}/employees`);
      }
    } catch (e2) {
      toast.error(extractErrorMessage(e2, 'Falha ao salvar.'), { title: 'Não foi possível salvar' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pf-page">
      <div className="pf-shell">
        <div className="pf-header">
          <div className="pf-header-left">
            <div className="pf-header-icon" aria-hidden="true">👤</div>
            <div>
              <h2 className="pf-title">{mode === 'edit' ? 'Editar Colaborador' : 'Novo Colaborador'}</h2>
              <p className="pf-subtitle">
                {mode === 'edit'
                  ? 'Atualize os dados do colaborador.'
                  : 'Cadastre o colaborador e, se necessário, habilite acesso ao portal.'}
              </p>
            </div>
          </div>

          <button type="button" className="pf-close" onClick={() => navigate(-1)} aria-label="Fechar">
            ✕
          </button>
        </div>

        {loadingCompany && mode === 'create' && scope === 'establishment' ? (
          <section className="pf-section">Resolvendo empresa do estabelecimento…</section>
        ) : null}

        {loadingEmployee ? (
          <section className="pf-section">Carregando colaborador…</section>
        ) : (
          <form className="pf-form" onSubmit={submit}>
            {/* Card 1: Identificação */}
            <section className="pf-section">
              <div className="grid-2">
                <label>
                  CPF *
                  <input
                    placeholder="000.000.000-00"
                    value={form.cpf}
                    onChange={(e) => setFormVal('cpf', e.target.value)}
                    disabled={submitting || !canWrite}
                  />
                </label>

                <label>
                  Nome *
                  <input
                    placeholder="Nome completo"
                    value={form.name}
                    onChange={(e) => setFormVal('name', e.target.value)}
                    disabled={submitting || !canWrite}
                  />
                </label>
              </div>

              <div className="grid-2" style={{ marginTop: 10 }}>
                <label>
                  Função / Cargo
                  <input
                    placeholder="Ex.: Técnico de Segurança"
                    value={form.jobTitle}
                    onChange={(e) => setFormVal('jobTitle', e.target.value)}
                    disabled={submitting || !canWrite}
                  />
                </label>

                <div>
                  <AutocompleteSelect
                    label="CBO"
                    value={selectedCbo}
                    onChange={(item) => applyCboSelection(item)}
                    fetcher={fetchCboOptions}
                    getKey={(it) => it.id}
                    getLabel={(it) => `${it.code} - ${it.title}`}
                    placeholder="Buscar CBO por código ou título…"
                    minChars={0}
                    disabled={!accessToken || submitting || !canWrite}
                  />

                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="pf-btn pf-btn-secondary"
                      style={{ height: 34 }}
                      onClick={openCboModal}
                      disabled={submitting}
                    >
                      Ver todos
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Card 2: Departamento */}
            <section className="pf-section">
              <div className="grid-2">
                <div>
                  <AutocompleteSelect
                    label="Departamento / Setor"
                    value={selectedDepartment}
                    onChange={(item) => applyDepartmentSelection(item)}
                    fetcher={fetchDepartmentOptions}
                    getKey={(it) => it.id}
                    getLabel={(it) => it.name}
                    placeholder={
                      canUseDepartment
                        ? 'Buscar departamentos deste estabelecimento…'
                        : 'Disponível somente no escopo de estabelecimento'
                    }
                    minChars={0}
                    disabled={!accessToken || submitting || !canWrite || !canUseDepartment}
                  />

                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="pf-btn pf-btn-secondary"
                      style={{ height: 34 }}
                      onClick={openDeptModal}
                      disabled={submitting || !canUseDepartment}
                    >
                      Ver todos
                    </button>
                  </div>
                </div>

                <div />
              </div>
            </section>

            {/* Card 3: Contato */}
            <section className="pf-section">
              <div className="grid-2">
                <label>
                  E-mail
                  <input
                    placeholder="exemplo@empresa.com"
                    value={form.email}
                    onChange={(e) => setFormVal('email', e.target.value)}
                    disabled={submitting || !canWrite}
                  />
                </label>

                <label>
                  Telefone
                  <input
                    placeholder="+55 (xx) x xxxx-xxxx"
                    value={form.phone}
                    onChange={(e) => setFormVal('phone', e.target.value)}
                    disabled={submitting || !canWrite}
                  />
                </label>
              </div>

              <div className="grid-2" style={{ marginTop: 10 }}>
                <label>
                  Nacionalidade
                  <input
                    placeholder="Opcional"
                    value={form.nationality}
                    onChange={(e) => setFormVal('nationality', e.target.value)}
                    disabled={submitting || !canWrite}
                  />
                </label>

                <label>
                  Idioma
                  <input
                    placeholder="pt-BR"
                    value={form.language}
                    onChange={(e) => setFormVal('language', e.target.value)}
                    disabled={submitting || !canWrite}
                  />
                </label>
              </div>
            </section>

            {/* Card 4: Endereço */}
            <section className="pf-section">
              <div className="grid-3">
                <label>
                  CEP
                  <div className="pf-input-group">
                    <input
                      placeholder="00000-000"
                      value={form.zipCode}
                      onChange={(e) => setFormVal('zipCode', e.target.value)}
                      disabled={submitting || !canWrite}
                    />
                    <button
                      type="button"
                      className="pf-icon-btn"
                      onClick={handleLookupCEP}
                      aria-label="Buscar CEP"
                      title="Buscar CEP"
                      disabled={submitting || !canWrite}
                    >
                      <img src={iconPesquisar} alt="Buscar CEP" />
                    </button>
                  </div>
                </label>

                <label>
                  Logradouro
                  <input
                    placeholder="Rua / Avenida"
                    value={form.street}
                    onChange={(e) => setFormVal('street', e.target.value)}
                    disabled={submitting || !canWrite}
                  />
                </label>

                <label className="pf-input-sm">
                  Número
                  <input
                    placeholder="000"
                    value={form.number}
                    onChange={(e) => setFormVal('number', e.target.value)}
                    disabled={submitting || !canWrite}
                  />
                </label>
              </div>

              <div className="grid-3" style={{ marginTop: 10 }}>
                <label>
                  Complemento
                  <input
                    placeholder="Apto, bloco, sala..."
                    value={form.complement}
                    onChange={(e) => setFormVal('complement', e.target.value)}
                    disabled={submitting || !canWrite}
                  />
                </label>

                <label>
                  Bairro
                  <input
                    placeholder="Bairro"
                    value={form.district}
                    onChange={(e) => setFormVal('district', e.target.value)}
                    disabled={submitting || !canWrite}
                  />
                </label>

                <label>
                  Cidade
                  <input
                    placeholder="Cidade"
                    value={form.city}
                    onChange={(e) => setFormVal('city', e.target.value)}
                    disabled={submitting || !canWrite}
                  />
                </label>
              </div>

              <div className="grid-2" style={{ marginTop: 10 }}>
                <label className="pf-input-sm">
                  UF
                  <input
                    placeholder="UF"
                    value={form.state}
                    onChange={(e) => setFormVal('state', e.target.value)}
                    disabled={submitting || !canWrite}
                  />
                </label>

                <div />
              </div>

              <input type="hidden" value={form.ibgeCityCode || ''} readOnly />
            </section>

            {/* Card 5: Portal */}
            <section className="pf-section">
              <div className="pf-switch-row">
                <p className="pf-switch-label">Habilitar acesso ao portal</p>
                <input
                  type="checkbox"
                  className="pf-switch"
                  checked={!!form.portalAccessEnabled}
                  onChange={(e) => setFormVal('portalAccessEnabled', e.target.checked)}
                  disabled={submitting || !canWrite}
                  aria-label="Habilitar acesso ao portal"
                />
              </div>

              {form.portalAccessEnabled && (
                <>
                  <div className="grid-2" style={{ marginTop: 10 }}>
                    <div>
                      <AutocompleteSelect
                        label="Perfil do portal *"
                        value={selectedPortalProfile}
                        onChange={(item) => setSelectedPortalProfile(item || null)}
                        fetcher={fetchPortalProfiles}
                        getKey={(it) => it.id}
                        getLabel={(it) => it.name}
                        placeholder="Selecione um perfil…"
                        minChars={0}
                        disabled={!accessToken || submitting || !canWrite}
                      />

                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="pf-btn pf-btn-secondary"
                          style={{ height: 34 }}
                          onClick={openProfileModal}
                          disabled={submitting}
                        >
                          Ver todos
                        </button>
                      </div>
                    </div>

                    <div />
                  </div>

                  <div className="grid-2" style={{ marginTop: 10 }}>
                    <label>
                      Senha do portal {mode === 'create' ? '*' : '(opcional)'}
                      <input
                        type="password"
                        value={form.portalPassword}
                        onChange={(e) => setFormVal('portalPassword', e.target.value)}
                        disabled={submitting || !canWrite}
                        placeholder={mode === 'create' ? 'mín. 8 caracteres' : 'deixe em branco para manter'}
                      />
                    </label>

                    <label>
                      Confirmar senha {mode === 'create' ? '*' : '(opcional)'}
                      <input
                        type="password"
                        value={form.portalPasswordConfirm}
                        onChange={(e) => setFormVal('portalPasswordConfirm', e.target.value)}
                        disabled={submitting || !canWrite}
                        placeholder={mode === 'create' ? 'repita a senha' : 'repita para alterar'}
                      />
                    </label>
                  </div>

                  <div style={{ marginTop: 10, fontSize: 13, color: '#6b7280' }}>
                    Se o colaborador já possui acesso ao portal, deixe as senhas em branco para manter a senha atual
                    (ou preencha para redefinir).
                  </div>
                </>
              )}
            </section>

            {/* Card 6: Status */}
            <section className="pf-section">
              <div className="pf-switch-row">
                <p className="pf-switch-label">Colaborador ativo</p>
                <input
                  type="checkbox"
                  className="pf-switch"
                  checked={!!form.isActive}
                  onChange={(e) => setFormVal('isActive', e.target.checked)}
                  disabled={submitting || !canWrite}
                  aria-label="Colaborador ativo"
                />
              </div>
            </section>

            {/* Ações */}
            <div className="pf-actions">
              <button
                type="button"
                className="pf-btn pf-btn-secondary"
                onClick={() => navigate(-1)}
                disabled={submitting}
              >
                Cancelar
              </button>

              <button type="submit" className="pf-btn pf-btn-primary" disabled={isSavingDisabled}>
                {submitting ? 'Salvando…' : 'Salvar cadastro'}
              </button>
            </div>
          </form>
        )}

        {/* Modal CBO */}
        <ModalBase
          open={cboModalOpen}
          title="Catálogo CBO"
          onClose={() => setCboModalOpen(false)}
          loading={cboModalLoading}
          zIndex={999}
          maxWidth={900}
          maxHeight="80vh"
        >
          {cboModalLoading ? (
            <div style={{ padding: 12 }}>Carregando CBOs…</div>
          ) : (
            <div style={{ border: '1px solid #e6e6e6', borderRadius: 12, overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left' }}>
                    <th style={{ padding: 10, borderBottom: '1px solid #e6e6e6' }}>Código</th>
                    <th style={{ padding: 10, borderBottom: '1px solid #e6e6e6' }}>Título</th>
                  </tr>
                </thead>
                <tbody>
                  {cboModalItems.map((cbo) => (
                    <tr
                      key={cbo.id ?? cbo.code}
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        applyCboSelection(cbo);
                        setCboModalOpen(false);
                      }}
                    >
                      <td style={{ padding: 10, borderBottom: '1px solid #f0f0f0' }}>{cbo.code}</td>
                      <td style={{ padding: 10, borderBottom: '1px solid #f0f0f0' }}>{cbo.title}</td>
                    </tr>
                  ))}
                  {!cboModalItems.length && (
                    <tr>
                      <td colSpan={2} style={{ padding: 12, textAlign: 'center', color: '#6b7280' }}>
                        Nenhum registro encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </ModalBase>

        {/* Modal Departamentos */}
        <ModalBase
          open={deptModalOpen}
          title="Departamentos do estabelecimento"
          onClose={() => setDeptModalOpen(false)}
          loading={deptModalLoading}
          zIndex={999}
          maxWidth={900}
          maxHeight="80vh"
        >
          {deptModalLoading ? (
            <div style={{ padding: 12 }}>Carregando departamentos…</div>
          ) : (
            <div style={{ border: '1px solid #e6e6e6', borderRadius: 12, overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left' }}>
                    <th style={{ padding: 10, borderBottom: '1px solid #e6e6e6' }}>Nome</th>
                    <th style={{ padding: 10, borderBottom: '1px solid #e6e6e6' }}>Descrição</th>
                  </tr>
                </thead>
                <tbody>
                  {deptModalItems.map((dept) => (
                    <tr
                      key={dept.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        applyDepartmentSelection(dept);
                        setDeptModalOpen(false);
                      }}
                    >
                      <td style={{ padding: 10, borderBottom: '1px solid #f0f0f0' }}>{dept.name}</td>
                      <td style={{ padding: 10, borderBottom: '1px solid #f0f0f0' }}>{dept.description || '—'}</td>
                    </tr>
                  ))}
                  {!deptModalItems.length && (
                    <tr>
                      <td colSpan={2} style={{ padding: 12, textAlign: 'center', color: '#6b7280' }}>
                        Nenhum departamento ativo encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </ModalBase>

        {/* Modal Profiles */}
        <ModalBase
          open={profileModalOpen}
          title="Perfis"
          onClose={() => setProfileModalOpen(false)}
          loading={profileModalLoading}
          zIndex={999}
          maxWidth={900}
          maxHeight="80vh"
        >
          <div style={{ fontSize: 13, marginBottom: 10, color: '#6b7280' }}>
            Clique em um perfil para selecionar como perfil do usuário no portal.
          </div>

          {profileModalLoading ? (
            <div style={{ padding: 12 }}>Carregando perfis…</div>
          ) : (
            <div style={{ border: '1px solid #e6e6e6', borderRadius: 12, overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left' }}>
                    <th style={{ padding: 10, borderBottom: '1px solid #e6e6e6' }}>Nome</th>
                    <th style={{ padding: 10, borderBottom: '1px solid #e6e6e6' }}>Descrição</th>
                  </tr>
                </thead>
                <tbody>
                  {profileModalItems.map((p) => (
                    <tr
                      key={p.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        setSelectedPortalProfile(p);
                        setProfileModalOpen(false);
                      }}
                    >
                      <td style={{ padding: 10, borderBottom: '1px solid #f0f0f0' }}>{p.name}</td>
                      <td style={{ padding: 10, borderBottom: '1px solid #f0f0f0' }}>{p.description || '—'}</td>
                    </tr>
                  ))}
                  {!profileModalItems.length && (
                    <tr>
                      <td colSpan={2} style={{ padding: 12, textAlign: 'center', color: '#6b7280' }}>
                        Nenhum perfil encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </ModalBase>
      </div>
    </div>
  );
}
