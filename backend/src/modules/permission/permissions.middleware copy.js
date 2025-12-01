// import prisma from '../../../prisma/client.js';
// import logger from '../../utils/logger.js';

// export function authorizePermissions(requiredPermissions = []) {
//   return async (req, res, next) => {
//     try {
//       logger.info(`[AUTHORIZE] Rota: ${req.method} ${req.originalUrl}`);
//       logger.info(`[AUTHORIZE] Verificando permissões necessárias: ${requiredPermissions.join(', ')}`);

//       if (!req.user || !req.user.profileId) {
//         logger.warn('[AUTHORIZE] Falha: Usuário não autenticado');
//         return res.status(403).json({ message: 'Usuário não autenticado' });
//       }

//       const profile = await prisma.profile.findUnique({
//         where: { id: req.user.profileId },
//         include: {
//           permissions: {
//             include: {
//               permission: true
//             }
//           }
//         }
//       });

//       if (!profile) {
//         logger.warn(`[AUTHORIZE] Falha: Perfil não encontrado para ID ${req.user.profileId}`);
//         return res.status(403).json({ message: 'Perfil não encontrado' });
//       }

//       const userPermissions = profile.permissions.map(p => p.permission.name);
//       logger.info(`[AUTHORIZE] Permissões do usuário: ${userPermissions.join(', ')}`);

//       const hasAllRequired = requiredPermissions.every(perm =>
//         userPermissions.includes(perm)
//       );

//       if (!hasAllRequired) {
//         const missing = requiredPermissions.filter(perm => !userPermissions.includes(perm));
//         logger.warn(`[AUTHORIZE] Permissão insuficiente. Faltam: ${missing.join(', ')}`);
//         return res.status(403).json({ message: 'Permissão insuficiente' });
//       }

//       logger.info('[AUTHORIZE] Permissão concedida ✅');
//       next();
//     } catch (error) {
//       logger.error(`[AUTHORIZE] Erro interno: ${error.message}`, error);
//       res.status(500).json({ message: 'Erro interno no servidor' });
//     }
//   };
// }
