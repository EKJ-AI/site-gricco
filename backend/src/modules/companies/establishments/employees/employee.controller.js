import prisma from '../../../../../prisma/client.js';
import bcrypt from 'bcrypt';
import { parsePagination } from '../../../../infra/http/pagination.js';
import { prismaErrorToHttp } from '../../../../infra/http/prismaError.js';
import { registerAudit } from '../../../../utils/audit.js';

const PORTAL_PROFILE_NAME =
  process.env.PORTAL_EMPLOYEE_PROFILE_NAME || 'Portal Employee';

// ⚠️ Profile.id é String (uuid), então não convertemos para Number
const PORTAL_PROFILE_ID_ENV = process.env.PORTAL_EMPLOYEE_PROFILE_ID || null;

/**
 * Resolve o profileId padrão para colaboradores de portal.
 * Estratégia:
 *  1) Se PORTAL_EMPLOYEE_PROFILE_ID estiver setado e existir, usa ele.
 *  2) Senão, tenta achar Profile pelo nome (PORTAL_PROFILE_NAME).
 *  3) Se não achar, lança erro descritivo.
 */
async function resolvePortalProfileId(tx) {
  if (PORTAL_PROFILE_ID_ENV) {
    const profile = await tx.profile.findUnique({
      where: { id: PORTAL_PROFILE_ID_ENV },
      select: { id: true },
    });
    if (profile) return profile.id;
  }

  const byName = await tx.profile.findFirst({
    where: { name: PORTAL_PROFILE_NAME },
    select: { id: true },
  });

  if (!byName) {
    throw new Error(
      `Portal profile not found. Configure PORTAL_EMPLOYEE_PROFILE_ID ou crie um Profile com nome "${PORTAL_PROFILE_NAME}".`,
    );
  }

  return byName.id;
}

/**
 * Garante o usuário de portal para o colaborador, de forma “inteligente”.
 *
 * Regras:
 *  - Se portalAccessEnabled = false → zera portalUserId (mantém portalDocumentRole como metadado).
 *  - Se portalAccessEnabled = true:
 *      - exige email e portalPassword
 *      - escolhe um Profile:
 *          - se portalProfileId vier do payload, usa ele
 *          - senão, resolve o profile padrão (Portal Employee)
 *      - procura User por email:
 *          - se existir → atualiza passwordHash (+ opcionalmente profileId)
 *          - se não existir → cria User com profileId escolhido
 *      - vincula Employee.portalUserId
 *
 * Retorna o Employee atualizado.
 */
async function ensurePortalUserForEmployee(
  tx,
  employee,
  { portalAccessEnabled, portalProfileId, portalPassword },
) {
  const employeeId = employee.id;

  // 🔴 Desabilitando acesso ao portal
  if (!portalAccessEnabled) {
    if (employee.portalUserId) {
      return tx.employee.update({
        where: { id: employeeId },
        data: {
          portalUserId: null,
          // portalDocumentRole continua no valor anterior / default (MEMBER),
          // mas não é mais usado para autorização.
        },
      });
    }
    return employee;
  }

  // 🟢 Habilitando acesso ao portal
  if (!employee.email) {
    throw new Error(
      'Email is required to enable portal access for this employee.',
    );
  }

  if (!portalPassword || String(portalPassword).trim().length < 6) {
    throw new Error(
      'A portal password with at least 6 characters is required to enable portal access.',
    );
  }

  const email = employee.email.trim().toLowerCase();
  const name = employee.name || email;
  const passwordHash = await bcrypt.hash(String(portalPassword), 10);

  // Profile que será usado pelo usuário de portal
  const effectiveProfileId =
    portalProfileId || (await resolvePortalProfileId(tx));

  // Procura usuário existente pelo email
  let user = await tx.user.findUnique({
    where: { email },
    select: { id: true, profileId: true },
  });

  if (!user) {
    // Cria novo usuário com o profile de colaborador de portal
    user = await tx.user.create({
      data: {
        name,
        email,
        passwordHash,
        profileId: effectiveProfileId,
      },
      select: { id: true, profileId: true },
    });
  } else {
    // Usuário já existe → atualiza a senha e, opcionalmente, o profile
    await tx.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        // Se o Admin escolheu um profile específico para este colaborador,
        // podemos sincronizar o profileId com a escolha.
        ...(portalProfileId ? { profileId: effectiveProfileId } : {}),
      },
    });
  }

  // Atualiza o Employee para vincular ao usuário de portal
  const updatedEmployee = await tx.employee.update({
    where: { id: employeeId },
    data: {
      portalUserId: user.id,
      // portalDocumentRole continua existindo no schema, mas não manda mais no acesso.
    },
  });

  return updatedEmployee;
}

