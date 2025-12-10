import React, { useEffect, useState, useCallback } from 'react';
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
import { searchCBO, lookupCEP } from '../api/catalog'; // 👈 inclui lookupCEP
import api from '../../../../api/axios';
import usePermission from '../../../auth/hooks/usePermission';
import { listDepartmentsInEstablishment } from '../api/departments'; // 👈 NOVO

function onlyDigits(v = '') {
  return String(v).replace(/\D+/g, '');
}

export default function EmployeeForm({ mode = 'create' }) {
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const { companyId, establishmentId, employeeId } = useParams();
  const { pathname } = useLocation();

  const scope = pathname.includes('/establishments/')
    ? 'establishment'
    : 'company';

  // permissões
  const canCreate = usePermission('employee.create');
  const canUpdate = usePermission('employee.update');

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
  const [selectedDepartment, setSelectedDepartment] = useState(null); // 👈 NOVO

  const [error, setError] = useState('');
  const [resolvedCompanyId, setResolvedCompanyId] = useState(companyId || null);
  const [loadingCompany, setLoadingCompany] = useState(false);

  // --- Modal de CBOs ---
  const [cboModalOpen, setCboModalOpen] = useState(false);
  const [cboModalItems, setCboModalItems] = useState([]);
  const [cboModalLoading, setCboModalLoading] = useState(false);

  // --- Modal de Departamentos ---
  const [deptModalOpen, setDeptModalOpen] = useState(false);        // 👈 NOVO
  const [deptModalItems, setDeptModalItems] = useState([]);         // 👈 NOVO
  const [deptModalLoading, setDeptModalLoading] = useState(false);  // 👈 NOVO

  const setFormVal = (key, value) =>
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));

  // --------- Helper: aplicar seleção de CBO (autocomplete ou modal) ---------
  const applyCboSelection = useCallback((item) => {
    const cbo = item || null;
    setSelectedCbo(cbo);

    if (cbo) {
      setForm((prev) => ({
        ...prev,
        jobTitle:
          prev.jobTitle?.trim()
            ? prev.jobTitle
            : cbo.title || prev.jobTitle,
      }));
    }
  }, []);

  // --------- Helper: aplicar seleção de Departamento --------- // 👈 NOVO
  const applyDepartmentSelection = useCallback((item) => {
    const dept = item || null;
    setSelectedDepartment(dept);
  }, []);

  // --------- Fetch CBOs (autocomplete) ---------
  const fetchCboOptions = useCallback(
    async (query) => {
      if (!accessToken) return { items: [], total: 0 };
      const res = await searchCBO(query, 1, 20, accessToken);
      return {
        items: res.items || [],
        total: res.total || 0,
      };
    },
    [accessToken],
  );

  // --------- Fetch Departments (autocomplete) --------- // 👈 NOVO
  const fetchDepartmentOptions = useCallback(
    async (query) => {
      if (!accessToken) return { items: [], total: 0 };

      const finalCompanyId = companyId || resolvedCompanyId;
      if (!finalCompanyId || !establishmentId) {
        return { items: [], total: 0 };
      }

      const res = await listDepartmentsInEstablishment(
        finalCompanyId,
        establishmentId,
        { page: 1, pageSize: 50, q: query || '' },
        accessToken,
      );

      const items = res?.items || [];
      return {
        items,
        total: res?.total ?? items.length ?? 0,
      };
    },
    [accessToken, companyId, resolvedCompanyId, establishmentId],
  );

  // --------- Fetch Profiles para portal (autocomplete) ---------
  const fetchPortalProfiles = useCallback(
    async (query) => {
      if (!accessToken) return { items: [], total: 0 };
      const res = await api.get('/api/profiles', {
        params: {
          q: query || '',
          page: 1,
          pageSize: 50,
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const data = res.data?.data || res.data || {};
      const items = data.items || data || [];
      return {
        items,
        total: items.length,
      };
    },
    [accessToken],
  );

  // --------- Carrega dados no modo edição ---------
  useEffect(() => {
    if (mode !== 'edit' || !employeeId || !accessToken) return;

    const load = async () => {
      try {
        let d;

        // ✅ Se estamos no contexto do estabelecimento, usa rota nova:
        if (companyId && establishmentId) {
          d = await getEmployeeInEstablishment(
            companyId,
            establishmentId,
            employeeId,
            accessToken,
          );
        } else {
          // fallback legacy
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
          // endereço
          street: d.street || '',
          number: d.number || '',
          complement: d.complement || '',
          district: d.district || '',
          city: d.city || '',
          state: d.state || '',
          zipCode: d.zipCode || '',
          ibgeCityCode: d.ibgeCityCode || '',
          // portal
          portalAccessEnabled: !!d.portalUserId,
          portalPassword: '',
          portalPasswordConfirm: '',
          // status
          isActive:
            typeof d.isActive === 'boolean' ? d.isActive : true,
        }));

        if (d.cbo) {
          setSelectedCbo(d.cbo);
        }

        if (d.portalUser?.profile) {
          setSelectedPortalProfile(d.portalUser.profile);
        }

        if (d.department) {
          setSelectedDepartment(d.department);
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load employee.');
      }
    };

    load();
  }, [mode, employeeId, companyId, establishmentId, accessToken]);

  // --------- Resolve companyId quando criando a partir de um estabelecimento ---------
  useEffect(() => {
    if (mode !== 'create') return;

    if (companyId) {
      setResolvedCompanyId(companyId);
      return;
    }

    if (scope === 'establishment' && establishmentId && accessToken) {
      setLoadingCompany(true);
      getEstablishment(establishmentId, accessToken)
        .then((est) => {
          setResolvedCompanyId(est?.companyId || null);
        })
        .catch(() => {
          setError('Failed to resolve company for this establishment.');
        })
        .finally(() => {
          setLoadingCompany(false);
        });
    }
  }, [mode, scope, companyId, establishmentId, accessToken]);

  // --------- Modal de CBOs: carregar lista ---------
  const openCboModal = useCallback(async () => {
    setCboModalOpen(true);

    if (!accessToken) {
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
      setCboModalItems([]);
    } finally {
      setCboModalLoading(false);
    }
  }, [accessToken]);

  // --------- Modal de Departamentos: carregar lista --------- // 👈 NOVO
  const openDeptModal = useCallback(async () => {
    setDeptModalOpen(true);

    const finalCompanyId = companyId || resolvedCompanyId;
    if (!accessToken || !finalCompanyId || !establishmentId) {
      setDeptModalItems([]);
      return;
    }

    setDeptModalLoading(true);
    try {
      const res = await listDepartmentsInEstablishment(
        finalCompanyId,
        establishmentId,
        { page: 1, pageSize: 500, q: '' },
        accessToken,
      );
      const data = res || {};
      setDeptModalItems(data.items || data || []);
    } catch (e) {
      console.error('Failed to load departments for modal', e);
      setDeptModalItems([]);
    } finally {
      setDeptModalLoading(false);
    }
  }, [accessToken, companyId, resolvedCompanyId, establishmentId]);

  // --------- Lookup CEP (endereço do colaborador) ---------
  const handleLookupCEP = useCallback(async () => {
    const cep = onlyDigits(form.zipCode);
    if (!cep || cep.length < 8) {
      alert('Informe um CEP válido (8 dígitos).');
      return;
    }

    try {
      const data = await lookupCEP(cep, accessToken);
      if (!data) return;
      setForm((prev) => ({
        ...prev,
        zipCode: data.cep ?? prev.zipCode,
        street: data.street ?? prev.street,
        district: data.district ?? prev.district,
        city: data.city ?? prev.city,
        state: data.state ?? prev.state,
        ibgeCityCode: data.ibgeCityCode ?? prev.ibgeCityCode,
      }));
    } catch (e) {
      console.error(e);
      alert('Falha ao buscar CEP. Tente novamente.');
    }
  }, [form.zipCode, accessToken]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    // bloqueio por permissão
    if (mode === 'edit' && !canUpdate) {
      setError('You do not have permission to update employees.');
      return;
    }
    if (mode === 'create' && !canCreate) {
      setError('You do not have permission to create employees.');
      return;
    }

    if (
      form.portalAccessEnabled &&
      form.portalPassword !== form.portalPasswordConfirm
    ) {
      setError('Portal passwords do not match.');
      return;
    }

    const finalCompanyId = companyId || resolvedCompanyId;

    try {
      const payload = {
        cpf: form.cpf,
        name: form.name,
        jobTitle: form.jobTitle,
        email: form.email,
        phone: form.phone,
        nationality: form.nationality || null,
        language: form.language || null,
        cboId: selectedCbo?.id || null,
        departmentId: selectedDepartment?.id || null,
        // endereço
        street: form.street || null,
        number: form.number || null,
        complement: form.complement || null,
        district: form.district || null,
        city: form.city || null,
        state: form.state || null,
        zipCode: form.zipCode || null,
        ibgeCityCode: form.ibgeCityCode || null,
        // acesso ao portal
        portalAccessEnabled: form.portalAccessEnabled,
        portalPassword: form.portalAccessEnabled
          ? form.portalPassword
          : null,
        portalProfileId: form.portalAccessEnabled
          ? selectedPortalProfile?.id
          : null,
        // status
        isActive: form.isActive,
      };

      if (mode === 'edit') {
        if (companyId && establishmentId) {
          await updateEmployeeInEstablishment(
            companyId,
            establishmentId,
            employeeId,
            payload,
            accessToken,
          );
        } else {
          await updateEmployee(employeeId, payload, accessToken);
        }
      } else {
        if (!finalCompanyId || !establishmentId) {
          setError('Missing company/establishment to create employee.');
          return;
        }

        await createEmployee(
          {
            ...payload,
            companyId: finalCompanyId,
            establishmentId,
          },
          accessToken,
        );
      }

      if (scope === 'company') {
        navigate(`/companies/${finalCompanyId}/employees`);
      } else {
        navigate(
          `/companies/${finalCompanyId}/establishments/${establishmentId}/employees`,
        );
      }
    } catch {
      setError('Failed to save.');
    }
  };

  const isSavingDisabledBase =
    mode === 'create' &&
    scope === 'establishment' &&
    !companyId &&
    (!resolvedCompanyId || loadingCompany);

  const permDisabled =
    (mode === 'edit' && !canUpdate) || (mode === 'create' && !canCreate);

  const isSavingDisabled = isSavingDisabledBase || permDisabled;

  const canUseDepartment = !!establishmentId;

  return (
    <div className="container">
      <h2>{mode === 'edit' ? 'Edit Employee' : 'New Employee'}</h2>
      {error && <div className="error-message">{error}</div>}

      {loadingCompany && mode === 'create' && scope === 'establishment' && (
        <div>Resolving company…</div>
      )}

      <form className="form" onSubmit={submit}>
        {/* Dados básicos */}
        <div className="grid-2">
          <input
            placeholder="CPF"
            value={form.cpf}
            onChange={(e) => setFormVal('cpf', e.target.value)}
            required
          />
          <input
            placeholder="Name"
            value={form.name}
            onChange={(e) => setFormVal('name', e.target.value)}
            required
          />
        </div>

        <div className="grid-2">
          <input
            placeholder="Job Title / Function"
            value={form.jobTitle}
            onChange={(e) => setFormVal('jobTitle', e.target.value)}
          />

          <div>
            <AutocompleteSelect
              label="CBO (occupation)"
              value={selectedCbo}
              onChange={(item) => applyCboSelection(item)}
              fetcher={fetchCboOptions}
              getKey={(it) => it.id}
              getLabel={(it) => `${it.code} - ${it.title}`}
              placeholder="Search CBO by code or title..."
              minChars={0}
              disabled={!accessToken}
            />
            <div
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                marginTop: 4,
                flexWrap: 'wrap',
              }}
            >
              <button
                type="button"
                className="secondary"
                onClick={openCboModal}
              >
                View all CBOs
              </button>
            </div>
          </div>
        </div>

        {/* Departamento / Setor */}
        <div className="grid-2">
          <div>
            <AutocompleteSelect
              label="Department / Sector"
              value={selectedDepartment}
              onChange={(item) => applyDepartmentSelection(item)}
              fetcher={fetchDepartmentOptions}
              getKey={(it) => it.id}
              getLabel={(it) => it.name}
              placeholder={
                canUseDepartment
                  ? 'Search departments in this establishment...'
                  : 'Departments are only available in establishment scope'
              }
              minChars={0}
              disabled={!accessToken || !canUseDepartment}
            />
            <div
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                marginTop: 4,
                flexWrap: 'wrap',
              }}
            >
              <button
                type="button"
                className="secondary"
                onClick={openDeptModal}
                disabled={!canUseDepartment}
              >
                View all Departments
              </button>
            </div>
          </div>
          <div />
        </div>

        {/* Contato */}
        <div className="grid-2">
          <input
            placeholder="Email"
            value={form.email}
            onChange={(e) => setFormVal('email', e.target.value)}
          />
          <input
            placeholder="Phone"
            value={form.phone}
            onChange={(e) => setFormVal('phone', e.target.value)}
          />
        </div>

        <div className="grid-2">
          <input
            placeholder="Nationality"
            value={form.nationality}
            onChange={(e) => setFormVal('nationality', e.target.value)}
          />
          <input
            placeholder="Language"
            value={form.language}
            onChange={(e) => setFormVal('language', e.target.value)}
          />
        </div>

        {/* Endereço / CEP */}
        <div className="grid-3">
          <div>
            <label style={{ fontSize: 12, display: 'block' }}>CEP</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                placeholder="00000-000"
                value={form.zipCode}
                onChange={(e) => setFormVal('zipCode', e.target.value)}
              />
              <button type="button" onClick={handleLookupCEP}>
                Buscar CEP
              </button>
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, display: 'block' }}>Street</label>
            <input
              placeholder="Street"
              value={form.street}
              onChange={(e) => setFormVal('street', e.target.value)}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, display: 'block' }}>Number</label>
            <input
              placeholder="Number"
              value={form.number}
              onChange={(e) => setFormVal('number', e.target.value)}
            />
          </div>
        </div>

        <div className="grid-3">
          <input
            placeholder="Complement"
            value={form.complement}
            onChange={(e) => setFormVal('complement', e.target.value)}
          />
          <input
            placeholder="District"
            value={form.district}
            onChange={(e) => setFormVal('district', e.target.value)}
          />
          <input
            placeholder="City"
            value={form.city}
            onChange={(e) => setFormVal('city', e.target.value)}
          />
        </div>

        <div className="grid-2">
          <input
            placeholder="State (UF)"
            value={form.state}
            onChange={(e) => setFormVal('state', e.target.value)}
          />
          {/* ibgeCityCode fica escondido, mas salvo no estado/payload */}
          <input
            type="hidden"
            value={form.ibgeCityCode || ''}
            readOnly
          />
        </div>

        {/* Status do colaborador */}
        <div style={{ marginTop: 12 }}>
          <label
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <input
              type="checkbox"
              checked={!!form.isActive}
              onChange={(e) => setFormVal('isActive', e.target.checked)}
            />
            Employee active
          </label>
        </div>

        {/* Acesso ao portal (com escolha de Profile) */}
        <fieldset
          style={{
            marginTop: 16,
            border: '1px solid #ddd',
            borderRadius: 6,
            padding: 12,
          }}
        >
          <legend style={{ padding: '0 6px' }}>Portal access</legend>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 8,
            }}
          >
            <input
              type="checkbox"
              checked={form.portalAccessEnabled}
              onChange={(e) =>
                setFormVal('portalAccessEnabled', e.target.checked)
              }
            />
            Enable portal access for this employee
          </label>

          {form.portalAccessEnabled && (
            <>
              <div className="grid-2">
                <div>
                  <AutocompleteSelect
                    label="Portal profile"
                    value={selectedPortalProfile}
                    onChange={(item) =>
                      setSelectedPortalProfile(item || null)
                    }
                    fetcher={fetchPortalProfiles}
                    getKey={(it) => it.id}
                    getLabel={(it) => it.name}
                    placeholder="Select a portal profile..."
                    minChars={0}
                    disabled={!accessToken}
                  />
                </div>
                <div />
              </div>

              <div className="grid-2" style={{ marginTop: 8 }}>
                <div>
                  <label>
                    Portal password
                    <input
                      type="password"
                      value={form.portalPassword}
                      onChange={(e) =>
                        setFormVal('portalPassword', e.target.value)
                      }
                    />
                  </label>
                </div>
                <div>
                  <label>
                    Confirm portal password
                    <input
                      type="password"
                      value={form.portalPasswordConfirm}
                      onChange={(e) =>
                        setFormVal('portalPasswordConfirm', e.target.value)
                      }
                    />
                  </label>
                </div>
              </div>

              <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>
                The system will use this email and password to create (or
                link) a portal user for the collaborator, with the chosen
                profile. When editing an employee that already has portal
                access, leave the password fields blank to keep the current
                password, or fill them to reset the portal password.
              </div>
            </>
          )}
        </fieldset>

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button type="submit" disabled={isSavingDisabled}>
            Save
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => navigate(-1)}
          >
            Cancel
          </button>
        </div>
      </form>

      {/* ---------- Modal de CBOs ---------- */}
      {cboModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 8,
              padding: 16,
              width: '90%',
              maxWidth: 900,
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <h3 style={{ margin: 0 }}>CBO catalog</h3>
              <button
                type="button"
                className="secondary"
                onClick={() => setCboModalOpen(false)}
              >
                Close
              </button>
            </div>

            <div
              style={{
                fontSize: 13,
                marginBottom: 8,
                color: '#555',
              }}
            >
              Lista de CBOs disponíveis no sistema. Clique em uma linha
              para selecionar a ocupação para este colaborador. O título
              será sugerido no campo &quot;Job Title / Function&quot; se
              estiver vazio.
            </div>

            <div
              style={{
                flex: 1,
                overflow: 'auto',
                border: '1px solid #eee',
                borderRadius: 4,
              }}
            >
              {cboModalLoading ? (
                <div style={{ padding: 12 }}>Loading CBOs…</div>
              ) : (
                <table className="data-table" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Title</th>
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
                        <td>{cbo.code}</td>
                        <td>{cbo.title}</td>
                      </tr>
                    ))}
                    {!cboModalItems.length && (
                      <tr>
                        <td colSpan={2} style={{ textAlign: 'center' }}>
                          No CBO records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---------- Modal de Departamentos ---------- */}
      {deptModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 8,
              padding: 16,
              width: '90%',
              maxWidth: 900,
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <h3 style={{ margin: 0 }}>Departments in this establishment</h3>
              <button
                type="button"
                className="secondary"
                onClick={() => setDeptModalOpen(false)}
              >
                Close
              </button>
            </div>

            <div
              style={{
                fontSize: 13,
                marginBottom: 8,
                color: '#555',
              }}
            >
              Lista de departamentos/setores do estabelecimento. Clique
              em uma linha para selecionar o departamento do colaborador.
            </div>

            <div
              style={{
                flex: 1,
                overflow: 'auto',
                border: '1px solid #eee',
                borderRadius: 4,
              }}
            >
              {deptModalLoading ? (
                <div style={{ padding: 12 }}>Loading departments…</div>
              ) : (
                <table className="data-table" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Description</th>
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
                        <td>{dept.name}</td>
                        <td>{dept.description || '—'}</td>
                      </tr>
                    ))}
                    {!deptModalItems.length && (
                      <tr>
                        <td colSpan={2} style={{ textAlign: 'center' }}>
                          No departments found for this establishment.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
