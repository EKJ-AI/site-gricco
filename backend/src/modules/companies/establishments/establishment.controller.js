// src/modules/companies/establishments/establishment.controller.js
import prisma from '../../../../prisma/client.js';
import { parsePagination } from '../../../infra/http/pagination.js';
import { prismaErrorToHttp } from '../../../infra/http/prismaError.js';
import { registerAudit } from '../../../utils/audit.js';
import { applyCnaesToEstablishment } from './establishment.service.js';

/**
 * 🔽 Auxiliar: desativar usuários de portal ao desativar um estabelecimento.
 *
 * NÃO mexe em Employee.isActive.
 * Desativa Users que, após a desativação, não tiverem nenhum vínculo
 * "válido" (Employee ativo em empresa + estabelecimento ativos).
 */
async function cascadeEstablishmentDeactivation(establishmentId) {
  await prisma.$transaction(async (tx) => {
    // Employees com portalUserId nesse estabelecimento
    const employees = await tx.employee.findMany({
      where: {
        establishmentId,
        portalUserId: { not: null },
      },
      select: { portalUserId: true },
    });

    const portalUserIds = [
      ...new Set(employees.map((e) => e.portalUserId)),
    ];

    if (!portalUserIds.length) return;

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
 * 🔼 Auxiliar: ao reativar estabelecimento, reativar usuários de portal
 * baseados em Employees ATIVOS com portalUserId nesta unidade.
 */
async function cascadeEstablishmentActivation(establishmentId) {
  await prisma.$transaction(async (tx) => {
    const employees = await tx.employee.findMany({
      where: {
        establishmentId,
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
    const companyId = req.params.companyId || req.query.companyId || null;
    const { q, status, includeInactive, isActive } = req.query;
    const { skip, take, page, pageSize } = parsePagination(req);

    // ---------- Filtro de status (NOVA LÓGICA) ----------
    let whereIsActive = {};

    if (typeof status === 'string') {
      const s = status.toLowerCase();
      if (s === 'active') {
        whereIsActive = { isActive: true };
      } else if (s === 'inactive') {
        whereIsActive = { isActive: false };
      } else if (s === 'all') {
        whereIsActive = {};
      }
    } else if (typeof isActive !== 'undefined') {
      const v = String(isActive).toLowerCase();
      if (v === 'true' || v === '1') whereIsActive = { isActive: true };
      else if (v === 'false' || v === '0') whereIsActive = { isActive: false };
    } else if (typeof includeInactive !== 'undefined') {
      const inc = String(includeInactive).toLowerCase();
      const showAll = inc === 'true' || inc === '1';
      whereIsActive = showAll ? {} : { isActive: true };
    } else {
      whereIsActive = { isActive: true };
    }

    const where = {
      ...(companyId ? { companyId } : {}),
      ...whereIsActive,
      ...(q
        ? {
            OR: [
              { cnpj: { contains: q, mode: 'insensitive' } },
              { nickname: { contains: q, mode: 'insensitive' } },
              { city: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      prisma.establishment.count({ where }),
      prisma.establishment.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          documents: true,
          departments: true,
          cnaes: { include: { cnae: true } },
        },
      }),
    ]);

    return res.json({ success: true, data: { total, page, pageSize, items } });
  } catch (err) {
    const mapped = prismaErrorToHttp(err);
    if (mapped) {
      return res.status(mapped.status).json({ success: false, ...mapped });
    }
    return res.status(500).json({ success: false, message: 'Internal error' });
  }
}

export async function getById(req, res) {
  try {
    const { id, establishmentId } = req.params;
    const effectiveId = establishmentId || id;

    const item = await prisma.establishment.findUnique({
      where: { id: effectiveId },
      include: {
        company: true,
        departments: true,
        documents: true,
        employees: true,
        cnaes: { include: { cnae: true } },
      },
    });

    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: 'Establishment not found' });
    }

    res.json({ success: true, data: item });
  } catch (err) {
    const mapped = prismaErrorToHttp(err);
    if (mapped) {
      return res.status(mapped.status).json({ success: false, ...mapped });
    }
    res.status(500).json({ success: false, message: 'Internal error' });
  }
}

export async function create(req, res) {
  try {
    const {
      companyId,
      nickname,
      cnpj,
      isHeadquarter = false,
      street,
      number,
      complement,
      district,
      city,
      state,
      zipCode,
      geoLat,
      geoLng,
      licenseNumber,
      licenseValidUntil,
      legalRepName,
      legalRepCpf,
      cnaes, // [{ code, riskLevel? }]
    } = req.body || {};

    if (!companyId) {
      return res
        .status(400)
        .json({ success: false, message: 'companyId is required' });
    }

    const created = await prisma.establishment.create({
      data: {
        companyId,
        nickname,
        cnpj,
        isHeadquarter: !!isHeadquarter,
        isActive: true, // 👈 nasce ativo
        street,
        number,
        complement,
        district,
        city,
        state,
        zipCode,
        geoLat,
        geoLng,
        licenseNumber,
        licenseValidUntil,
        legalRepName,
        legalRepCpf,
      },
    });

    if (Array.isArray(cnaes) && cnaes.length) {
      const { mainCnae, riskLevel } = await applyCnaesToEstablishment(
        created.id,
        cnaes,
      );
      created.mainCnae = mainCnae;
      created.riskLevel = riskLevel;
    }

    await registerAudit({
      userId: req.user?.id,
      action: 'CREATE',
      entity: 'Establishment',
      entityId: created.id,
      details: JSON.stringify({
        cnpj: created.cnpj,
        mainCnae: created.mainCnae,
        riskLevel: created.riskLevel,
      }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(201).json({ success: true, data: created });
  } catch (err) {
    const mapped = prismaErrorToHttp(err);
    if (mapped) {
      return res.status(mapped.status).json({ success: false, ...mapped });
    }
    console.error('[ESTABLISHMENT] create error', err);
    res.status(500).json({ success: false, message: 'Internal error' });
  }
}

export async function update(req, res) {
  try {
    const { id, establishmentId } = req.params;
    const effectiveId = establishmentId || id;

    const existing = await prisma.establishment.findUnique({
      where: { id: effectiveId },
      select: { id: true, isActive: true, companyId: true },
    });

    if (!existing) {
      return res
        .status(404)
        .json({ success: false, message: 'Establishment not found' });
    }

    const previousIsActive = existing.isActive;

    const {
      nickname,
      cnpj,
      isHeadquarter,
      street,
      number,
      complement,
      district,
      city,
      state,
      zipCode,
      geoLat,
      geoLng,
      licenseNumber,
      licenseValidUntil,
      legalRepName,
      legalRepCpf,
      cnaes,
      isActive, // 👈 vem do body
    } = req.body || {};

    const updated = await prisma.establishment.update({
      where: { id: effectiveId },
      data: {
        nickname: nickname ?? undefined,
        cnpj: cnpj ?? undefined,
        isHeadquarter:
          typeof isHeadquarter === 'boolean' ? isHeadquarter : undefined,
        street: street ?? undefined,
        number: number ?? undefined,
        complement: complement ?? undefined,
        district: district ?? undefined,
        city: city ?? undefined,
        state: state ?? undefined,
        zipCode: zipCode ?? undefined,
        geoLat: geoLat ?? undefined,
        geoLng: geoLng ?? undefined,
        licenseNumber: licenseNumber ?? undefined,
        licenseValidUntil: licenseValidUntil ?? undefined,
        legalRepName: legalRepName ?? undefined,
        legalRepCpf: legalRepCpf ?? undefined,
        isActive:
          typeof isActive === 'boolean' ? isActive : undefined,
      },
    });

    if (Array.isArray(cnaes) && cnaes.length) {
      const { mainCnae, riskLevel } = await applyCnaesToEstablishment(
        effectiveId,
        cnaes,
      );
      updated.mainCnae = mainCnae;
      updated.riskLevel = riskLevel;
    }

    // Se o status mudou, aplica cascata em Users
    if (typeof isActive === 'boolean') {
      if (previousIsActive && !updated.isActive) {
        await cascadeEstablishmentDeactivation(updated.id);
      } else if (!previousIsActive && updated.isActive) {
        await cascadeEstablishmentActivation(updated.id);
      }
    }

    await registerAudit({
      userId: req.user?.id,
      action: 'UPDATE',
      entity: 'Establishment',
      entityId: effectiveId,
      details: JSON.stringify({ updatedFields: Object.keys(req.body || {}) }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    const mapped = prismaErrorToHttp(err);
    if (mapped) {
      return res.status(mapped.status).json({ success: false, ...mapped });
    }
    res.status(500).json({ success: false, message: 'Internal error' });
  }
}

/**
 * Soft delete: marca isActive = false.
 * Não faz mais delete físico, e aplica cascata em Users.
 */
export async function remove(req, res) {
  try {
    const { id, establishmentId, companyId } = req.params;
    const effectiveId = establishmentId || id;

    const existing = await prisma.establishment.findFirst({
      where: {
        id: effectiveId,
        ...(companyId ? { companyId } : {}),
      },
      select: {
        id: true,
        isActive: true,
        cnpj: true,
      },
    });

    if (!existing) {
      return res
        .status(404)
        .json({ success: false, message: 'Establishment not found' });
    }

    if (!existing.isActive) {
      return res.json({
        success: true,
        message: 'Establishment already inactive (soft deleted previously)',
      });
    }

    await prisma.establishment.update({
      where: { id: existing.id },
      data: { isActive: false },
    });

    // Cascata em Users
    await cascadeEstablishmentDeactivation(existing.id);

    await registerAudit({
      userId: req.user?.id,
      action: 'DELETE',
      entity: 'Establishment',
      entityId: existing.id,
      details: `Establishment marked as inactive (soft delete): ${existing.cnpj}`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({ success: true, message: 'Establishment marked as inactive' });
  } catch (err) {
    const mapped = prismaErrorToHttp(err);
    if (mapped) {
      return res.status(mapped.status).json({ success: false, ...mapped });
    }
    console.error('[ESTABLISHMENT] remove error', err);
    res.status(500).json({ success: false, message: 'Internal error' });
  }
}

/**
 * Ativa / desativa explicitamente um Establishment.
 * Espera body: { isActive: boolean }
 * Também aplica cascata em Users.
 */
export async function setActive(req, res) {
  try {
    const { id, establishmentId, companyId } = req.params;
    const effectiveId = establishmentId || id;
    const { isActive } = req.body || {};

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Campo isActive (boolean) é obrigatório',
      });
    }

    const existing = await prisma.establishment.findFirst({
      where: {
        id: effectiveId,
        ...(companyId ? { companyId } : {}),
      },
      select: {
        id: true,
        isActive: true,
        cnpj: true,
      },
    });

    if (!existing) {
      return res
        .status(404)
        .json({ success: false, message: 'Establishment not found' });
    }

    const updated = await prisma.establishment.update({
      where: { id: existing.id },
      data: { isActive },
    });

    // Cascata
    if (!existing.isActive && isActive) {
      await cascadeEstablishmentActivation(updated.id);
    } else if (existing.isActive && !isActive) {
      await cascadeEstablishmentDeactivation(updated.id);
    }

    await registerAudit({
      userId: req.user?.id,
      action: 'UPDATE',
      entity: 'Establishment',
      entityId: updated.id,
      details: `Establishment ${isActive ? 'activated' : 'deactivated'}: ${
        updated.cnpj
      }`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({
      success: true,
      message: `Establishment ${
        isActive ? 'activated' : 'deactivated'
      } successfully`,
    });
  } catch (err) {
    const mapped = prismaErrorToHttp(err);
    if (mapped) {
      return res.status(mapped.status).json({ success: false, ...mapped });
    }
    console.error('[ESTABLISHMENT] setActive error', err);
    res.status(500).json({ success: false, message: 'Internal error' });
  }
}
