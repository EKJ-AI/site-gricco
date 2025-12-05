// import React from 'react';
// import { Navigate } from 'react-router-dom';
// import { useAuth } from '../../modules/auth/contexts/AuthContext';
// import usePermission from '../../modules/auth/hooks/usePermission';

// export default function ProtectedRoute({ permissions, children }) {
//   const { user, loading } = useAuth();
//   const hasPermission = usePermission(permissions);

//   if (loading) {
//     return <div>Carregando...</div>;  // Ou seu spinner bonito
//   }

//   if (!user) {
//     return <Navigate to="/login" replace />;
//   }

//   console.log("permissao: ", permissions, "tem permissao:", hasPermission);
//   if (!hasPermission) {
//     return <Navigate to="/403" replace />
//   }

//   return <>{children}</>;
// }