export async function listByCompany(req, res) {
  try {
    const companyId = req.params.companyId || req.query.companyId; // aceita ambos
    const { q } = req.query;
    const { skip, take, page, pageSize } = parsePagination(req);

    const where = {
      companyId,
      ...(q
        ? {
            OR: [
              { cpf: { contains: q, mode: 'insensitive' } },
              { name: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      prisma.employee.count({ where }),
      prisma.employee.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { department: true, cbo: true },
      }),
    ]);

    return res.json({
      success: true,
      data: { total, page, pageSize, items },
    });
  } catch (err) {
    const mapped = prismaErrorToHttp(err);
    if (mapped)
      return res
        .status(mapped.status)
        .json({ success: false, ...mapped });
    return res
      .status(500)
      .json({ success: false, message: 'Internal error' });
  }
}

export async function listByEstablishment(req, res) {
  try {
    const establishmentId =
      req.params.establishmentId || req.query.establishmentId;
    const { q } = req.query;
    const { skip, take, page, pageSize } = parsePagination(req);

    const where = {
      establishmentId,
      ...(q
        ? {
            OR: [
              { cpf: { contains: q, mode: 'insensitive' } },
              { name: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      prisma.employee.count({ where }),
      prisma.employee.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { department: true, cbo: true },
      }),
    ]);

    return res.json({
      success: true,
      data: { total, page, pageSize, items },
    });
  } catch (err) {
    const mapped = prismaErrorToHttp(err);
    if (mapped)
      return res
        .status(mapped.status)
        .json({ success: false, ...mapped });
    return res
      .status(500)
      .json({ success: false, message: 'Internal error' });
  }
}

export async function getById(req, res) {
  try {
    const { id } = req.params;
    const emp = await prisma.employee.findUnique({
      where: { id },
      include: {
        department: true,
        cbo: true,
        portalUser: {
          select: {
            id: true,
            profileId: true,
            profile: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });
    if (!emp)
      return res
        .status(404)
        .json({ success: false, message: 'Employee not found' });
    return res.json({ success: true, data: emp });
  } catch (err) {
    const mapped = prismaErrorToHttp(err);
    if (mapped)
      return res
        .status(mapped.status)
        .json({ success: false, ...mapped });
    return res
      .status(500)
      .json({ success: false, message: 'Internal error' });
  }
}

export async function create(req, res) {
  try {
    // 🔑 aceita via params (rotas aninhadas) OU via body (rota plana)
    const companyId = req.params.companyId || req.body.companyId;
    const establishmentId =
      req.params.establishmentId || req.body.establishmentId;

    const {
      departmentId,
      cpf,
      name,
      birthDate,
      sex,
      registration,
      hiredAt,
      dismissedAt,
      bondType,
      cboId,
      jobTitle,
      email,
      phone,
      nationality,
      language,
      portalAccessEnabled,
      portalProfileId,
      portalPassword,
    } = req.body || {};

    if (!companyId || !establishmentId) {
      return res.status(400).json({
        success: false,
        message: 'companyId e establishmentId são obrigatórios',
      });
    }

    // valida se o establishment pertence à company
    const est = await prisma.establishment.findUnique({
      where: { id: establishmentId },
      select: { companyId: true },
    });
    if (!est || est.companyId !== companyId) {
      return res.status(400).json({
        success: false,
        message: 'Establishment não pertence à Company informada',
      });
    }

    // valida se department (se enviado) pertence ao mesmo establishment
    if (departmentId) {
      const dep = await prisma.department.findUnique({
        where: { id: departmentId },
        select: { establishmentId: true },
      });
      if (!dep || dep.establishmentId !== establishmentId) {
        return res.status(400).json({
          success: false,
          message: 'Department não pertence ao Establishment informado',
        });
      }
    }

    const employee = await prisma.$transaction(async (tx) => {
      const created = await tx.employee.create({
        data: {
          companyId,
          establishmentId,
          departmentId: departmentId ?? null,
          cpf,
          name,
          birthDate: birthDate ? new Date(birthDate) : null,
          sex,
          registration,
          hiredAt: hiredAt ? new Date(hiredAt) : null,
          dismissedAt: dismissedAt ? new Date(dismissedAt) : null,
          bondType,
          cboId: cboId ?? null,
          jobTitle,
          email,
          phone,
          nationality: nationality ?? null,
          preferredLanguage: language ?? null,
        },
      });

      // “Mega inteligente” → cria/atualiza usuário de portal se habilitado
      const finalEmployee = await ensurePortalUserForEmployee(tx, created, {
        portalAccessEnabled: !!portalAccessEnabled,
        portalProfileId: portalProfileId || null,
        portalPassword,
      });

      return finalEmployee;
    });

    await registerAudit({
      userId: req.user?.id,
      action: 'CREATE',
      entity: 'Employee',
      entityId: employee.id,
      details: JSON.stringify({ cpf: employee.cpf }),
    });

    return res.status(201).json({ success: true, data: employee });
  } catch (err) {
    if (err instanceof Error && err.message?.includes('Portal profile')) {
      // Erro específico do profile de portal
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    if (
      err instanceof Error &&
      err.message?.startsWith('Email is required to enable portal access')
    ) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    if (
      err instanceof Error &&
      err.message?.startsWith(
        'A portal password with at least 6 characters is required',
      )
    ) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    const mapped = prismaErrorToHttp(err);
    if (mapped)
      return res
        .status(mapped.status)
        .json({ success: false, ...mapped });
    return res
      .status(500)
      .json({ success: false, message: 'Internal error' });
  }
}

export async function update(req, res) {
  try {
    const { id } = req.params;

    const {
      companyId,
      establishmentId,
      departmentId,
      cpf,
      name,
      birthDate,
      sex,
      registration,
      hiredAt,
      dismissedAt,
      bondType,
      cboId,
      jobTitle,
      email,
      phone,
      nationality,
      language,
      portalAccessEnabled,
      portalProfileId,
      portalPassword,
    } = req.body || {};

    // Carrega o estado atual do empregado (para validações e portal)
    const current = await prisma.employee.findUnique({
      where: { id },
      select: {
        id: true,
        establishmentId: true,
        companyId: true,
        email: true,
        name: true,
        portalUserId: true,
        portalDocumentRole: true,
      },
    });

    if (!current) {
      return res
        .status(404)
        .json({ success: false, message: 'Employee not found' });
    }

    // Se trocar establishment/company, validar coerência
    if (companyId && establishmentId) {
      const est = await prisma.establishment.findUnique({
        where: { id: establishmentId },
        select: { companyId: true },
      });
      if (!est || est.companyId !== companyId) {
        return res.status(400).json({
          success: false,
          message: 'Establishment não pertence à Company informada',
        });
      }
    }

    // Se trocar department, garantir que pertence ao establishment alvo
    if (departmentId) {
      const estId = establishmentId ?? current.establishmentId;
      const dep = await prisma.department.findUnique({
        where: { id: departmentId },
        select: { establishmentId: true },
      });
      if (!dep || dep.establishmentId !== estId) {
        return res.status(400).json({
          success: false,
          message: 'Department não pertence ao Establishment informado',
        });
      }
    }

    const employee = await prisma.$transaction(async (tx) => {
      const updated = await tx.employee.update({
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
          nationality: nationality ?? undefined,
          preferredLanguage: language ?? undefined,
          // portalUserId será tratado em ensurePortalUserForEmployee
        },
      });

      const finalEmployee = await ensurePortalUserForEmployee(tx, updated, {
        portalAccessEnabled: !!portalAccessEnabled,
        portalProfileId: portalProfileId || null,
        portalPassword,
      });

      return finalEmployee;
    });

    await registerAudit({
      userId: req.user?.id,
      action: 'UPDATE',
      entity: 'Employee',
      entityId: id,
      details: JSON.stringify(Object.keys(req.body || {})),
    });

    return res.json({ success: true, data: employee });
  } catch (err) {
    if (err instanceof Error && err.message?.includes('Portal profile')) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    if (
      err instanceof Error &&
      err.message?.startsWith('Email is required to enable portal access')
    ) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    if (
      err instanceof Error &&
      err.message?.startsWith(
        'A portal password with at least 6 characters is required',
      )
    ) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    const mapped = prismaErrorToHttp(err);
    if (mapped)
      return res
        .status(mapped.status)
        .json({ success: false, ...mapped });
    return res
      .status(500)
      .json({ success: false, message: 'Internal error' });
  }
}

export async function remove(req, res) {
  try {
    const { id } = req.params;
    await prisma.employee.delete({ where: { id } });
    await registerAudit({
      userId: req.user?.id,
      action: 'DELETE',
      entity: 'Employee',
      entityId: id,
      details: '',
    });
    return res.json({ success: true, message: 'Employee removed' });
  } catch (err) {
    const mapped = prismaErrorToHttp(err);
    if (mapped)
      return res
        .status(mapped.status)
        .json({ success: false, ...mapped });
    return res
      .status(500)
      .json({ success: false, message: 'Internal error' });
  }
}
