import { useAuth } from '../contexts/AuthContext';

export default function usePermission(required) {
  const { permissions } = useAuth();

  if (!required) return true;

  if (!Array.isArray(permissions) || permissions.length === 0) return false;

  if (Array.isArray(required)) {
    return required.some(r => permissions.includes(r));
  }

  return permissions.includes(required);
}
