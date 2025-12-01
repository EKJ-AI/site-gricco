/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * kind:
 *  - MAIN    = documentos-mãe (programas, planos, laudos principais)
 *  - EVIDENCE = evidências e registros (listas, exames, medições, etc.)
 */
const DOCUMENT_TYPES = [
  // =========================
  // PRINCIPAIS (MAIN)
  // =========================
  {
    name: 'PGR – Programa de Gerenciamento de Riscos',
    kind: 'MAIN',
    description:
      'Programa de Gerenciamento de Riscos ocupacionais conforme NR 1.',
  },
  {
    name: 'Inventário de Riscos Ocupacionais',
    kind: 'MAIN',
    description:
      'Inventário de perigos e fatores de risco ocupacionais integrante do PGR.',
  },
  {
    name: 'Plano de Ação do PGR',
    kind: 'MAIN',
    description:
      'Plano de ação com medidas de prevenção, prazos e responsáveis do PGR.',
  },
  {
    name: 'PCMSO – Programa de Controle Médico de Saúde Ocupacional',
    kind: 'MAIN',
    description:
      'Programa médico-ocupacional conforme NR 7, com diretrizes e cronograma.',
  },
  {
    name: 'LTCAT – Laudo Técnico das Condições Ambientais de Trabalho',
    kind: 'MAIN',
    description:
      'Laudo técnico das condições ambientais para fins previdenciários.',
  },
  {
    name: 'PPP – Perfil Profissiográfico Previdenciário',
    kind: 'MAIN',
    description:
      'Documento histórico-laboral do trabalhador com registros ambientais e de saúde.',
  },
  {
    name: 'PCA – Programa de Conservação Auditiva',
    kind: 'MAIN',
    description:
      'Programa de conservação auditiva para trabalhadores expostos a ruído.',
  },
  {
    name: 'PPR – Programa de Proteção Respiratória',
    kind: 'MAIN',
    description:
      'Programa de proteção respiratória para exposição a agentes químicos/particulados.',
  },
  {
    name: 'AET – Análise Ergonômica do Trabalho',
    kind: 'MAIN',
    description:
      'Relatório de análise ergonômica conforme diretrizes da NR 17.',
  },
  {
    name: 'PCMAT – Programa de Condições e Meio Ambiente de Trabalho na Construção',
    kind: 'MAIN',
    description:
      'Programa específico para a indústria da construção, conforme NR 18 (quando aplicável).',
  },
  {
    name: 'Plano de Atendimento a Emergências',
    kind: 'MAIN',
    description:
      'Plano de resposta a emergências e abandono de área, conforme NRs 20, 23, 33, 35.',
  },
  {
    name: 'Programa de Gestão de Espaços Confinados',
    kind: 'MAIN',
    description:
      'Programa/Procedimentos de gestão para espaços confinados (NR 33).',
  },
  {
    name: 'Programa de Trabalho em Altura',
    kind: 'MAIN',
    description:
      'Programa/Procedimentos para atividades em altura conforme NR 35.',
  },
  {
    name: 'Política e Sistema de Gestão de SST',
    kind: 'MAIN',
    description:
      'Documento de política e diretrizes do sistema de gestão de saúde e segurança.',
  },

  // =========================
  // EVIDÊNCIAS (EVIDENCE)
  // =========================

  // Treinamentos
  {
    name: 'Registro de Treinamento / Lista de Presença',
    kind: 'EVIDENCE',
    description:
      'Listas de presença e registros de participação em treinamentos de SST.',
  },
  {
    name: 'Certificado Individual de Treinamento',
    kind: 'EVIDENCE',
    description:
      'Certificados individuais de conclusão de treinamentos exigidos pelas NRs.',
  },
  {
    name: 'Registro de Reciclagem de Treinamento',
    kind: 'EVIDENCE',
    description:
      'Registros de reciclagens periódicas de treinamentos obrigatórios.',
  },

  // Saúde ocupacional
  {
    name: 'ASO – Atestado de Saúde Ocupacional',
    kind: 'EVIDENCE',
    description:
      'Atestados (admissional, periódico, retorno, mudança de risco, demissional) do PCMSO.',
  },
  {
    name: 'Resultado de Exames Complementares',
    kind: 'EVIDENCE',
    description:
      'Relatórios e laudos de exames complementares (audiometria, espirometria, RX etc.).',
  },
  {
    name: 'Relatório Anual do PCMSO',
    kind: 'EVIDENCE',
    description:
      'Relatórios anuais consolidados do PCMSO conforme NR 7.',
  },
  {
    name: 'Comunicação de Acidente de Trabalho – CAT',
    kind: 'EVIDENCE',
    description:
      'Comunicações de acidente de trabalho emitidas (CAT).',
  },
  {
    name: 'Comprovante de Vacinação / Campanha',
    kind: 'EVIDENCE',
    description:
      'Comprovantes e registros de campanhas de vacinação ocupacional.',
  },

  // EPI / Segurança Operacional
  {
    name: 'Registro de Entrega de EPI',
    kind: 'EVIDENCE',
    description:
      'Fichas ou registros de entrega e recebimento de EPI pelos trabalhadores.',
  },
  {
    name: 'Checklist de Inspeção de EPI',
    kind: 'EVIDENCE',
    description:
      'Registros de inspeção e avaliação de EPIs.',
  },
  {
    name: 'Checklist de Inspeção de Segurança',
    kind: 'EVIDENCE',
    description:
      'Checklists de inspeções rotineiras ou periódicas de segurança.',
  },
  {
    name: 'Relatório de Inspeção de Segurança',
    kind: 'EVIDENCE',
    description:
      'Relatórios consolidados de inspeções de segurança em áreas/atividades.',
  },
  {
    name: 'Relatório de Investigação de Acidente / Incidente',
    kind: 'EVIDENCE',
    description:
      'Relatórios de análise e investigação de acidentes e quase-acidentes.',
  },
  {
    name: 'Registro de Simulado de Emergência',
    kind: 'EVIDENCE',
    description:
      'Registros, atas e evidências de simulados de emergência e abandono.',
  },

  // Higiene Ocupacional / Monitoramento
  {
    name: 'Laudo / Relatório de Higiene Ocupacional',
    kind: 'EVIDENCE',
    description:
      'Relatórios de avaliações ambientais de agentes físicos, químicos e biológicos.',
  },
  {
    name: 'Relatório de Dosimetria de Ruído',
    kind: 'EVIDENCE',
    description:
      'Relatórios de dosimetria e medições de exposição a ruído.',
  },
  {
    name: 'Relatório de Medições de Agentes Químicos',
    kind: 'EVIDENCE',
    description:
      'Relatórios de medições de agentes químicos (poeiras, gases, vapores, etc.).',
  },
  {
    name: 'Relatório de Medições de Iluminância',
    kind: 'EVIDENCE',
    description:
      'Relatórios de medições de iluminação em postos de trabalho.',
  },
  {
    name: 'Relatório de Medições de Calor (IBUTG)',
    kind: 'EVIDENCE',
    description:
      'Relatórios de avaliações de estresse térmico (IBUTG).',
  },
  {
    name: 'Certificado de Calibração de Equipamentos de Medição',
    kind: 'EVIDENCE',
    description:
      'Certificados de calibração de equipamentos usados em avaliações ambientais.',
  },

  // Ergonomia
  {
    name: 'Relatório / Follow-up Ergonômico',
    kind: 'EVIDENCE',
    description:
      'Registros de acompanhamentos, adequações e verificações pós-AET.',
  },

  // Terceiros / contratadas
  {
    name: 'Documentos de SST de Contratadas',
    kind: 'EVIDENCE',
    description:
      'PGR, PCMSO, LTCAT e demais documentos de SST de empresas contratadas.',
  },
  {
    name: 'Registros de Integração de SST de Terceiros',
    kind: 'EVIDENCE',
    description:
      'Registros de integração, treinamentos e autorizações de trabalho para terceiros.',
  },

  // Outros registros
  {
    name: 'Evidência Fotográfica / Registros Fotográficos',
    kind: 'EVIDENCE',
    description:
      'Fotos e registros visuais usados como evidência de inspeções e condições de trabalho.',
  },
];

async function main() {
  for (const t of DOCUMENT_TYPES) {
    // tenta achar pelo nome
    const existing = await prisma.documentType.findFirst({
      where: { name: t.name },
    });

    if (existing) {
      // atualiza descrição e kind
      await prisma.documentType.update({
        where: { id: existing.id },
        data: {
          description: t.description,
          kind: t.kind,
        },
      });
    } else {
      // cria novo
      await prisma.documentType.create({
        data: {
          name: t.name,
          description: t.description,
          kind: t.kind,
        },
      });
    }
  }

  console.log('✅ Seed de tipos de documentos SST concluído.');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed de tipos de documentos:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
