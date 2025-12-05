// src/shared/hooks/RequirePermission.jsx (ou caminho equivalente)
import React from 'react';
import usePermission from '../../modules/auth/hooks/usePermission';

export default function RequirePermission({ permission, permissions, children }) {
  // aceita tanto `permission="x"` quanto `permissions={['x','y']}`
  const required = permissions ?? permission;

  const hasPermission = usePermission(required);

  console.log(
    '[RequirePermission] Requerido:',
    required,
    '- Acesso:',
    hasPermission
  );

  if (!hasPermission) {
    return null;
  }

  return <>{children}</>;
}
