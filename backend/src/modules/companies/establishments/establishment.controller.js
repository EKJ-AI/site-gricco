// src/modules/companies/establishments/establishment.controller.js
import prisma from '../../../../prisma/client.js';
import { parsePagination } from '../../../infra/http/pagination.js';
import { prismaErrorToHttp } from '../../../infra/http/prismaError.js';
import { registerAudit } from '../../../utils/audit.js';
import { applyCnaesToEstablishment } from './establishment.service.js';

export async function list(req, res) {
  try {
    const companyId = req.params.companyId || req.query.companyId || null;
    const { q } = req.query;
    const { skip, take, page, pageSize } = parsePagination(req);

    const where = {
      ...(companyId ? { companyId } : {}),
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
    if (mapped) return res.status(mapped.status).json({ success: false, ...mapped });
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
        cnaes: { include: { cnae: true } },
      },
    });
    if (!item)
      return res
        .status(404)
        .json({ success: false, message: 'Establishment not found' });
    res.json({ success: true, data: item });
  } catch (err) {
    const mapped = prismaErrorToHttp(err);
    if (mapped) return res.status(mapped.status).json({ success: false, ...mapped });
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
        // mainCnae / riskLevel ficam a cargo do fluxo de CNAEs
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
      },
    });

    if (Array.isArray(cnaes) && cnaes.length) {
      const { mainCnae, riskLevel } = await applyCnaesToEstablishment(effectiveId, cnaes);
      updated.mainCnae = mainCnae;
      updated.riskLevel = riskLevel;
    }

    await registerAudit({
      userId: req.user?.id,
      action: 'UPDATE',
      entity: 'Establishment',
      entityId: effectiveId,
      details: JSON.stringify({ updatedFields: Object.keys(req.body || {}) }),
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    const mapped = prismaErrorToHttp(err);
    if (mapped) return res.status(mapped.status).json({ success: false, ...mapped });
    res.status(500).json({ success: false, message: 'Internal error' });
  }
}

export async function remove(req, res) {
  try {
    const { id, establishmentId } = req.params;
    const effectiveId = establishmentId || id;

    await prisma.establishment.delete({ where: { id: effectiveId } });
    await registerAudit({
      userId: req.user?.id,
      action: 'DELETE',
      entity: 'Establishment',
      entityId: effectiveId,
      details: '',
    });
    res.json({ success: true, message: 'Establishment removed' });
  } catch (err) {
    const mapped = prismaErrorToHttp(err);
    if (mapped) return res.status(mapped.status).json({ success: false, ...mapped });
    res.status(500).json({ success: false, message: 'Internal error' });
  }
}
