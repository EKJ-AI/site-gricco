// src/modules/companies/company.controller.js
import prisma from '../../../prisma/client.js';
import { parsePagination } from '../../infra/http/pagination.js';
import { prismaErrorToHttp } from '../../infra/http/prismaError.js';
import { registerAudit } from '../../utils/audit.js';
import { createCompanyWithHeadquarter } from './company.service.js';

function buildCompanyScopeWhere(user, extraWhere = {}) {
  const perms = user?.permissions || [];
  const isGlobalAdmin = perms.includes('system.admin.global');
  const isCompanyAdmin = perms.includes('company.admin');

  // 🔓 Admin Global → sem restrição extra
  if (isGlobalAdmin) {
    return { ...extraWhere };
  }

  // 🔓 Admin de empresa → restringe por createdByUserId
  if (isCompanyAdmin) {
    return {
      ...extraWhere,
      createdByUserId: user.id,
    };
  }

  // ❌ Outros perfis não podem ALTERAR empresas (update/delete)
  // Usa um filtro impossível para não vazar nada
  return {
    ...extraWhere,
    id: '__NO_ACCESS__',
  };
}

// helper pra normalizar CNPJ (só dígitos)
function normalizeCnpj(cnpj) {
  if (!cnpj) return '';
  return String(cnpj).replace(/\D+/g, '');
}

/**
 * 🔽 Auxiliar: desativar estabelecimentos e usuários de portal ao desativar a empresa.
 *
 * NÃO mexe em Employee.isActive.
 * Desativa Users que, após a desativação, não tiverem nenhum vínculo
 * "válido" (Employee ativo em empresa + estabelecimento ativos).
 */
async function cascadeCompanyDeactivation(companyId) {
  await prisma.$transaction(async (tx) => {
    // 1) Desativar todos os estabelecimentos da empresa
    await tx.establishment.updateMany({
      where: { companyId, isActive: true },
      data: { isActive: false },
    });

    // 2) Descobrir todos portalUserIds ligados a Employees dessa empresa
    const employees = await tx.employee.findMany({
      where: {
        companyId,
        portalUserId: { not: null },
      },
      select: { portalUserId: true },
    });

    const portalUserIds = [
      ...new Set(employees.map((e) => e.portalUserId)),
    ];

    if (!portalUserIds.length) return;

    // 3) Para cada usuário, verifica se ainda existe algum vínculo "válido"
    for (const userId of portalUserIds) {
      const remaining = await tx.employee.count({
        where: {
          portalUserId: userId,
          isActive: true,
          company: { isActive: true },
          establishment: { isActive: true },
        },
      });

      if (remaining === 0) {
        await tx.user.update({
          where: { id: userId },
          data: { isActive: false },
        });
      }
    }
  });
}

/**
 * 🔼 Auxiliar: ao reativar empresa, reativar estabelecimentos e usuários de portal
 * baseados em Employees ATIVOS com portalUserId.
 */
async function cascadeCompanyActivation(companyId) {
  await prisma.$transaction(async (tx) => {
    // 1) Reativar todos os estabelecimentos da empresa
    await tx.establishment.updateMany({
      where: { companyId },
      data: { isActive: true },
    });

    // 2) Employees ativos, com portalUserId, em company + establishment ativos
    const employees = await tx.employee.findMany({
      where: {
        companyId,
        isActive: true,
        portalUserId: { not: null },
        company: { isActive: true },
        establishment: { isActive: true },
      },
      select: { portalUserId: true },
    });

    const portalUserIds = [
      ...new Set(employees.map((e) => e.portalUserId)),
    ];

    if (!portalUserIds.length) return;

    await tx.user.updateMany({
      where: { id: { in: portalUserIds } },
      data: { isActive: true },
    });
  });
}

