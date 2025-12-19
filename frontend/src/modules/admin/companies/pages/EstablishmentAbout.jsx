// src/modules/admin/companies/pages/EstablishmentAbout.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../../auth/contexts/AuthContext';
import { getEstablishment } from '../api/establishments';
import '../styles/EstablishmentAbout.css';

export default function EstablishmentAbout() {
  const { accessToken } = useAuth();
  const { companyId, establishmentId } = useParams();

  const [establishment, setEstablishment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    // ❗ só tenta carregar se tiver tudo que precisa
    if (!accessToken || !companyId || !establishmentId) return;

    const load = async () => {
      setLoading(true);
      setErr('');
      try {
        // ✅ agora passamos (companyId, establishmentId, accessToken)
        const data = await getEstablishment(
          companyId,
          establishmentId,
          accessToken,
        );
        // dependendo do shape da API, pode ser data.data ou data
        setEstablishment(data || null);
      } catch (e) {
        console.error('[EstablishmentAbout] load error', e);
        setErr('Failed to load establishment about.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [accessToken, companyId, establishmentId]);

    const metrics = useMemo(() => {
    if (!establishment) {
      return {
        totalEmployees: 0,
        activeEmployees: 0,
        totalDepartments: 0,
        totalDocuments: 0,
        publishedDocuments: 0,
      };
    }

    const employees = Array.isArray(establishment.employees)
      ? establishment.employees
      : [];
    const departments = Array.isArray(establishment.departments)
      ? establishment.departments
      : [];
    const documents = Array.isArray(establishment.documents)
      ? establishment.documents
      : [];

    const totalEmployees = employees.length;
    const activeEmployees = employees.filter((e) => e.isActive !== false).length;
    const totalDepartments = departments.length;
    const totalDocuments = documents.length;

    // 👇 Lógica mais robusta para "publicados"
    const publishedDocuments = documents.filter((d) => {
      // 1) Campo status direto no Document
      const hasPublishedStatus =
        typeof d.status === 'string' &&
        d.status.toUpperCase() === 'PUBLISHED';

      // 2) currentVersion.status (se vier incluído pela API)
      const hasPublishedCurrentVersion =
        d.currentVersion &&
        typeof d.currentVersion.status === 'string' &&
        d.currentVersion.status.toUpperCase() === 'PUBLISHED';

      // 3) Alguma versão com status PUBLISHED (se a API trouxer versions)
      const hasPublishedVersionArray =
        Array.isArray(d.versions) &&
        d.versions.some(
          (v) =>
            typeof v.status === 'string' &&
            v.status.toUpperCase() === 'PUBLISHED',
        );

      // 4) Heurística simples: se tem currentVersionId, consideramos publicado
      const hasCurrentVersionId =
        d.currentVersionId !== null && d.currentVersionId !== undefined;

      return (
        hasPublishedStatus ||
        hasPublishedCurrentVersion ||
        hasPublishedVersionArray ||
        hasCurrentVersionId
      );
    }).length;

    return {
      totalEmployees,
      activeEmployees,
      totalDepartments,
      totalDocuments,
      publishedDocuments,
    };
  }, [establishment]);


  if (loading) {
    return <div>Loading dashboard…</div>;
  }

  if (err) {
    return <div className="error-message">{err}</div>;
  }

  if (!establishment) {
    return <div>No establishment data found.</div>;
  }

  const company = establishment.company || {};
  const mainCnae =
    establishment.mainCnae ||
    establishment.cnaes?.[0]?.cnae?.code ||
    null;
  const riskLevel =
    typeof establishment.riskLevel === 'number'
      ? establishment.riskLevel
      : establishment.cnaes?.[0]?.riskLevel ?? null;

  const isEstablishmentActive = establishment.isActive !== false;
  const companyIsActive = company.isActive !== false;

  return (
    <div className="est-about">
      {/* HEADER */}
      <div className="est-about-header">
        {/* <div>
          <h2 className="est-about-title">
            {establishment.nickname || 'Establishment'}
          </h2>
          <div className="est-about-subtitle">
            {company.tradeName || company.legalName || 'Company'} •{' '}
            {establishment.city || '-'}
            {establishment.state ? ` / ${establishment.state}` : ''}
          </div>
        </div> */}

        <div className="est-about-status-group">
          <span
            className={
              companyIsActive
                ? 'est-badge est-badge-success'
                : 'est-badge est-badge-danger'
            }
          >
            Company: {companyIsActive ? 'Active' : 'Inactive'}
          </span>
          <span
            className={
              isEstablishmentActive
                ? 'est-badge est-badge-success'
                : 'est-badge est-badge-danger'
            }
          >
            Establishment: {isEstablishmentActive ? 'Active' : 'Inactive'}
          </span>
          {establishment.isHeadquarter && (
            <span className="est-badge est-badge-info">Headquarter</span>
          )}
        </div>
      </div>

      {/* GRID DE CARDS */}
      <div className="est-about-grid">
        {/* Card de identificação */}
        <div className="est-card">
          <div className="est-card-header">
            <h3>Identification</h3>
          </div>
          <div className="est-card-body">
            <div className="est-field">
              <span className="est-label">Company</span>
              {companyId ? (
                <Link
                  to={`/companies/${companyId}`}
                  className="est-link"
                >
                  {company.tradeName || company.legalName || 'View company'}
                </Link>
              ) : (
                <span>{company.tradeName || company.legalName || '-'}</span>
              )}
            </div>

            <div className="est-field">
              <span className="est-label">CNPJ</span>
              <span>{establishment.cnpj || '—'}</span>
            </div>

            <div className="est-field">
              <span className="est-label">Location</span>
              <span>
                {establishment.city || '-'}
                {establishment.state ? ` / ${establishment.state}` : ''}
              </span>
            </div>

            <div className="est-field">
              <span className="est-label">Address</span>
              <span>
                {[establishment.street, establishment.number, establishment.district]
                  .filter(Boolean)
                  .join(', ') || '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Card de risco / CNAE */}
        <div className="est-card">
          <div className="est-card-header">
            <h3>Risk & CNAE</h3>
          </div>
          <div className="est-card-body">
            <div className="est-field">
              <span className="est-label">Main CNAE</span>
              <span>{mainCnae || '—'}</span>
            </div>

            <div className="est-field">
              <span className="est-label">NR Risk Level</span>
              {riskLevel ? (
                <span className={`est-tag est-tag-risk-${riskLevel}`}>
                  Level {riskLevel}
                </span>
              ) : (
                <span className="est-tag est-tag-muted">Not defined</span>
              )}
            </div>

            <div className="est-field">
              <span className="est-label">Total CNAEs</span>
              <span>
                {Array.isArray(establishment.cnaes)
                  ? establishment.cnaes.length
                  : 0}
              </span>
            </div>
          </div>
        </div>

        {/* Card de colaboradores */}
        <div className="est-card">
          <div className="est-card-header est-card-header-inline">
            <h3>Employees</h3>
            {companyId && establishmentId && (
              <Link
                to={`/companies/${companyId}/establishments/${establishmentId}/employees`}
                className="est-link-small"
              >
                View employees
              </Link>
            )}
          </div>
          <div className="est-card-body est-card-body-kpis">
            <div className="est-kpi">
              <div className="est-kpi-value">{metrics.activeEmployees}</div>
              <div className="est-kpi-label">Active</div>
            </div>
            <div className="est-kpi">
              <div className="est-kpi-value est-kpi-muted">
                {metrics.totalEmployees}
              </div>
              <div className="est-kpi-label">Total</div>
            </div>
          </div>
        </div>

        {/* Card de documentos */}
        <div className="est-card">
          <div className="est-card-header est-card-header-inline">
            <h3>Documents</h3>
            {companyId && establishmentId && (
              <Link
                to={`/companies/${companyId}/establishments/${establishmentId}/documents`}
                className="est-link-small"
              >
                View documents
              </Link>
            )}
          </div>
          <div className="est-card-body est-card-body-kpis">
            <div className="est-kpi">
              <div className="est-kpi-value">{metrics.publishedDocuments}</div>
              <div className="est-kpi-label">Published</div>
            </div>
            <div className="est-kpi">
              <div className="est-kpi-value est-kpi-muted">
                {metrics.totalDocuments}
              </div>
              <div className="est-kpi-label">Total</div>
            </div>
          </div>
        </div>

        {/* Card de departamentos */}
        <div className="est-card">
          <div className="est-card-header est-card-header-inline">
            <h3>Departments</h3>
            {companyId && establishmentId && (
              <Link
                to={`/companies/${companyId}/establishments/${establishmentId}/departments`}
                className="est-link-small"
              >
                View departments
              </Link>
            )}
          </div>
          <div className="est-card-body est-card-body-kpis">
            <div className="est-kpi">
              <div className="est-kpi-value">
                {metrics.totalDepartments}
              </div>
              <div className="est-kpi-label">Total departments</div>
            </div>
          </div>
        </div>

        {/* Card “Quick links” / atalhos */}
        {/* <div className="est-card">
          <div className="est-card-header">
            <h3>Quick actions</h3>
          </div>
          <div className="est-card-body est-quick-actions">
            {companyId && establishmentId && (
              <>
                <Link
                  to={`/companies/${companyId}/establishments/${establishmentId}/documents/new`}
                  className="est-button-link"
                >
                  + New document
                </Link>
                <Link
                  to={`/companies/${companyId}/establishments/${establishmentId}/employees/new`}
                  className="est-button-link"
                >
                  + New employee
                </Link>
              </>
            )}
            {companyId && (
              <Link
                to={`/companies/${companyId}`}
                className="est-button-link est-button-link-secondary"
              >
                Open company
              </Link>
            )}
          </div>
        </div> */}
      </div>
    </div>
  );
}
