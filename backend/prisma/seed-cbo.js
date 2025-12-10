// prisma/seed-cbo.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Ocupações-chave de SST / SESMT (NR-4)
const CBO_SST = [
  {
    code: '2251-40',
    title: 'Médico do trabalho',
  },
  {
    code: '2149-15',
    title: 'Engenheiro de segurança do trabalho',
  },
  {
    code: '3516-05',
    title: 'Técnico de segurança do trabalho',
  },
  {
    code: '2235-30',
    title: 'Enfermeiro do trabalho',
  },
  {
    code: '3222-15',
    title: 'Técnico de enfermagem do trabalho',
  },
];

async function main() {
  for (const cbo of CBO_SST) {
    await prisma.cBO.upsert({
      where: { code: cbo.code }, // precisa de @unique em code
      update: { title: cbo.title },
      create: {
        code: cbo.code,
        title: cbo.title,
      },
    });
  }

  console.log(`Seed de CBO (SST) concluído. Registros: ${CBO_SST.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
