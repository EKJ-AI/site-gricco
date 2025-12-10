/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

// 👇 Departamentos “genéricos” para um estabelecimento típico
const DEPARTMENTS = [
  {
    name: 'Administração',
    description:
      'Atividades administrativas, com uso de computadores. Riscos principais: ergonômicos (postura, monitores, jornada) e psicossociais.',
    shift: 'Diurno (08:00–17:00)',
    workload: '44h semanais – 5x2',
  },
  {
    name: 'Produção – Linha 1',
    description:
      'Linha de produção com máquinas de corte e prensas. Riscos: ruído, partes móveis, esmagamento, cortes, movimentação de cargas.',
    shift: 'Turnos 06–14 / 14–22',
    workload: '44h semanais – 6x1',
  },
  {
    name: 'Manutenção Mecânica',
    description:
      'Manutenção de máquinas e equipamentos. Riscos: trabalho em altura eventual, ferramentas manuais, esforço físico e contato com partes móveis.',
    shift: 'Diurno com plantões sob demanda',
    workload: '44h semanais – 5x2',
  },
  {
    name: 'Almoxarifado / Estoque',
    description:
      'Recebimento, armazenamento e movimentação de materiais. Riscos: quedas de mesmo nível, movimentação de cargas, empilhadeiras.',
    shift: 'Diurno (08:00–17:00)',
    workload: '44h semanais – 5x2',
  },
  {
    name: 'Limpeza / Conservação',
    description:
      'Limpeza de áreas administrativas e produtivas. Riscos: agentes químicos de limpeza, esforço físico, piso molhado, quedas.',
    shift: 'Escalas variadas (diurno/noturno)',
    workload: '44h semanais – 6x1',
  },
];

/**
 * Cria departamentos padrão para um Establishment específico.
 * Evita duplicar pelo par (establishmentId + name).
 */
async function seedDepartments(establishmentId) {
  console.log('🌱 Seed de departamentos para Establishment:', establishmentId);

  const est = await prisma.establishment.findUnique({
    where: { id: establishmentId },
    select: { id: true, nickname: true, cnpj: true, companyId: true },
  });

  if (!est) {
    console.error('❌ Establishment não encontrado com id =', establishmentId);
    process.exit(1);
  }

  console.log(
    `➡️  Estabelecimento encontrado: nickname="${est.nickname || ''}" CNPJ=${est.cnpj}`,
  );

  for (const d of DEPARTMENTS) {
    // Verifica se já existe departamento com esse nome nesse estabelecimento
    const existing = await prisma.department.findFirst({
      where: {
        establishmentId,
        name: d.name,
      },
      select: { id: true },
    });

    if (existing) {
      console.log(
        `↪️  Departamento "${d.name}" já existe (id=${existing.id}). Pulando...`,
      );
      continue;
    }

    const created = await prisma.department.create({
      data: {
        establishmentId,
        name: d.name,
        description: d.description,
        shift: d.shift,
        workload: d.workload,
        // geoLat / geoLng ficam null
        // isActive fica true (default)
      },
    });

    console.log(`✅ Criado departamento "${created.name}" (id=${created.id})`);
  }

  console.log('🎉 Seed de departamentos concluído!');
}

/**
 * Entrada principal
 * Uso:
 *   node prisma/seedDepartments.js <establishmentId>
 * ou
 *   SEED_ESTABLISHMENT_ID=<id> node prisma/seedDepartments.js
 */
async function main() {
  const establishmentId =
    process.argv[2] || process.env.SEED_ESTABLISHMENT_ID;

  if (!establishmentId) {
    console.error('❌ Você precisa informar o ID do Establishment.');
    console.error('   Uso: node prisma/seedDepartments.js <establishmentId>');
    console.error(
      '   ou defina SEED_ESTABLISHMENT_ID no .env e rode: node prisma/seedDepartments.js',
    );
    process.exit(1);
  }

  try {
    await seedDepartments(establishmentId);
  } catch (err) {
    console.error('❌ Seed de departamentos falhou:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
