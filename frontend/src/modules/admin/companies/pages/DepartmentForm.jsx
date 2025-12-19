import React, { useEffect, useMemo, useState } from 'react';
import {
  createDepartmentInEstablishment,
  getDepartmentInEstablishment,
  updateDepartmentInEstablishment,
} from '../api/departments';
import { useAuth } from '../../../auth/contexts/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import usePermission from '../../../auth/hooks/usePermission';
import { useToast, extractErrorMessage } from '../../../../shared/components/toast/ToastProvider';

function validateDepartment(form) {
  const missing = [];
  if (!String(form.name || '').trim()) missing.push('Nome');
  return { ok: missing.length === 0, missing };
}

export default function DepartmentForm({ mode = 'create' }) {
  const { accessToken } = useAuth();
  const { companyId, establishmentId, departmentId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState({
    name: '',
    description: '',
    shift: '',
    workload: '',
    isActive: true,
  });

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canCreate = usePermission('department.create');
  const canUpdate = usePermission('department.update');
  const canWrite = mode === 'edit' ? canUpdate : canCreate;

  useEffect(() => {
    // avisa uma vez ao entrar sem permissão
    if (!loading && !submitting && !canWrite) {
      toast.warning(
        `Você não tem permissão para ${mode === 'edit' ? 'atualizar' : 'criar'} departamentos.`,
        { title: 'Permissão' }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canWrite, mode]);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      if (mode !== 'edit' || !departmentId) return;

      try {
        setLoading(true);
        const d = await getDepartmentInEstablishment(companyId, establishmentId, departmentId, accessToken);
        if (!d || !isMounted) return;

        setForm({
          name: d.name || '',
          description: d.description || '',
          shift: d.shift || '',
          workload: d.workload || '',
          isActive: typeof d.isActive === 'boolean' ? d.isActive : true,
        });
      } catch (e) {
        toast.error(extractErrorMessage(e, 'Falha ao carregar o departamento.'), { title: 'Falha ao carregar' });
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    load();
    return () => { isMounted = false; };
  }, [mode, departmentId, companyId, establishmentId, accessToken, toast]);

  const validation = useMemo(() => validateDepartment(form), [form]);
  const saveDisabled = loading || submitting || !canWrite || !validation.ok;

  async function submit(e) {
    e.preventDefault();

    const v = validateDepartment(form);
    if (!v.ok) {
      const preview = v.missing.slice(0, 4).join(', ');
      const tail = v.missing.length > 4 ? `… (+${v.missing.length - 4})` : '';
      toast.warning(`Preencha os campos obrigatórios: ${preview}${tail}`, { title: 'Campos obrigatórios' });
      return;
    }

    if (!canWrite) {
      toast.warning('Você não tem permissão para salvar departamentos.', { title: 'Permissão' });
      return;
    }

    try {
      setSubmitting(true);

      if (mode === 'edit') {
        await updateDepartmentInEstablishment(companyId, establishmentId, departmentId, form, accessToken);
      } else {
        await createDepartmentInEstablishment(companyId, establishmentId, form, accessToken);
      }

      toast.success('Departamento salvo com sucesso.', { title: 'Salvo' });
      navigate(`/companies/${companyId}/establishments/${establishmentId}/departments`);
    } catch (e2) {
      toast.error(extractErrorMessage(e2, 'Falha ao salvar.'), { title: 'Não foi possível salvar' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="pf-page">
      <div className="pf-shell">
        <div className="pf-header">
          <div className="pf-header-left">
            <div className="pf-header-icon" aria-hidden="true">🏷️</div>
            <div>
              <h2 className="pf-title">{mode === 'edit' ? 'Editar Departamento' : 'Novo Departamento'}</h2>
              <p className="pf-subtitle">
                {mode === 'edit'
                  ? 'Atualize as informações do departamento.'
                  : 'Cadastre um novo departamento no estabelecimento.'}
              </p>
            </div>
          </div>

          <button type="button" className="pf-close" onClick={() => navigate(-1)} aria-label="Fechar">
            ✕
          </button>
        </div>

        <form className="pf-form" onSubmit={submit}>
          <section className="pf-section">
            <div className="grid-2">
              <label>
                Nome *
                <input
                  placeholder="Ex.: Produção"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  disabled={loading || submitting || !canWrite}
                />
              </label>

              <label>
                Turno
                <input
                  placeholder="Ex.: 1º turno"
                  value={form.shift}
                  onChange={(e) => setForm((f) => ({ ...f, shift: e.target.value }))}
                  disabled={loading || submitting || !canWrite}
                />
              </label>
            </div>

            <div className="grid-2" style={{ marginTop: 10 }}>
              <label>
                Jornada
                <input
                  placeholder="Ex.: 44h/semana"
                  value={form.workload}
                  onChange={(e) => setForm((f) => ({ ...f, workload: e.target.value }))}
                  disabled={loading || submitting || !canWrite}
                />
              </label>

              <label>
                Descrição
                <input
                  placeholder="Opcional"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  disabled={loading || submitting || !canWrite}
                />
              </label>
            </div>

            <div className="pf-switch-row" style={{ marginTop: 10 }}>
              <p className="pf-switch-label">Departamento ativo</p>
              <input
                type="checkbox"
                className="pf-switch"
                checked={!!form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                disabled={loading || submitting || !canWrite}
                aria-label="Departamento ativo"
              />
            </div>
          </section>

          <div className="pf-actions">
            <button
              type="button"
              className="pf-btn pf-btn-secondary"
              onClick={() => navigate(-1)}
              disabled={loading || submitting}
            >
              Cancelar
            </button>

            <button type="submit" className="pf-btn pf-btn-primary" disabled={saveDisabled}>
              {submitting ? 'Salvando…' : 'Salvar cadastro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
