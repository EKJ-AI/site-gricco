import React from 'react';
import usePermission from '../../modules/auth/hooks/usePermission';

export default function RequirePermission({ permission, children }) {
  const hasPermission = usePermission(permission);

  console.log(`[RequirePermission] Verificando permissão: "${permission}" - Acesso: ${hasPermission}`);

  if (!hasPermission) {
    return null;
  }

  return <>{children}</>;
}