export async function list(req, res) {
  try {
    const { q, status, includeInactive, isActive } = req.query;
    const { skip, take, page, pageSize } = parsePagination(req);

    const perms = req.user?.permissions || [];
    const isGlobalAdmin = perms.includes('system.admin.global');
    const isCompanyAdmin = perms.includes('company.admin');

    const whereSearch = q
      ? {
          OR: [
            {
              cnpj: {
                contains: normalizeCnpj(q),
                mode: 'insensitive',
              },
            },
            { legalName: { contains: q, mode: 'insensitive' } },
            { tradeName: { contains: q, mode: 'insensitive' } },
            { city: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {};

    let whereBase = {};

    if (isGlobalAdmin) {
      // 🔓 Global admin → vê todas
      whereBase = {};
    } else if (isCompanyAdmin) {
      // 🔓 Company admin → apenas empresas criadas por ele
      whereBase = {
        createdByUserId: req.user.id,
      };
    } else {
      // 👇 Leitor comum (company.read sem company.admin)
      // Só enxerga empresas onde é Employee (via portalUserId)
      const empCompanies = await prisma.employee.findMany({
        where: {
          portalUserId: req.user.id,
        },
        select: { companyId: true },
      });

      const companyIds = [
        ...new Set(empCompanies.map((e) => String(e.companyId))),
      ];

      if (!companyIds.length) {
        return res.json({
          success: true,
          data: { total: 0, page, pageSize, items: [] },
        });
      }

      whereBase = {
        id: { in: companyIds },
      };
    }

    // ---------- Filtro de status (NOVA LÓGICA) ----------
    let whereIsActive = {};

    // 1) status = all | active | inactive → tem prioridade
    if (typeof status === 'string') {
      const s = status.toLowerCase();
      if (s === 'active') {
        whereIsActive = { isActive: true };
      } else if (s === 'inactive') {
        whereIsActive = { isActive: false };
      } else if (s === 'all') {
        whereIsActive = {}; // sem filtro
      }
    } else if (typeof isActive !== 'undefined') {
      // 2) isActive explícito (compat legada)
      const v = String(isActive).toLowerCase();
      if (v === 'true' || v === '1') whereIsActive = { isActive: true };
      else if (v === 'false' || v === '0') whereIsActive = { isActive: false };
    } else if (typeof includeInactive !== 'undefined') {
      // 3) includeInactive (legado: true = tudo, false = só ativas)
      const inc = String(includeInactive).toLowerCase();
      const showAll = inc === 'true' || inc === '1';
      whereIsActive = showAll ? {} : { isActive: true };
    } else {
      // 4) default: só ativas
      whereIsActive = { isActive: true };
    }

    const where = {
      ...whereBase,
      ...whereSearch,
      ...whereIsActive,
    };

    const [total, items] = await Promise.all([
      prisma.company.count({ where }),
      prisma.company.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { establishments: true },
      }),
    ]);

    res.json({ success: true, data: { total, page, pageSize, items } });
  } catch (err) {
    const mapped = prismaErrorToHttp(err);
    if (mapped) {
      return res.status(mapped.status).json({ success: false, ...mapped });
    }
    console.error('[COMPANY] list error', err);
    res.status(500).json({ success: false, message: 'Internal error' });
  }
}

export async function getById(req, res) {
  try {
    const { id } = req.params;

    const perms = req.user?.permissions || [];
    const isGlobalAdmin = perms.includes('system.admin.global');
    const isCompanyAdmin = perms.includes('company.admin');

    let where = { id };

    if (isGlobalAdmin) {
      where = { id };
    } else if (isCompanyAdmin) {
      where = {
        id,
        createdByUserId: req.user.id,
      };
    } else {
      where = {
        id,
        employees: {
          some: {
            portalUserId: req.user.id,
          },
        },
      };
    }

    const item = await prisma.company.findFirst({
      where,
      include: {
        establishments: {
          include: { cnaes: { include: { cnae: true } } },
        },
        employees: true,
      },
    });

    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: 'Company not found' });
    }

    res.json({ success: true, data: item });
  } catch (err) {
    const mapped = prismaErrorToHttp(err);
    if (mapped) {
      return res.status(mapped.status).json({ success: false, ...mapped });
    }
    console.error('[COMPANY] getById error', err);
    res.status(500).json({ success: false, message: 'Internal error' });
  }
}

