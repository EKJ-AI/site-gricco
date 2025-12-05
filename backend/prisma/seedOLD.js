import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function seedPermissions() {
  console.log('✨ Upserting permissões...');
  const permissionsData = [
    { name: 'user.create', description: 'Pode criar usuários' },
    { name: 'user.read', description: 'Pode visualizar usuários' },
    { name: 'user.update', description: 'Pode editar usuários' },
    { name: 'user.delete', description: 'Pode excluir usuários' },
    { name: 'profile.manage', description: 'Pode gerenciar perfis' },
    { name: 'permission.manage', description: 'Pode gerenciar permissões' },
    { name: 'logs.read', description: 'Pode ver logs de auditoria' },
    { name: 'read:audit', description: 'Pode ler logs de auditoria' }
  ];

  const result = await Promise.all(
    permissionsData.map(data =>
      prisma.permission.upsert({
        where: { name: data.name },
        update: {},
        create: data,
      })
    )
  );

  console.log(`✅ ${result.length} permissões atualizadas/criadas`);
  return result;
}

async function seedAdminProfile(permissions) {
  console.log('✨ Upserting perfil Admin...');
  
  const adminProfile = await prisma.profile.upsert({
    where: { name: 'Admin' },
    update: {},
    create: {
      name: 'Admin',
      description: 'Perfil administrativo com todas as permissões',
    },
  });

  console.log(`✅ Perfil Admin ID: ${adminProfile.id}`);

  console.log('🔗 Associando permissões ao Admin...');
  for (const perm of permissions) {
    await prisma.profilePermission.upsert({
      where: {
        profileId_permissionId: {
          profileId: adminProfile.id,
          permissionId: perm.id,
        },
      },
      update: {},
      create: {
        profileId: adminProfile.id,
        permissionId: perm.id,
      },
    });
  }

  console.log(`✅ Todas permissões associadas ao Admin`);
  return adminProfile;
}

async function seedAdminUser(adminProfile) {
  console.log('✨ Criando usuário Admin...');
  
  const adminEmail = process.env.ADMIN_EMAIL?.trim() || 'admin@admin.com';
  const adminPassword = process.env.ADMIN_PASSWORD?.trim() || 'admin123';

  if (adminPassword.length < 6) {
    console.warn(`⚠️ A senha de admin está fraca (<6). Recomende usar .env para configurar melhor.`);
  }

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const user = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: 'Administrador',
      email: adminEmail,
      passwordHash,
      profileId: adminProfile.id,
    },
  });

  console.log(`✅ Usuário Admin criado/atualizado: ${user.email}`);
}

async function main() {
  console.log('🌱 Iniciando Seed inicial iMAX...');

  try {
    const permissions = await seedPermissions();
    const adminProfile = await seedAdminProfile(permissions);
    await seedAdminUser(adminProfile);

    console.log('✅ Seed concluído com sucesso!');
  } catch (error) {
    console.error('❌ Seed falhou:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
