import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../modules/auth/contexts/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Carregando...</div>;  // Ou seu spinner bonito
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
