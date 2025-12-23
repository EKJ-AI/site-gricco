/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

// ------------------------------------------------------
// 1) Permissões
// ------------------------------------------------------

const PERMISSIONS = [
  // Users / RBAC
  'user.create',
  'user.read',
  'user.update',
  'user.delete',

  // Ativação / desativação (soft delete) de usuários
  'user.active',

  'profile.manage',
  'permission.manage',

  // i18n / Traduções
  'i18n.read',
  'i18n.write',
  'translation.read',
  'translation.create',
  'translation.update',
  'translation.delete',

  // Auditoria / Logs
  'audit.read',

  // Dashboard
  'dashboard.view',

  // Inspeções
  'inspection.read',
  'inspection.create',
  'inspection.update',
  'inspection.delete',

  // Relatórios
  'report.read',
  'report.create',
  'report.update',
  'report.delete',

  // Treinamentos
  'training.read',
  'training.create',
  'training.update',
  'training.delete',

  // Blog / CMS
  'blog.post.read',
  'blog.post.create',
  'blog.post.update',
  'blog.post.delete',
  'blog.post.publish',
];

// ------------------------------------------------------
// 2) Perfis e mapeamento de permissões
// ------------------------------------------------------

const PROFILE_CONFIG = [
  {
    name: 'ADMIN', // Admin Global
    description:
      'Admin Global com acesso a todas as empresas e todas as permissões.',
    // Admin Global recebe TODAS as permissões
    perms: PERMISSIONS,
  }
];

// ------------------------------------------------------
// 3) Funções de seed
// ------------------------------------------------------

async function seedPermissions() {
  console.log('✨ Upserting permissões...');

  const permIds = {};

  const createdPerms = await Promise.all(
    PERMISSIONS.map((name) =>
      prisma.permission.upsert({
        where: { name }, // exige que Permission.name seja único no schema
        update: {}, // se já existir, não altera nada
        create: { name },
      }),
    ),
  );

  for (const p of createdPerms) {
    permIds[p.name] = p.id;
  }

  console.log(`✅ ${createdPerms.length} permissões atualizadas/criadas.`);
  return permIds;
}

async function seedProfiles(permIds) {
  console.log('✨ Upserting perfis...');

  const upsertedProfiles = await Promise.all(
    PROFILE_CONFIG.map((pf) =>
      prisma.profile.upsert({
        where: { name: pf.name }, // exige que Profile.name seja único
        update: {
          description: pf.description ?? null,
        },
        create: {
          name: pf.name,
          description: pf.description ?? null,
        },
      }),
    ),
  );

  console.log(
    '✅ Perfis criados/atualizados:',
    upsertedProfiles.map((p) => p.name).join(', '),
  );

  // Relações Perfil-Permissão
  console.log('🔗 Associando permissões aos perfis...');
  for (const profile of upsertedProfiles) {
    const conf = PROFILE_CONFIG.find((p) => p.name === profile.name);
    if (!conf) continue;

    await Promise.all(
      conf.perms
        .filter((permName) => permIds[permName]) // defensivo
        .map((permName) =>
          prisma.profilePermission.upsert({
            // requer @@unique([profileId, permissionId]) em ProfilePermission
            where: {
              profileId_permissionId: {
                profileId: profile.id,
                permissionId: permIds[permName],
              },
            },
            update: {},
            create: {
              profileId: profile.id,
              permissionId: permIds[permName],
            },
          }),
        ),
    );
  }

  console.log('✅ Permissões associadas aos perfis.');
  return upsertedProfiles;
}

async function seedAdminGlobalUser(profiles) {
  console.log('✨ Criando usuário Admin Global...');

  const adminProfile = profiles.find((p) => p.name === 'ADMIN');
  if (!adminProfile) {
    throw new Error(
      'Perfil ADMIN não encontrado ao tentar criar usuário Admin Global.',
    );
  }

  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@admin.com').trim();
  const adminPassword = (process.env.ADMIN_PASSWORD || 'admin123').trim();

  if (adminPassword.length < 6) {
    console.warn(
      '⚠️ A senha de admin está fraca (<6). Recomende usar .env para configurar melhor (ADMIN_PASSWORD).',
    );
  }

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const user = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      profileId: adminProfile.id,
      isActive: true,
    },
    create: {
      name: 'Administrador Global',
      email: adminEmail,
      passwordHash,
      profileId: adminProfile.id,
      isActive: true,
    },
  });

  console.log(`✅ Usuário Admin Global criado/atualizado: ${user.email}`);
}

// ------------------------------------------------------
// 4) Main
// ------------------------------------------------------

async function main() {
  console.log(
    '🌱 Iniciando Seed de RBAC (permissões, perfis, Portal Employee e Admin Global)...',
  );

  try {
    const permIds = await seedPermissions();
    const profiles = await seedProfiles(permIds);
    await seedAdminGlobalUser(profiles);

    console.log('✅ Seed concluído com sucesso!');
  } catch (error) {
    console.error('❌ Seed falhou:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
