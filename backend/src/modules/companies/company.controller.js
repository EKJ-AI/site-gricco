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

export async function list(req, res) {
  try {
    const { q } = req.query;
    const { skip, take, page, pageSize } = parsePagination(req);

    const perms = req.user?.permissions || [];
    const isGlobalAdmin = perms.includes('system.admin.global');
    const isCompanyAdmin = perms.includes('company.admin');

    const whereSearch = q
      ? {
          OR: [
            // busca por CNPJ usando só dígitos
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

    let where = {};

    if (isGlobalAdmin) {
      // 🔓 Global admin → vê todas
      where = { ...whereSearch };
    } else if (isCompanyAdmin) {
      // 🔓 Company admin → apenas empresas criadas por ele
      where = {
        ...whereSearch,
        createdByUserId: req.user.id,
      };
    } else {
      // 👇 Caso: perfil com company.read, mas NÃO company.admin
      // Ex: sub-admin / colaborador do cliente
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

      where = {
        ...whereSearch,
        id: { in: companyIds },
      };
    }

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
      // 🔓 Global admin → sem filtro extra
      where = { id };
    } else if (isCompanyAdmin) {
      // 🔓 Company admin → empresa que ele criou
      where = {
        id,
        createdByUserId: req.user.id,
      };
    } else {
      // 👇 Leitor comum (company.read sem company.admin)
      // Só pode ver empresas onde é Employee (portalUserId)
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
      select: { id: true, tenantId: true, cnpj: true },
    });

    if (!existing) {
      return res
        .status(404)
        .json({ success: false, message: 'Company not found' });
    }

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
      },
    });

    await registerAudit({
      userId: req.user?.id,
      action: 'UPDATE',
      entity: 'Company',
      entityId: id,
      details: JSON.stringify(Object.keys(data)),
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

export async function remove(req, res) {
  try {
    const { id } = req.params;

    const existing = await prisma.company.findFirst({
      where: buildCompanyScopeWhere(req.user, { id }),
      select: { id: true },
    });

    if (!existing) {
      return res
        .status(404)
        .json({ success: false, message: 'Company not found' });
    }

    await prisma.company.delete({ where: { id } });

    await registerAudit({
      userId: req.user?.id,
      action: 'DELETE',
      entity: 'Company',
      entityId: id,
      details: '',
    });

    res.json({ success: true, message: 'Company removed' });
  } catch (err) {
    const mapped = prismaErrorToHttp(err);
    if (mapped) {
      return res.status(mapped.status).json({ success: false, ...mapped });
    }
    console.error('[COMPANY] remove error', err);
    res.status(500).json({ success: false, message: 'Internal error' });
  }
}
