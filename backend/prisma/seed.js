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
  // Sistema / Escopo
  'system.admin.global', // Admin Global: pode tudo no sistema (todas empresas)
  'company.admin',       // Admin de empresa: pode gerir as empresas que criou

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

  // Companies
  'company.read',
  'company.create',
  'company.update',
  'company.delete',

  // Ativação / desativação de Company
  'company.active',

  // Establishments
  'establishment.read',
  'establishment.create',
  'establishment.update',
  'establishment.delete',

  // Ativação / desativação de Establishment
  'establishment.active',

  // Departments
  'department.read',
  'department.create',
  'department.update',
  'department.delete',

  // Ativação / desativação de Department
  'department.active',

  // Employees
  'employee.read',
  'employee.create',
  'employee.update',
  'employee.delete',

  // Ativação / desativação de Employee
  'employee.active',

  // Document Types
  'documentType.read',
  'documentType.create',
  'documentType.update',
  'documentType.delete',

  // Documents (entidade lógica)
  'document.read',
  'document.create',
  'document.update',
  'document.delete',

  // Ativação / desativação de Document
  'document.active',

  // 📌 NOVA: permissão para visualizar registros de acesso de documentos
  'document.log',

  // Document Versions (arquivos)
  'documentVersion.read',
  'documentVersion.create',
  'documentVersion.update',
  'documentVersion.activate',
  'documentVersion.archive',

  // Visualização / Download (para logar quem viu / baixou)
  'document.view',
  'document.download',

  // Catálogos / tabelas auxiliares
  'catalog.read',

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
  },
  {
    name: 'COMPANY_ADMIN', // Admin de empresas
    description:
      'Admin de empresas: gerencia empresas que criou e seus dados de SST, sem privilégios globais de sistema.',
    perms: [
      'company.admin',

      // leitura básica de sistema
      'audit.read',
      'catalog.read',
      'dashboard.view',

      // Companies (escopo será restringido pelo backend via Company.createdByUserId)
      'company.read',
      'company.create',
      'company.update',
      'company.delete',
      'company.active',

      // Estabelecimentos
      'establishment.read',
      'establishment.create',
      'establishment.update',
      'establishment.delete',
      'establishment.active',

      // Departamentos
      'department.read',
      'department.create',
      'department.update',
      'department.delete',
      'department.active',

      // Employees
      'employee.read',
      'employee.create',
      'employee.update',
      'employee.delete',
      'employee.active',

      // Document Types
      'documentType.read',

      // Documentos (lógicos)
      'document.read',
      'document.create',
      'document.update',
      'document.delete',
      'document.active',

      // 📌 pode ver registros (logs) de documentos
      'document.log',

      // Versões de documentos
      'documentVersion.read',
      'documentVersion.create',
      'documentVersion.activate',
      'documentVersion.archive',
      'documentVersion.update',

      // Visualização / download de documentos
      'document.view',
      'document.download',

      // Inspeções, relatórios, treinamentos
      'inspection.read',
      'inspection.create',
      'inspection.update',
      'inspection.delete',

      'report.read',
      'training.read',

      // Blog / CMS
      'blog.post.read',
      'blog.post.create',
      'blog.post.update',
      'blog.post.delete',
      'blog.post.publish',
    ],
  },
  {
    name: 'EDITOR',
    description:
      'Perfil com permissão de edição operacional (sem poderes administrativos globais).',
    perms: [
      'i18n.read',
      'i18n.write',

      'company.read',
      'establishment.read',
      'department.read',
      'employee.read',

      'documentType.read',

      'document.read',
      'document.create',
      'document.update',
      'document.active',

      // 📌 também consegue ver registros
      'document.log',

      'documentVersion.read',
      'documentVersion.create',
      'documentVersion.activate',

      'document.view',
      'document.download',

      'catalog.read',

      'dashboard.view',

      'inspection.read',
      'report.read',
      'training.read',

      // Blog / CMS
      'blog.post.read',
      'blog.post.create',
      'blog.post.update',
      'blog.post.publish',
    ],
  },
  {
    name: 'VIEWER',
    description: 'Perfil somente leitura.',
    perms: [
      'i18n.read',
      'audit.read',
      'user.read',

      'company.read',
      'establishment.read',
      'department.read',
      'employee.read',

      'documentType.read',

      'document.read',
      'documentVersion.read',
      'document.view',
      'document.download',

      'catalog.read',
      'dashboard.view',

      'inspection.read',
      'report.read',
      'training.read',

      // Blog / CMS
      'blog.post.read',
    ],
  },
  {
    // ⚠️ Nome bate com o usado em employee.controller:
    // PORTAL_EMPLOYEE_PROFILE_NAME || 'Portal Employee'
    name: 'Admin Master',
    description:
      'Colaborador de portal com acesso apenas aos documentos dos estabelecimentos aos quais está vinculado.',
    perms: [
      // possibilita acessar a empresa e estabelecimento vinculados
      //'company.read',
      //'company.update',

      'dashboard.view',

      //'department.active',
      //'department.create',
      //'department.delete',
      'department.read',
      //'department.update',

      // acesso às telas básicas do estabelecimento
      //'establishment.active',
      //'establishment.create',
      //'establishment.delete',
      'establishment.read',
      //'establishment.update',

      // leitura de documentos (o escopo real é filtrado pelo vínculo Employee.portalUserId)
      'document.read',
      'document.view',
      'document.download',
      //'document.active',
      //'document.create',
      //'document.delete',
      //'document.update',

      //'documentVersion.activate',
      //'documentVersion.archive',
      //'documentVersion.create',
      'documentVersion.read',
      //'documentVersion.update',

      //'employee.active',
      //'employee.create',
      //'employee.delete',
      'employee.read',
      //'employee.update',

      // leitura de catálogos (ex.: CBO, CNAE, etc.)
      'catalog.read',

       // Blog / CMS – pode ler posts públicos
      'blog.post.read', 
    ],
  },
  {
    name: 'Guest',
    description: 'Apenas visualiza os documentos da empresa.',
    perms: [
      // possibilita acessar a empresa e estabelecimento vinculados
      'company.read',

      'dashboard.view',

      // acesso às telas básicas do estabelecimento
      'establishment.read',

      // leitura de documentos (o escopo real é filtrado pelo vínculo Employee.portalUserId)
      'document.read',
      'document.view',

      // leitura de catálogos (ex.: CBO, CNAE, etc.)
      'catalog.read',

       // Blog / CMS – pode ler posts públicos
      'blog.post.read',
    ],
  },
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
