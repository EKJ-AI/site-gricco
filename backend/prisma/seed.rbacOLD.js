/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PERMS = [
  // Users / RBAC
  'user.create','user.read','user.update','user.delete',
  'profile.manage','permission.manage',

  // i18n / Traduções
  'i18n.read','i18n.write',
  'translation.read','translation.create','translation.update','translation.delete',

  // Auditoria / Logs
  'audit.read',

  // Companies
  'company.read','company.create','company.update','company.delete',

  // Establishments
  'establishment.read','establishment.create','establishment.update','establishment.delete',

  // Departments
  'department.read','department.create','department.update','department.delete',

  // Employees
  'employee.read','employee.create','employee.update','employee.delete',

  // Document Types
  'documentType.read','documentType.create','documentType.update','documentType.delete',

  // Documents (entidade lógica)
  'document.read','document.create','document.update','document.delete',

  // Document Versions (arquivos)
  'documentVersion.read','documentVersion.create','documentVersion.activate','documentVersion.archive',

  // Visualização (logar quem viu)
  'document.view',

  // Catálogos / tabelas auxiliares
  'catalog.read',

  // Dashboard
  'dashboard.view',

  // Inspeções
  'inspection.read','inspection.create','inspection.update','inspection.delete',

  // Relatórios
  'report.read','report.create','report.update','report.delete',

  // Treinamentos
  'training.read','training.create','training.update','training.delete',
];

async function main() {
  // 1) Permissões
  const permIds = {};
  const createdPerms = await Promise.all(
    PERMS.map((name) =>
      prisma.permission.upsert({
        where: { name }, // exige que Permission.name seja único no schema
        update: {},
        create: { name },
      })
    )
  );
  for (const p of createdPerms) permIds[p.name] = p.id;

  // 2) Perfis
  const profiles = [
    {
      name: 'ADMIN',
      // ADMIN recebe todas as permissões
      perms: PERMS,
    },
    {
      name: 'EDITOR',
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

        'documentVersion.create',
        'documentVersion.activate',

        'document.view',
        'catalog.read',

        'dashboard.view',

        'inspection.read',
        'report.read',
        'training.read',
      ],
    },
    {
      name: 'VIEWER',
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

        'catalog.read',
        'dashboard.view',

        'inspection.read',
        'report.read',
        'training.read',
      ],
    },
  ];

  // upsert perfis
  const upsertedProfiles = await Promise.all(
    profiles.map((pf) =>
      prisma.profile.upsert({
        where: { name: pf.name }, // exige que Profile.name seja único no schema
        update: {},
        create: { name: pf.name },
      })
    )
  );

  // 3) Relações Perfil-Permissão
  for (const profile of upsertedProfiles) {
    const conf = profiles.find((p) => p.name === profile.name);
    if (!conf) continue;

    await Promise.all(
      conf.perms
        .filter((perm) => permIds[perm]) // defensivo: ignora perm que não existe
        .map((perm) =>
          prisma.profilePermission.upsert({
            // requer @@unique([profileId, permissionId]) no modelo ProfilePermission
            where: {
              profileId_permissionId: {
                profileId: profile.id,
                permissionId: permIds[perm],
              },
            },
            update: {},
            create: {
              profileId: profile.id,
              permissionId: permIds[perm],
            },
          })
        )
    );
  }

  console.log('✅ Seed de permissões e perfis concluído.');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed de permissões/perfis:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
