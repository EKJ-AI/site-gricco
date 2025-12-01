// src/modules/companies/company.service.js
import prisma from '../../../prisma/client.js';
import logger from '../../utils/logger.js';
import {
  fetchCNPJFromBrasilAPI,
  fetchCEPFromViaCEP,
} from '../../infra/external/brasilapi.service.js';
import { applyCnaesToEstablishmentInTx } from './establishments/establishment.service.js';

/**
 * Normaliza CNAE numérico para "xxxx-x/xx" se possível.
 */
function normalizeCnae(code) {
  if (!code) return null;
  const digits = String(code).replace(/\D/g, '');
  if (digits.length !== 7) return String(code);
  return `${digits.slice(0, 4)}-${digits.slice(4, 5)}/${digits.slice(5, 7)}`;
}

/**
 * Cria a Company e, opcionalmente, cria a Estabelecimento MATRIZ automaticamente.
 * - Enriquecimento por CNPJ (BrasilAPI/OpenCNPJ)
 * - Enriquecimento por CEP (ViaCEP) se não vier endereço completo
 * - Sincroniza CNAEs e define mainCnae/riskLevel pelo maior risco
 *
 * Params:
 *  - payload: dados da empresa
 *    {
 *      cnpj, legalName?, tradeName?, startAt?,
 *      companySize?, taxRegime?, fiscalEmail?, phone?, website?,
 *      street?, number?, complement?, district?, city?, state?, zipCode?, ibgeCityCode?,
 *      tenantId?,
 *      createHeadquarter?: boolean,
 *      headquarter?: {
 *        nickname?, cnpj?, street?, ... , cnaes?: [{ code, title?, riskLevel? }]
 *      },
 *      cnaes?: [{ code, title?, riskLevel? }] // opcional: CNAEs no nível da company para repassar à matriz
 *    }
 *  - userId: para auditoria futura
 */
