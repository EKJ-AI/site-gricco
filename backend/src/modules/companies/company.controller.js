// src/modules/companies/company.controller.js
import prisma from '../../../prisma/client.js';
import { parsePagination } from '../../infra/http/pagination.js';
import { prismaErrorToHttp } from '../../infra/http/prismaError.js';
import { registerAudit } from '../../utils/audit.js';
import { createCompanyWithHeadquarter } from './company.service.js';

export async function list(req, res) {
  try {
    const { q } = req.query;
    const { skip, take, page, pageSize } = parsePagination(req);

    const where = q
      ? {
          OR: [
            { cnpj:      { contains: q, mode: 'insensitive' } },
            { legalName: { contains: q, mode: 'insensitive' } },
            { tradeName: { contains: q, mode: 'insensitive' } },
            { city:      { contains: q, mode: 'insensitive' } },
          ],
        }
      : {};

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
    const item = await prisma.company.findUnique({
      where: { id },
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
        console.log("BODY", body);


    const rawCnpj = body.cnpj ? String(body.cnpj) : '';
    const cnpjDigits = rawCnpj.replace(/\D+/g, '');
    if (!cnpjDigits || cnpjDigits.length !== 14) {
      return res.status(400).json({
        success: false,
        message: 'CNPJ is required and must have 14 digits',
      });
    }

    const payload = {
      ...body,
      cnpj: rawCnpj,
      tenantId: req.user?.tenantId ?? body.tenantId,
    };

    console.log("PAYLOAD", payload);

    const { company, headquarter } =
      await createCompanyWithHeadquarter(payload, req.user?.id);

    console.log("COMPANY", company);

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