export async function create(req, res) {
  try {
    const body = req.body || {};
    console.log('BODY', body);

    const rawCnpj = body.cnpj ? String(body.cnpj) : '';
    const cnpjDigits = normalizeCnpj(rawCnpj);

    if (!cnpjDigits || cnpjDigits.length !== 14) {
      return res.status(400).json({
        success: false,
        message: 'CNPJ is required and must have 14 digits',
      });
    }

    const tenantId = req.user?.tenantId ?? body.tenantId ?? null;

    // 🔒 NÃO permitir mesma empresa (mesmo CNPJ) ser criada por admins diferentes
    const existing = await prisma.company.findFirst({
      where: {
        tenantId,
        OR: [{ cnpj: cnpjDigits }, { cnpj: rawCnpj }],
      },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Já existe uma empresa cadastrada com este CNPJ.',
      });
    }

    const payload = {
      ...body,
      cnpj: rawCnpj,
      tenantId,
    };

    console.log('PAYLOAD', payload);

    const { company, headquarter } =
      await createCompanyWithHeadquarter(payload, req.user?.id);

    console.log('COMPANY', company);

    await registerAudit({
      userId: req.user?.id,
      action: 'CREATE',
      entity: 'Company',
      entityId: company.id,
      details: JSON.stringify({
        cnpj: company.cnpj,
        headquarterId: headquarter?.id || null,
      }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res
      .status(201)
      .json({ success: true, data: { company, headquarter } });
  } catch (err) {
    const mapped = prismaErrorToHttp(err);
    if (mapped) {
      return res.status(mapped.status).json({ success: false, ...mapped });
    }
    console.error('[COMPANY] create error', err);
    res.status(500).json({ success: false, message: 'Internal error' });
  }
}

export async function update(req, res) {
  try {
    const { id } = req.params;
    const data = req.body || {};

    // garante escopo de escrita (global / company.admin)
    const existing = await prisma.company.findFirst({
      where: buildCompanyScopeWhere(req.user, { id }),
      select: { id: true, tenantId: true, cnpj: true, isActive: true },
    });

    if (!existing) {
      return res
        .status(404)
        .json({ success: false, message: 'Company not found' });
    }

    const previousIsActive = existing.isActive;

    // Se estiver alterando CNPJ, evitar mudar para um CNPJ já existente
    if (data.cnpj !== undefined) {
      const rawCnpj = String(data.cnpj);
      const cnpjDigits = normalizeCnpj(rawCnpj);

      if (!cnpjDigits || cnpjDigits.length !== 14) {
        return res.status(400).json({
          success: false,
          message: 'CNPJ must have 14 digits',
        });
      }

      const dup = await prisma.company.findFirst({
        where: {
          tenantId: existing.tenantId ?? null,
          OR: [{ cnpj: cnpjDigits }, { cnpj: rawCnpj }],
          NOT: { id },
        },
      });

      if (dup) {
        return res.status(409).json({
          success: false,
          message: 'Já existe outra empresa cadastrada com este CNPJ.',
        });
      }
    }

    let startAtValue = undefined;
    if (data.startAt === '' || data.startAt == null) {
      startAtValue = null;
    } else if (data.startAt) {
      const d = new Date(data.startAt);
      startAtValue = Number.isNaN(d.getTime()) ? undefined : d;
    }

    let ibgeCityCodeValue = undefined;
    if (data.ibgeCityCode === '' || data.ibgeCityCode == null) {
      ibgeCityCodeValue = null;
    } else if (data.ibgeCityCode !== undefined) {
      ibgeCityCodeValue = String(data.ibgeCityCode);
    }

    const updated = await prisma.company.update({
      where: { id },
      data: {
        cnpj: data.cnpj ?? undefined,
        legalName: data.legalName ?? undefined,
        tradeName: data.tradeName ?? undefined,
        startAt: startAtValue,
        companySize: data.companySize ?? undefined,
        taxRegime: data.taxRegime ?? undefined,
        fiscalEmail: data.fiscalEmail ?? undefined,
        phone: data.phone ?? undefined,
        website: data.website ?? undefined,
        street: data.street ?? undefined,
        number: data.number ?? undefined,
        complement: data.complement ?? undefined,
        district: data.district ?? undefined,
        city: data.city ?? undefined,
        state: data.state ?? undefined,
        zipCode: data.zipCode ?? undefined,
        ibgeCityCode: ibgeCityCodeValue,
        // 👇 permite ativar/desativar via PUT /companies/:id
        isActive:
          typeof data.isActive === 'boolean' ? data.isActive : undefined,
      },
    });

    // Se o status mudou, aplica cascata em Users/Establishments
    if (typeof data.isActive === 'boolean') {
      if (previousIsActive && !updated.isActive) {
        await cascadeCompanyDeactivation(updated.id);
      } else if (!previousIsActive && updated.isActive) {
        await cascadeCompanyActivation(updated.id);
      }
    }

    await registerAudit({
      userId: req.user?.id,
      action: 'UPDATE',
      entity: 'Company',
      entityId: id,
      details: JSON.stringify(Object.keys(data)),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    const mapped = prismaErrorToHttp(err);
    if (mapped) {
      return res.status(mapped.status).json({ success: false, ...mapped });
    }
    console.error('[COMPANY] update error', err);
    res.status(500).json({ success: false, message: 'Internal error' });
  }
}

/**
 * Soft delete: marca isActive = false em vez de deletar.
 * Agora também aplica cascata em Establishments + Users.
 */
export async function remove(req, res) {
  try {
    const { id } = req.params;

    const existing = await prisma.company.findFirst({
      where: buildCompanyScopeWhere(req.user, { id }),
      select: { id: true, isActive: true, cnpj: true },
    });

    if (!existing) {
      return res
        .status(404)
        .json({ success: false, message: 'Company not found' });
    }

    if (!existing.isActive) {
      return res.json({
        success: true,
        message: 'Company already inactive (soft deleted previously)',
      });
    }

    await prisma.company.update({
      where: { id },
      data: {
        isActive: false,
      },
    });

    // Cascata: desativar estabelecimentos e usuários de portal
    await cascadeCompanyDeactivation(id);

    await registerAudit({
      userId: req.user?.id,
      action: 'DELETE',
      entity: 'Company',
      entityId: id,
      details: `Company marked as inactive (soft delete): ${existing.cnpj}`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({ success: true, message: 'Company marked as inactive' });
  } catch (err) {
    const mapped = prismaErrorToHttp(err);
    if (mapped) {
      return res.status(mapped.status).json({ success: false, ...mapped });
    }
    console.error('[COMPANY] remove error', err);
    res.status(500).json({ success: false, message: 'Internal error' });
  }
}

/**
 * Ativa / desativa explicitamente uma Company.
 * Espera body: { isActive: boolean }
 * Também aplica cascata em Establishments + Users.
 */
export async function setActive(req, res) {
  try {
    const { id } = req.params;
    const { isActive } = req.body || {};

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Campo isActive (boolean) é obrigatório',
      });
    }

    const existing = await prisma.company.findFirst({
      where: buildCompanyScopeWhere(req.user, { id }),
      select: { id: true, isActive: true, cnpj: true },
    });

    if (!existing) {
      return res
        .status(404)
        .json({ success: false, message: 'Company not found' });
    }

    const updated = await prisma.company.update({
      where: { id },
      data: {
        isActive,
      },
    });

    // Cascata
    if (!existing.isActive && isActive) {
      await cascadeCompanyActivation(updated.id);
    } else if (existing.isActive && !isActive) {
      await cascadeCompanyDeactivation(updated.id);
    }

    await registerAudit({
      userId: req.user?.id,
      action: 'UPDATE',
      entity: 'Company',
      entityId: updated.id,
      details: `Company ${isActive ? 'activated' : 'deactivated'}: ${
        updated.cnpj
      }`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({
      success: true,
      message: `Company ${isActive ? 'activated' : 'deactivated'} successfully`,
    });
  } catch (err) {
    const mapped = prismaErrorToHttp(err);
    if (mapped) {
      return res.status(mapped.status).json({ success: false, ...mapped });
    }
    console.error('[COMPANY] setActive error', err);
    res.status(500).json({ success: false, message: 'Internal error' });
  }
}
