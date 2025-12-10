// src/shared/hooks/RequirePermission.jsx
import React from 'react';
import usePermission from '../../modules/auth/hooks/usePermission';

export default function RequirePermission({
  permission,
  permissions,
  children,
}) {
  // Pode usar tanto `permission="x.y"` quanto `permissions={['x.y', 'z.w']}`
  const required = permissions ?? permission;
  const hasPermission = usePermission(required);

  // console.log(
  //   '[RequirePermission] required =',
  //   required,
  //   '-> acesso =',
  //   hasPermission,
  // );

  if (!hasPermission) {
    return null;
  }

  return <>{children}</>;
}
