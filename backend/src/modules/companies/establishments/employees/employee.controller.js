// src/modules/companies/establishments/employees/employee.controller.js
import prisma from '../../../../../prisma/client.js';
import { parsePagination } from '../../../../infra/http/pagination.js';
import { prismaErrorToHttp } from '../../../../infra/http/prismaError.js';
import { registerAudit } from '../../../../utils/audit.js';

export async function listByCompany(req, res) {
  try {
    const companyId = req.params.companyId || req.query.companyId; // aceita ambos
    const { q } = req.query;
    const { skip, take, page, pageSize } = parsePagination(req);

    const where = {
      companyId,
      ...(q ? { OR: [
        { cpf: { contains: q, mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ] } : {})
    };

    const [total, items] = await Promise.all([
      prisma.employee.count({ where }),
      prisma.employee.findMany({
        where, skip, take, orderBy: { createdAt: 'desc' },
        include: { department: true, cbo: true },
      })
    ]);

    return res.json({ success: true, data: { total, page, pageSize, items } });
  } catch (err) {
    const mapped = prismaErrorToHttp(err);
    if (mapped) return res.status(mapped.status).json({ success: false, ...mapped });
    return res.status(500).json({ success: false, message: 'Internal error' });
  }
}

export async function listByEstablishment(req, res) {
  try {
    const establishmentId = req.params.establishmentId || req.query.establishmentId;
    const { q } = req.query;
    const { skip, take, page, pageSize } = parsePagination(req);

    const where = {
      establishmentId,
      ...(q ? { OR: [
        { cpf: { contains: q, mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ] } : {})
    };

    const [total, items] = await Promise.all([
      prisma.employee.count({ where }),
      prisma.employee.findMany({
        where, skip, take, orderBy: { createdAt: 'desc' },
        include: { department: true, cbo: true },
      })
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
    const { id } = req.params;
    const emp = await prisma.employee.findUnique({
      where: { id },
      include: { department: true, cbo: true },
    });
    if (!emp) return res.status(404).json({ success: false, message: 'Employee not found' });
    return res.json({ success: true, data: emp });
  } catch (err) {
    const mapped = prismaErrorToHttp(err);
    if (mapped) return res.status(mapped.status).json({ success: false, ...mapped });
    return res.status(500).json({ success: false, message: 'Internal error' });
  }
}

export async function create(req, res) {
  try {
    // 🔑 aceita via params (rotas aninhadas) OU via body (rota plana)
    const companyId = req.params.companyId || req.body.companyId;
    const establishmentId = req.params.establishmentId || req.body.establishmentId;

    const {
      departmentId,
      cpf, name, birthDate, sex, registration,
      hiredAt, dismissedAt, bondType, cboId, jobTitle,
      email, phone,
    } = req.body || {};

    if (!companyId || !establishmentId) {
      return res.status(400).json({ success: false, message: 'companyId e establishmentId são obrigatórios' });
    }

    // valida se o establishment pertence à company
    const est = await prisma.establishment.findUnique({ where: { id: establishmentId }, select: { companyId: true } });
    if (!est || est.companyId !== companyId) {
      return res.status(400).json({ success: false, message: 'Establishment não pertence à Company informada' });
    }

    // valida se department (se enviado) pertence ao mesmo establishment
    if (departmentId) {
      const dep = await prisma.department.findUnique({ where: { id: departmentId }, select: { establishmentId: true } });
      if (!dep || dep.establishmentId !== establishmentId) {
        return res.status(400).json({ success: false, message: 'Department não pertence ao Establishment informado' });
      }
    }

    const created = await prisma.employee.create({
      data: {
        companyId, establishmentId, departmentId: departmentId ?? null,
        cpf, name, birthDate: birthDate ? new Date(birthDate) : null,
        sex, registration, hiredAt: hiredAt ? new Date(hiredAt) : null,
        dismissedAt: dismissedAt ? new Date(dismissedAt) : null,
        bondType, cboId: cboId ?? null, jobTitle, email, phone,
      },
    });

    await registerAudit({
      userId: req.user?.id,
      action: 'CREATE',
      entity: 'Employee',
      entityId: created.id,
      details: JSON.stringify({ cpf: created.cpf }),
    });

    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    const mapped = prismaErrorToHttp(err);
    if (mapped) return res.status(mapped.status).json({ success: false, ...mapped });
    return res.status(500).json({ success: false, message: 'Internal error' });
  }
}

export async function update(req, res) {
  try {
    const { id } = req.params;
    const {
      companyId, establishmentId, departmentId,
      cpf, name, birthDate, sex, registration,
      hiredAt, dismissedAt, bondType, cboId, jobTitle,
      email, phone,
    } = req.body || {};

    // Se trocar establishment/company, validar coerência
    if (companyId && establishmentId) {
      const est = await prisma.establishment.findUnique({ where: { id: establishmentId }, select: { companyId: true } });
      if (!est || est.companyId !== companyId) {
        return res.status(400).json({ success: false, message: 'Establishment não pertence à Company informada' });
      }
    }

    if (departmentId) {
      const empCurrent = await prisma.employee.findUnique({ where: { id }, select: { establishmentId: true } });
      const estId = establishmentId ?? empCurrent?.establishmentId;
      const dep = await prisma.department.findUnique({ where: { id: departmentId }, select: { establishmentId: true } });
      if (!dep || dep.establishmentId !== estId) {
        return res.status(400).json({ success: false, message: 'Department não pertence ao Establishment informado' });
      }
    }

    const updated = await prisma.employee.update({
      where: { id },
      data: {
        companyId: companyId ?? undefined,
        establishmentId: establishmentId ?? undefined,
        departmentId: departmentId ?? undefined,
        cpf: cpf ?? undefined,
        name: name ?? undefined,
        birthDate: birthDate ? new Date(birthDate) : undefined,
        sex: sex ?? undefined,
        registration: registration ?? undefined,
        hiredAt: hiredAt ? new Date(hiredAt) : undefined,
        dismissedAt: dismissedAt ? new Date(dismissedAt) : undefined,
        bondType: bondType ?? undefined,
        cboId: cboId ?? undefined,
        jobTitle: jobTitle ?? undefined,
        email: email ?? undefined,
        phone: phone ?? undefined,
      },
    });

    await registerAudit({
      userId: req.user?.id,
      action: 'UPDATE',
      entity: 'Employee',
      entityId: id,
      details: JSON.stringify(Object.keys(req.body || {})),
    });

    return res.json({ success: true, data: updated });
  } catch (err) {
    const mapped = prismaErrorToHttp(err);
    if (mapped) return res.status(mapped.status).json({ success: false, ...mapped });
    return res.status(500).json({ success: false, message: 'Internal error' });
  }
}

export async function remove(req, res) {
  try {
    const { id } = req.params;
    await prisma.employee.delete({ where: { id } });
    await registerAudit({ userId: req.user?.id, action: 'DELETE', entity: 'Employee', entityId: id, details: '' });
    return res.json({ success: true, message: 'Employee removed' });
  } catch (err) {
    const mapped = prismaErrorToHttp(err);
    if (mapped) return res.status(mapped.status).json({ success: false, ...mapped });
    return res.status(500).json({ success: false, message: 'Internal error' });
  }
}
