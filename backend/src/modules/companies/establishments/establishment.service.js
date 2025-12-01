// src/modules/companies/establishments/establishment.service.js
import prisma from '../../../../prisma/client.js';
import logger from '../../../utils/logger.js';

/**
 * Faz o merge entre riscos informados pelo usuário (riskLevel) e o risco oficial
 * do catálogo NR-1 (CNAE.nrRisk). Prioridade:
 * 1) riskLevel informado no payload (se for 1..4)
 * 2) CNAE.nrRisk do catálogo (se existir)
 * 3) null
 */
export async function computeMainCnaeAndRisk(cnaesInput = []) {
  const norm = (Array.isArray(cnaesInput) ? cnaesInput : [])
    .map((x) => ({
      code: String(x?.code || '').trim(),
      riskLevel: x?.riskLevel,
    }))
    .filter((x) => x.code);

  if (norm.length === 0) {
    return { mainCnae: null, riskLevel: null, resolved: [] };
  }

  // Busca riscos oficiais do catálogo para os códigos informados
  const codes = [...new Set(norm.map((x) => x.code))];
  const catalog = await prisma.cNAE.findMany({
    where: { code: { in: codes } },
    select: { code: true, nrRisk: true, title: true },
  });
  const byCode = new Map(catalog.map((c) => [c.code, c]));

  // Resolve risco efetivo de cada item
  const resolved = norm.map((it) => {
    const cat = byCode.get(it.code);
    const payloadRisk = Number.isFinite(+it.riskLevel) ? +it.riskLevel : null;
    const resolvedRisk =
      payloadRisk && payloadRisk >= 1 && payloadRisk <= 4
        ? payloadRisk
        : Number.isFinite(cat?.nrRisk)
        ? cat.nrRisk
        : null;

    return {
      code: it.code,
      title: cat?.title || null,
      riskLevel: resolvedRisk, // 1..4 ou null
      catalogRisk: cat?.nrRisk ?? null,
    };
  });

  // Define principal: maior risco; empate → menor código
  const withRisk = resolved.filter((r) => Number.isFinite(r.riskLevel));
  if (withRisk.length === 0) {
    // Sem risco definido para nenhum → principal por menor código mesmo
    const main = [...resolved].sort((a, b) => a.code.localeCompare(b.code))[0];
    return { mainCnae: main?.code || null, riskLevel: null, resolved };
  }

  const maxRisk = Math.max(...withRisk.map((r) => r.riskLevel));
  const candidates = withRisk
    .filter((r) => r.riskLevel === maxRisk)
    .sort((a, b) => a.code.localeCompare(b.code));

  return {
    mainCnae: candidates[0]?.code || null,
    riskLevel: maxRisk,
    resolved,
  };
}

/**
 * Sincroniza a tabela de junção EstablishmentCNAE com base nos CNAEs recebidos.
 * Remove os que não estão mais no payload e insere os novos.
 * Agora também persiste o riskLevel efetivo na junção.
 */
export async function syncEstablishmentCnaes(tx, establishmentId, cnaesInput = []) {
  const norm = (Array.isArray(cnaesInput) ? cnaesInput : [])
    .map((x) => ({
      code: String(x?.code || '').trim(),
      riskLevel: Number.isFinite(+x?.riskLevel) ? +x.riskLevel : null,
    }))
    .filter((x) => x.code);

  // Se vierem duplicados no payload, o último vence
  const byCode = new Map();
  for (const item of norm) {
    byCode.set(item.code, item);
  }

  const codes = [...byCode.keys()];

  const existing = await tx.establishmentCNAE.findMany({
    where: { establishmentId },
    select: { id: true, cnae: { select: { code: true } } },
  });

  const existingCodes = new Set(existing.map((e) => e.cnae.code));
  const toDelete = existing
    .filter((e) => !codes.includes(e.cnae.code))
    .map((e) => e.id);
  const toInsertCodes = codes.filter((c) => !existingCodes.has(c));

  // Resolve IDs dos CNAEs a inserir
  let toInsert = [];
  if (toInsertCodes.length) {
    const catalog = await tx.cNAE.findMany({
      where: { code: { in: toInsertCodes } },
      select: { id: true, code: true },
    });
    const idByCode = new Map(catalog.map((c) => [c.code, c.id]));

    toInsert = toInsertCodes
      .map((code) => {
        const cnaeId = idByCode.get(code);
        if (!cnaeId) return null;
        const { riskLevel } = byCode.get(code) || {};
        return {
          cnaeId,
          code,
          riskLevel: Number.isFinite(+riskLevel) ? +riskLevel : null,
        };
      })
      .filter(Boolean);
  }

  // apply changes
  if (toDelete.length) {
    await tx.establishmentCNAE.deleteMany({ where: { id: { in: toDelete } } });
  }

  for (const row of toInsert) {
    await tx.establishmentCNAE.create({
      data: {
        establishmentId,
        cnaeId: row.cnaeId,
        riskLevel: row.riskLevel,
      },
    });
  }

  return { removed: toDelete.length, inserted: toInsert.length };
}

/**
 * CORE: aplica CNAEs usando um transaction client EXISTENTE (tx).
 * Usar esta função quando você já estiver dentro de prisma.$transaction(...).
 */
export async function applyCnaesToEstablishmentInTx(tx, establishmentId, cnaesInput = []) {
  const { mainCnae, riskLevel, resolved } = await computeMainCnaeAndRisk(cnaesInput);

  // Usa a lista resolvida (com riskLevel efetivo) para sincronizar a tabela de junção
  await syncEstablishmentCnaes(tx, establishmentId, resolved);

  await tx.establishment.update({
    where: { id: establishmentId },
    data: {
      mainCnae,
      riskLevel: Number.isFinite(+riskLevel) ? +riskLevel : null,
    },
  });

  logger.info(
    `[ESTABLISHMENT] CNAEs aplicados → establishmentId=${establishmentId} mainCnae=${
      mainCnae || '-'
    } / riskLevel=${riskLevel ?? '-'}`,
  );

  return { mainCnae, riskLevel };
}

/**
 * Versão "autônoma": abre a própria transação.
 * Útil quando você quiser atualizar CNAEs fora de qualquer outra transação.
 */
export async function applyCnaesToEstablishment(establishmentId, cnaesInput = []) {
  return prisma.$transaction(async (tx) =>
    applyCnaesToEstablishmentInTx(tx, establishmentId, cnaesInput),
  );
}
