import prisma from '../../../../prisma/client.js';
import logger from '../../../utils/logger.js';

// Util: cria/obtém CNAE por code
export async function getOrCreateCnaeByCode(code, title = null) {
  if (!code) return null;
  const existing = await prisma.cNAE.findUnique({ where: { code } });
  if (existing) return existing;
  // título opcional; se não vier, salva code como title temporariamente
  return prisma.cNAE.create({ data: { code, title: title || code } });
}

// Calcula principal: maior riskLevel; se empate, menor code (estável)
function choosePrincipalCnae(cnaesWithRisk = []) {
  if (!Array.isArray(cnaesWithRisk) || cnaesWithRisk.length === 0) return { mainCnae: null, maxRisk: null };
  const normalized = cnaesWithRisk.map(x => ({
    code: x.code,
    riskLevel: Number.isFinite(x.riskLevel) ? x.riskLevel : null
  }));

  // define maior risco; se todos null, fica null
  const filtered = normalized.filter(x => x.riskLevel != null);
  if (filtered.length === 0) {
    // sem risco informado => não define principal por risco; usa o primeiro como principal
    const firstCode = normalized.find(x => x.code)?.code ?? null;
    return { mainCnae: firstCode, maxRisk: null };
  }

  const maxRisk = Math.max(...filtered.map(x => x.riskLevel));
  const candidates = filtered.filter(x => x.riskLevel === maxRisk).sort((a, b) => (a.code || '').localeCompare(b.code || ''));
  return { mainCnae: candidates[0]?.code || null, maxRisk };
}

/**
 * Recebe um establishmentId e um array de CNAEs:
 *   [{ code: '0111-3/01', title?: '...' , riskLevel?: 1..4 }, ...]
 * Faz "replace": apaga os vínculos antigos e grava os novos, calculando:
 *   - establishment.mainCnae
 *   - establishment.riskLevel (maior risco)
 */
export async function replaceEstablishmentCnaes(establishmentId, cnaes = []) {
  if (!establishmentId) throw new Error('establishmentId is required');

  // normaliza input
  const items = (Array.isArray(cnaes) ? cnaes : [])
    .map(x => ({ code: (x.code || '').trim(), title: x.title || null, riskLevel: Number.isFinite(+x.riskLevel) ? +x.riskLevel : null }))
    .filter(x => x.code);

  // resolve cnaeIds
  const pairs = [];
  for (const it of items) {
    const c = await getOrCreateCnaeByCode(it.code, it.title);
    pairs.push({ cnaeId: c.id, code: c.code, riskLevel: it.riskLevel });
  }

  // recalcula principal + maior risco
  const { mainCnae, maxRisk } = choosePrincipalCnae(pairs.map(p => ({ code: p.code, riskLevel: p.riskLevel })));

  // transação: replace + atualizar establishment
  const result = await prisma.$transaction(async (tx) => {
    // apaga vínculos atuais
    await tx.establishmentCNAE.deleteMany({ where: { establishmentId } });
    // recria vínculos com riskLevel
    if (pairs.length > 0) {
      await tx.establishmentCNAE.createMany({
        data: pairs.map(p => ({
          establishmentId,
          cnaeId: p.cnaeId,
          riskLevel: p.riskLevel ?? null
        }))
      });
    }
    // atualiza establishment (mainCnae + riskLevel)
    const updatedEstab = await tx.establishment.update({
      where: { id: establishmentId },
      data: {
        mainCnae: mainCnae,
        riskLevel: maxRisk ?? null
      }
    });
    return updatedEstab;
  });

  logger.info(`[CNAE] Estab=${establishmentId} atualizado • mainCnae=${result.mainCnae} • riskLevel=${result.riskLevel ?? '-'}`);
  return result;
}
