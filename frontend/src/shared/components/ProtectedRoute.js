import React from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../../modules/auth/contexts/AuthContext';
import Forbidden from './Forbidden';

export default function ProtectedRoute({ children, permissions = [] }) {
  const { user, permissions: userPerms, loading } = useAuth();
  const location = useLocation();
  const { companyId, establishmentId } = useParams();

  if (loading) {
    return <div>Loading...</div>;
  }

  // Não logado → manda pro login
  if (!user) {
    return (
      <Navigate
        to="/login"
        state={{ from: location.pathname }}
        replace
      />
    );
  }

  // Sem lista de permissões → só exige estar logado
  if (!permissions || permissions.length === 0) {
    return children;
  }

  const permArray = Array.isArray(permissions) ? permissions : [permissions];

  // Caminho normal: usuário com permissão explícita
  const hasRequired = permArray.some((p) =>
    (userPerms || []).includes(p)
  );

  if (hasRequired) {
    return children;
  }

  // -------- Fallback: colaborador de portal --------
  const portalCtx = user.portalContext;
  if (portalCtx) {
    // Ele só pode "furar" as permissões para o SEU estabelecimento
    const sameCompany =
      !companyId || String(companyId) === String(portalCtx.companyId);
    const sameEstablishment =
      !establishmentId ||
      String(establishmentId) === String(portalCtx.establishmentId);

    // E só em permissões seguras ligadas a leitura de docs
    const safePortalPerms = new Set([
      'establishment.read',
      'document.read',
      'documentVersion.read',
    ]);

    const allRequestedAreSafe = permArray.every((p) =>
      safePortalPerms.has(p)
    );

    if (sameCompany && sameEstablishment && allRequestedAreSafe) {
      return children;
    }
  }

  // Se chegou aqui, não tem permissão suficiente
  return <Forbidden />;
}
