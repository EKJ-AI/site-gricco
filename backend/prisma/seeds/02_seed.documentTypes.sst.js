// prisma/seed.documentTypes.sst.js
// Seed de tipos de documentos de SST para a tabela DocumentType

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Lista de tipos de documento de SST
 * Nomes em linha com práticas de mercado, NRs e legislação previdenciária.
 * Você pode complementar depois, mas essa base já atende muito bem PGR/PCMSO/eSocial.
 */
const documentTypes = [
  // Programas e documentos principais
  {
    name: 'PGR - Programa de Gerenciamento de Riscos (NR-01)',
    description:
      'Programa de Gerenciamento de Riscos, contendo Inventário de Riscos e Plano de Ação, conforme NR-01.',
  },
  {
    name: 'Inventário de Riscos (PGR)',
    description:
      'Inventário de Riscos ocupacionais por estabelecimento, integrante do PGR, com identificação, avaliação e classificação dos riscos.',
  },
  {
    name: 'Plano de Ação de SST (PGR)',
    description:
      'Plano de Ação associado ao PGR, com medidas de prevenção, prazos, responsáveis e acompanhamento.',
  },
  {
    name: 'PCMSO - Programa de Controle Médico de Saúde Ocupacional (NR-07)',
    description:
      'Programa de Controle Médico de Saúde Ocupacional, com diretrizes de exames e acompanhamento da saúde dos trabalhadores, conforme NR-07.',
  },
  {
    name: 'LTCAT - Laudo Técnico de Condições Ambientais do Trabalho',
    description:
      'Laudo Técnico de Condições Ambientais do Trabalho, base para enquadramento previdenciário e documentos como o PPP.',
  },
  {
    name: 'AET - Análise Ergonômica do Trabalho (NR-17)',
    description:
      'Análise Ergonômica do Trabalho, com avaliação das condições ergonômicas de postos e atividades, conforme NR-17.',
  },

  // ASOs (PCMSO)
  {
    name: 'ASO - Admissional',
    description:
      'Atestado de Saúde Ocupacional referente a exame admissional, emitido no contexto do PCMSO.',
  },
  {
    name: 'ASO - Periódico',
    description:
      'Atestado de Saúde Ocupacional referente a exame periódico, emitido no contexto do PCMSO.',
  },
  {
    name: 'ASO - Retorno ao Trabalho',
    description:
      'Atestado de Saúde Ocupacional referente a exame de retorno ao trabalho após afastamento, conforme NR-07.',
  },
  {
    name: 'ASO - Mudança de Função',
    description:
      'Atestado de Saúde Ocupacional referente a exame de mudança de função, quando houver alteração de risco.',
  },
  {
    name: 'ASO - Demissional',
    description:
      'Atestado de Saúde Ocupacional referente a exame demissional, emitido na rescisão do contrato de trabalho.',
  },

  // Laudos de insalubridade / periculosidade
  {
    name: 'Laudo de Insalubridade',
    description:
      'Laudo técnico de insalubridade, com enquadramento e percentuais conforme legislação trabalhista.',
  },
  {
    name: 'Laudo de Periculosidade',
    description:
      'Laudo técnico de periculosidade, com análise de exposição a agentes perigosos, conforme legislação trabalhista.',
  },

  // EPI / EPC
  {
    name: 'Ficha de EPI - Entrega e Controle',
    description:
      'Ficha de entrega e controle de Equipamentos de Proteção Individual, com registro de CA e ciência do trabalhador, conforme NR-06.',
  },
  {
    name: 'Registro de Treinamento de EPI (NR-06)',
    description:
      'Registro de treinamento dos trabalhadores quanto ao uso, guarda e conservação de EPIs, conforme NR-06.',
  },

  // CIPA / Representação dos Trabalhadores
  {
    name: 'Ata de Constituição da CIPA',
    description:
      'Ata de constituição da Comissão Interna de Prevenção de Acidentes ou Comissão de Representantes, conforme NR-05.',
  },
  {
    name: 'Ata de Reunião de CIPA',
    description:
      'Ata de reunião periódica da CIPA, contendo discussões, recomendações e acompanhamento de ações.',
  },
  {
    name: 'Treinamento de CIPA (NR-05) - Lista de Presença / Certificados',
    description:
      'Registros de presença e certificados de treinamento de CIPA, conforme conteúdo mínimo da NR-05.',
  },

  // Permissões de Trabalho / APR
  {
    name: 'APR - Análise Preliminar de Risco',
    description:
      'Análise Preliminar de Risco para atividades específicas, com identificação de perigos, riscos e medidas de controle.',
  },
  {
    name: 'Permissão de Trabalho em Altura (NR-35)',
    description:
      'Permissão formal para execução de atividades em altura, contendo análise de risco e medidas de proteção, conforme NR-35.',
  },
  {
    name: 'Permissão de Trabalho em Espaço Confinado (NR-33)',
    description:
      'Permissão de Entrada e Trabalho em Espaço Confinado, com bloqueios, testes de atmosfera e equipe habilitada, conforme NR-33.',
  },
  {
    name: 'Permissão de Trabalho a Quente',
    description:
      'Permissão para atividades com risco de fogo/faíscas (solda, corte, etc.), com controles específicos.',
  },
  {
    name: 'Permissão de Trabalho em Instalações Elétricas (NR-10)',
    description:
      'Permissão para intervenções em instalações elétricas, conforme requisitos da NR-10.',
  },

  // Planos e procedimentos
  {
    name: 'Plano de Atendimento a Emergências',
    description:
      'Plano de Atendimento a Emergências, incluindo cenários de risco, procedimentos, brigada e meios de resposta.',
  },
  {
    name: 'Procedimentos Operacionais / Instruções de Segurança',
    description:
      'Procedimentos operacionais e instruções específicas de segurança para atividades críticas.',
  },
  {
    name: 'Ordem de Serviço de Segurança do Trabalho',
    description:
      'Ordem de Serviço com orientações de segurança específicas para funções/atividades, conforme NR-01.',
  },

  // Treinamentos (NRs principais)
  {
    name: 'Treinamento NR-10 - Segurança em Instalações e Serviços em Eletricidade',
    description:
      'Certificados e registros de treinamento conforme NR-10 (básico/complementar).',
  },
  {
    name: 'Treinamento NR-11 - Transporte, Movimentação, Armazenagem e Manuseio de Materiais',
    description:
      'Registros de treinamento para operação de equipamentos de movimentação de materiais, conforme NR-11.',
  },
  {
    name: 'Treinamento NR-12 - Segurança no Trabalho em Máquinas e Equipamentos',
    description:
      'Certificados e registros de treinamento em segurança em máquinas e equipamentos, conforme NR-12.',
  },
  {
    name: 'Treinamento NR-18 - Indústria da Construção',
    description:
      'Registros de treinamento de segurança na construção civil, conforme NR-18 (quando aplicável).',
  },
  {
    name: 'Treinamento NR-33 - Espaços Confinados',
    description:
      'Certificados e registros de treinamento para trabalhadores autorizados e vigias em espaços confinados, conforme NR-33.',
  },
  {
    name: 'Treinamento NR-35 - Trabalho em Altura',
    description:
      'Certificados e registros de treinamento para trabalho em altura, conforme NR-35.',
  },
  {
    name: 'Treinamento de Brigada de Incêndio',
    description:
      'Certificados e registros de treinamento da brigada de emergência, conforme normas de incêndio estaduais e melhores práticas.',
  },

  // Registros de eventos / inspeções
  {
    name: 'CAT - Comunicação de Acidente de Trabalho',
    description:
      'Registros e comprovantes de envio de Comunicação de Acidente de Trabalho ao INSS.',
  },
  {
    name: 'Registro de Acidentes e Incidentes',
    description:
      'Registros internos de acidentes, incidentes e quase-acidentes, com análise e plano de ação.',
  },
  {
    name: 'Registros de Inspeções de Segurança',
    description:
      'Checklists e relatórios de inspeções de segurança em áreas, equipamentos e processos.',
  },
  {
    name: 'Registros de Simulados de Emergência',
    description:
      'Registros de simulados de evacuação, incêndio ou outras emergências, com avaliação de desempenho.',
  },
  {
    name: 'Registros de DDS / Diálogo Diário de Segurança',
    description:
      'Registros de realização de Diálogos Diários de Segurança ou conversas formais de segurança.',
  },

  // Programas específicos (saúde auditiva, respiratória etc.)
  {
    name: 'PCA - Programa de Conservação Auditiva',
    description:
      'Programa de Conservação Auditiva, contemplando avaliação de ruído, exames audiométricos e medidas de controle.',
  },
  {
    name: 'PPR - Programa de Proteção Respiratória',
    description:
      'Programa de Proteção Respiratória, com seleção de respiradores, testes de vedação e orientações de uso.',
  },

  // eSocial / Previdenciário (apoio)
  {
    name: 'Registros para eSocial - Eventos de SST',
    description:
      'Documentos de suporte para eventos de SST do eSocial (S-2210, S-2220, S-2240), como laudos, ASOs e comunicações.',
  },
  {
    name: 'PPP - Perfil Profissiográfico Previdenciário',
    description:
      'Perfis Profissiográficos Previdenciários emitidos para trabalhadores, com histórico de exposição e informações previdenciárias.',
  },
];

async function main() {
  console.log('Seeding SST Document Types...');

  // Opcional: se você quiser apagar tudo antes (cuidado em produção!)
  // await prisma.documentType.deleteMany();

  // createMany é mais eficiente; skipDuplicates depende de índices únicos,
  // mas aqui ajuda a não quebrar caso rode o seed mais de uma vez.
  await prisma.documentType.createMany({
    data: documentTypes,
    skipDuplicates: true,
  });

  console.log(`Seed concluído. Tipos inseridos: ${documentTypes.length}`);
}

main()
  .catch((e) => {
    console.error('Erro ao executar seed de DocumentType:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