export async function createCompanyWithHeadquarter(payload, userId) {
  logger.info('[COMPANY] createCompanyWithHeadquarter:start');

  return prisma.$transaction(async (tx) => {
    const {
      cnpj,
      legalName,
      tradeName,
      startAt,
      companySize,
      taxRegime,
      fiscalEmail,
      phone,
      website,
      street,
      number,
      complement,
      district,
      city,
      state,
      zipCode,
      ibgeCityCode,
      createHeadquarter = true,
      headquarter = {},
      cnaes,
      tenantId,
    } = payload || {};

    if (!cnpj) {
      logger.warn('[COMPANY] tentativa de criação sem CNPJ');
      throw new Error('CNPJ is required for company creation');
    }

    logger.info(`[COMPANY] criando empresa para CNPJ=${cnpj}`);

    // 1) Enriquecer Company pelo CNPJ (não bloqueia criação se falhar)
    let enriched = null;
    try {
      enriched = await fetchCNPJFromBrasilAPI(cnpj);
      logger.info('[COMPANY] enrichment CNPJ concluído com sucesso');
    } catch (e) {
      logger.warn(
        `[COMPANY] falha ao enriquecer CNPJ ${cnpj}: ${e?.message}`,
      );
    }

    // 2) Monta dados finais da Company
    const companyData = {
      cnpj: enriched?.cnpj || cnpj,
      legalName: legalName ?? enriched?.legalName ?? '',
      tradeName: tradeName ?? enriched?.tradeName ?? null,
      startAt: startAt
        ? new Date(startAt)
        : enriched?.startAt
        ? new Date(enriched.startAt)
        : null,
      companySize:
        companySize ??
        enriched?.porteDescription ??
        enriched?.porte ??
        null,
      taxRegime: taxRegime ?? enriched?.taxRegime ?? null,
      fiscalEmail: fiscalEmail ?? enriched?.fiscalEmail ?? null,
      phone: phone ?? enriched?.phone ?? null,
      website: website ?? null,
      street: street ?? enriched?.street ?? null,
      number: number ?? enriched?.number ?? null,
      complement: complement ?? enriched?.complement ?? null,
      district: district ?? enriched?.district ?? null,
      city: city ?? enriched?.city ?? null,
      state: state ?? enriched?.state ?? null,
      zipCode: zipCode ?? enriched?.zipCode ?? null,
      // ibgeCityCode será tratado logo abaixo
    };

    if (tenantId !== undefined && tenantId !== null) {
      companyData.tenantId = tenantId;
    }

    // 2.1) ibgeCityCode SEMPRE como string ou null (Prisma espera String)
    const rawIbge =
      ibgeCityCode ??
      enriched?.ibgeCityCode ??
      null;

    companyData.ibgeCityCode =
      rawIbge === null ||
      rawIbge === undefined ||
      rawIbge === ''
        ? null
        : String(rawIbge);

    // 2.2) Se faltou cidade/estado e temos CEP → ViaCEP
    if ((!companyData.city || !companyData.state) && companyData.zipCode) {
      try {
        const cepData = await fetchCEPFromViaCEP(companyData.zipCode);
        if (cepData) {
          companyData.street = companyData.street ?? cepData.street;
          companyData.district = companyData.district ?? cepData.district;
          companyData.city = companyData.city ?? cepData.city;
          companyData.state = companyData.state ?? cepData.state;

          if (
            !companyData.ibgeCityCode &&
            cepData.ibgeCityCode !== undefined &&
            cepData.ibgeCityCode !== null &&
            cepData.ibgeCityCode !== ''
          ) {
            companyData.ibgeCityCode = String(cepData.ibgeCityCode);
          }
        }
        logger.info('[COMPANY] enrichment CEP concluído (se aplicável)');
      } catch (e) {
        logger.warn(
          `[COMPANY] falha ViaCEP para CEP ${companyData.zipCode}: ${e?.message}`,
        );
      }
    }

    logger.info('[COMPANY] chamando tx.company.create');
    const company = await tx.company.create({ data: companyData });
    logger.info(`[COMPANY] criada company.id=${company.id}`);

    // 3) Cria MATRIZ automaticamente (se solicitado)
    let head = null;

    if (createHeadquarter) {
      const h = headquarter || {};
      const estCnpj = h.cnpj || company.cnpj;

      logger.info(
        `[HQ] iniciando criação da matriz (CNPJ=${estCnpj || 'herdado'})`,
      );

      let estEnriched = null;
      if (estCnpj) {
        try {
          estEnriched = await fetchCNPJFromBrasilAPI(estCnpj);
          logger.info('[HQ] enrichment CNPJ matriz concluído (se aplicável)');
        } catch (e) {
          logger.warn(
            `[HQ] falha ao enriquecer CNPJ ${estCnpj}: ${e?.message}`,
          );
        }
      }

      const estDataBase = {
        companyId: company.id,
        nickname: h.nickname ?? 'Matriz',
        cnpj: estCnpj,
        isHeadquarter: true,
        street: h.street ?? estEnriched?.street ?? company.street ?? null,
        number: h.number ?? estEnriched?.number ?? company.number ?? null,
        complement:
          h.complement ?? estEnriched?.complement ?? company.complement ?? null,
        district:
          h.district ?? estEnriched?.district ?? company.district ?? null,
        city: h.city ?? estEnriched?.city ?? company.city ?? null,
        state: h.state ?? estEnriched?.state ?? company.state ?? null,
        zipCode: h.zipCode ?? estEnriched?.zipCode ?? company.zipCode ?? null,
        mainCnae: null,
        riskLevel: null,
      };

      // Complemento via CEP se faltou cidade/estado
      if ((!estDataBase.city || !estDataBase.state) && estDataBase.zipCode) {
        try {
          const cepData = await fetchCEPFromViaCEP(estDataBase.zipCode);
          if (cepData) {
            estDataBase.street = estDataBase.street ?? cepData.street;
            estDataBase.district =
              estDataBase.district ?? cepData.district;
            estDataBase.city = estDataBase.city ?? cepData.city;
            estDataBase.state = estDataBase.state ?? cepData.state;
          }
          logger.info('[HQ] enrichment CEP matriz concluído (se aplicável)');
        } catch (e) {
          logger.warn(
            `[HQ] falha ViaCEP para CEP ${estDataBase.zipCode}: ${e?.message}`,
          );
        }
      }

      logger.info('[HQ] chamando tx.establishment.create');
      head = await tx.establishment.create({ data: estDataBase });
      logger.info(`[HQ] matriz criada establishment.id=${head.id}`);

      // 3.1) CNAEs da matriz (prioridade: headquarter.cnaes > payload.cnaes > enriquecido do CNPJ)
      let cnaesForHead =
        Array.isArray(h.cnaes) && h.cnaes.length
          ? h.cnaes
          : Array.isArray(cnaes) && cnaes.length
          ? cnaes
          : estEnriched
          ? [
              ...(estEnriched.mainCnae
                ? [
                    {
                      code: normalizeCnae(estEnriched.mainCnae),
                      title: estEnriched.mainCnaeDesc ?? '',
                    },
                  ]
                : []),
              ...(Array.isArray(estEnriched.secondaryCnaes)
                ? estEnriched.secondaryCnaes.map((s) => ({
                    code: normalizeCnae(s.code),
                    title: s.title || '',
                  }))
                : []),
            ]
          : [];

      cnaesForHead = (cnaesForHead || [])
        .map((x) => ({
          code: normalizeCnae(x.code),
          title: x.title || '',
          riskLevel: x.riskLevel ?? null,
        }))
        .filter((x) => x.code);

      if (cnaesForHead.length) {
        logger.info(
          `[HQ] aplicando ${cnaesForHead.length} CNAEs na matriz (via applyCnaesToEstablishmentInTx)`,
        );
        await applyCnaesToEstablishmentInTx(tx, head.id, cnaesForHead);
      }
    }

    logger.info(
      `[COMPANY] criada ${company.id} por user=${userId || '-'} com matriz=${
        !!head
      }`,
    );

    return { company, headquarter: head || null };
  });
}
