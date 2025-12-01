// import React from 'react';
// import { useAuth } from '../../auth/contexts/AuthContext';

// export function useHasPerm() {
//   const { user } = useAuth();
//   const set = new Set((user?.permissions || []).map(String));
//   return (perm) => set.has(perm);
// }

// export const IfPerm = ({ perm, children, fallback = null }) => {
//   const has = useHasPerm()(perm);
//   return has ? children : fallback;
// };

// export const IfAnyPerm = ({ perms = [], children, fallback = null }) => {
//   const has = useHasPerm();
//   return perms.some(has) ? children : fallback;
// };