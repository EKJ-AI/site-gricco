import React, { useEffect, useState, useCallback } from 'react';
import {
  createEmployee,
  getEmployee,
  updateEmployee,
} from '../api/employees';
import { getEstablishment } from '../api/establishments';
import { useAuth } from '../../../auth/contexts/AuthContext';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import AutocompleteSelect from '../components/AutocompleteSelect.jsx';
import { searchCBO } from '../api/catalog';
import api from '../../../../api/axios';
import usePermission from '../../../auth/hooks/usePermission';

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
    // acesso portal
    portalAccessEnabled: false,
    portalPassword: '',
    portalPasswordConfirm: '',
  });

  const [selectedCbo, setSelectedCbo] = useState(null);
  const [selectedPortalProfile, setSelectedPortalProfile] = useState(null);

  const [error, setError] = useState('');
  const [resolvedCompanyId, setResolvedCompanyId] = useState(companyId || null);
  const [loadingCompany, setLoadingCompany] = useState(false);

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
    if (mode === 'edit' && employeeId && accessToken) {
      getEmployee(employeeId, accessToken).then((d) => {
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
          portalAccessEnabled: !!d.portalUserId,
          portalPassword: '',
          portalPasswordConfirm: '',
        }));

        if (d.cbo) {
          setSelectedCbo(d.cbo);
        }

        if (d.portalUser?.profile) {
          setSelectedPortalProfile(d.portalUser.profile);
        }
      });
    }
  }, [mode, employeeId, accessToken]);

  // --------- Resolve companyId quando criando a partir de um estabelecimento ---------
  useEffect(() => {
    if (mode !== 'create') return;

    // Se já vier pelo param (rota /companies/:companyId/...), beleza
    if (companyId) {
      setResolvedCompanyId(companyId);
      return;
    }

    // Escopo de estabelecimento, sem companyId → buscar no backend
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

    // 👇 usamos esse companyId tanto para salvar quanto para navegar depois
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
        // acesso ao portal
        portalAccessEnabled: form.portalAccessEnabled,
        portalPassword: form.portalAccessEnabled
          ? form.portalPassword
          : null,
        portalProfileId: form.portalAccessEnabled
          ? selectedPortalProfile?.id
          : null,
      };

      if (mode === 'edit') {
        await updateEmployee(employeeId, payload, accessToken);
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

      // 🔁 Pós-salvar: redireciona para rotas que realmente existem
      if (scope === 'company') {
        // lista geral de colaboradores da empresa
        navigate(`/companies/${finalCompanyId}/employees`);
      } else {
        // lista de colaboradores do estabelecimento
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
            onChange={(e) => setForm({ ...form, cpf: e.target.value })}
            required
          />
          <input
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>

        <div className="grid-2">
          <input
            placeholder="Job Title / Function"
            value={form.jobTitle}
            onChange={(e) =>
              setForm({ ...form, jobTitle: e.target.value })
            }
          />

          <AutocompleteSelect
            label="CBO (occupation)"
            value={selectedCbo}
            onChange={(item) => {
              setSelectedCbo(item || null);
              if (item) {
                setForm((prev) => ({
                  ...prev,
                  jobTitle:
                    prev.jobTitle?.trim()
                      ? prev.jobTitle
                      : item.title || prev.jobTitle,
                }));
              }
            }}
            fetcher={fetchCboOptions}
            getKey={(it) => it.id}
            getLabel={(it) => `${it.code} - ${it.title}`}
            placeholder="Search CBO by code or title..."
            minChars={0}
            disabled={!accessToken}
          />
        </div>

        <div className="grid-2">
          <input
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            placeholder="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>

        <div className="grid-2">
          <input
            placeholder="Nationality"
            value={form.nationality}
            onChange={(e) =>
              setForm({ ...form, nationality: e.target.value })
            }
          />
          <input
            placeholder="Language"
            value={form.language}
            onChange={(e) =>
              setForm({ ...form, language: e.target.value })
            }
          />
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
                setForm({
                  ...form,
                  portalAccessEnabled: e.target.checked,
                })
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
                        setForm({
                          ...form,
                          portalPassword: e.target.value,
                        })
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
                        setForm({
                          ...form,
                          portalPasswordConfirm: e.target.value,
                        })
                      }
                    />
                  </label>
                </div>
              </div>

              <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>
                The system will use this email and password to create (or
                link) a portal user for the collaborator, with the chosen
                profile. The profile permissions define what they can do,
                and the employee link defines where (which company/
                establishment).
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
    </div>
  );
}
