// src/modules/admin/companies/pages/EstablishmentDashboard.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../../auth/contexts/AuthContext';
import { getEstablishment } from '../api/establishments';
import '../styles/EstablishmentDashboard.css';

export default function EstablishmentDashboard() {
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
        console.error('[EstablishmentDashboard] load error', e);
        setErr('Failed to load establishment dashboard.');
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
  //import imgGrafico from `../../../../shared/assets/images/admin/${establishment.cnpj}/imgGrafico.svg`;
  return (
    <div className="est-dashboard">
      <div className="est-graficos">
        <div><img src={`${process.env.PUBLIC_URL}/images/admin/${establishment.cnpj}/grafico001.jpg`} /></div>
        <div><img src={`${process.env.PUBLIC_URL}/images/admin/${establishment.cnpj}/grafico002.jpg`} /></div>
      </div>
    </div>
  );
}
