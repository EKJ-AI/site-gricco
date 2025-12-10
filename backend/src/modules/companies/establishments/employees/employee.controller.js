// src/modules/employees/employee.controller.js
import prisma from '../../../../../prisma/client.js';
import bcrypt from 'bcrypt';
import { parsePagination } from '../../../../infra/http/pagination.js';
import { prismaErrorToHttp } from '../../../../infra/http/prismaError.js';
import { registerAudit } from '../../../../utils/audit.js';

const PORTAL_PROFILE_NAME =
  process.env.PORTAL_EMPLOYEE_PROFILE_NAME || 'Portal Employee';

// ⚠️ Profile.id é String (uuid), então não convertemos para Number
const PORTAL_PROFILE_ID_ENV =
  process.env.PORTAL_EMPLOYEE_PROFILE_ID || null;

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
 * NOVA LÓGICA (senha opcional na edição):
 *
 * Regras:
 *  - Se portalAccessEnabled = false → zera portalUserId (mantém portalDocumentRole como metadado).
 *  - Se portalAccessEnabled = true:
 *      - exige email do colaborador
 *      - descobre/resolve o usuário:
 *          - se employee.portalUserId existir → tenta esse usuário primeiro
 *          - senão, procura User por email
 *      - CASOS:
 *          (A) Não existe nenhum usuário ainda:
 *              - EXIGE portalPassword (mín. 6 chars)
 *              - cria User com profile:
 *                  - se portalProfileId vier do payload, usa ele
 *                  - senão, resolve profile padrão (Portal Employee)
 *          (B) Usuário já existe:
 *              - portalPassword vazio/curto → mantém senha atual
 *              - portalPassword com 6+ chars → reseta a senha
 *              - se portalProfileId vier → atualiza profileId
 *          - em ambos os casos garante isActive = true
 *      - vincula Employee.portalUserId = user.id
 *
 * Retorna o Employee atualizado.
 */
async function ensurePortalUserForEmployee(
  tx,
  employee,
  { portalAccessEnabled, portalProfileId, portalPassword },
) {
  const employeeId = employee.id;

  // 🔴 Desabilitando acesso ao portal → apenas desvincula o user do Employee.
  // Não desativa o usuário aqui, porque ele pode ser usado em outro contexto
  // (outro Employee, admin, etc.).
  if (!portalAccessEnabled) {
    if (employee.portalUserId) {
      return tx.employee.update({
        where: { id: employeeId },
        data: {
          portalUserId: null,
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

  const email = employee.email.trim().toLowerCase();
  const name = employee.name || email;
  const trimmedPassword = String(portalPassword || '').trim();

  // Tenta achar usuário já existente:
  //  1) pelo portalUserId atual do Employee
  //  2) se não tiver, pelo email
  let user = null;

  if (employee.portalUserId) {
    user = await tx.user.findUnique({
      where: { id: employee.portalUserId },
      select: { id: true },
    });
  }

  if (!user) {
    user = await tx.user.findUnique({
      where: { email },
      select: { id: true },
    });
  }

  // CASO A: não existe usuário ainda → criar (senha obrigatória)
  if (!user) {
    if (!trimmedPassword || trimmedPassword.length < 6) {
      throw new Error(
        'A portal password with at least 6 characters is required to enable portal access.',
      );
    }

    const passwordHash = await bcrypt.hash(trimmedPassword, 10);
    const effectiveProfileId =
      portalProfileId || (await resolvePortalProfileId(tx));

    const createdUser = await tx.user.create({
      data: {
        name,
        email,
        passwordHash,
        profileId: effectiveProfileId,
        isActive: true,
      },
      select: { id: true },
    });

    const updatedEmployee = await tx.employee.update({
      where: { id: employeeId },
      data: {
        portalUserId: createdUser.id,
      },
    });

    return updatedEmployee;
  }

  // CASO B: usuário já existe → opcionalmente trocamos senha e/ou profile
  const userUpdateData = {
    isActive: true,
  };

  // Se veio um profileId específico, atualiza o profile do usuário
  if (portalProfileId) {
    userUpdateData.profileId = portalProfileId;
  }

  // Se veio uma senha nova "forte" (>= 6 chars), reseta a senha
  if (trimmedPassword && trimmedPassword.length >= 6) {
    userUpdateData.passwordHash = await bcrypt.hash(trimmedPassword, 10);
  }

  await tx.user.update({
    where: { id: user.id },
    data: userUpdateData,
  });

  // Garante vínculo no Employee
  const updatedEmployee = await tx.employee.update({
    where: { id: employeeId },
    data: {
      portalUserId: user.id,
    },
  });

  return updatedEmployee;
}

/**
 * LISTAGEM POR COMPANY
 */
export async function listByCompany(req, res) {
  try {
    const companyId = req.params.companyId || req.query.companyId; // aceita ambos
    const {
      q,
      departmentId,
      status,
      includeInactive,
      isActive,
    } = req.query;
    const { skip, take, page, pageSize } = parsePagination(req);

    // --------- Filtro de status unificado ---------
    let whereIsActive = {};

    if (typeof status === 'string') {
      const s = status.toLowerCase();
      if (s === 'active') whereIsActive = { isActive: true };
      else if (s === 'inactive') whereIsActive = { isActive: false };
      else if (s === 'all') whereIsActive = {};
    } else if (typeof isActive !== 'undefined') {
      const v = String(isActive).toLowerCase();
      if (v === 'true' || v === '1') whereIsActive = { isActive: true };
      else if (v === 'false' || v === '0') whereIsActive = { isActive: false };
    } else if (typeof includeInactive !== 'undefined') {
      const inc = String(includeInactive).toLowerCase();
      const showAll = inc === 'true' || inc === '1';
      whereIsActive = showAll ? {} : { isActive: true };
    } else {
      // default → só ativos
      whereIsActive = { isActive: true };
    }

    const where = {
      companyId,
      ...(departmentId ? { departmentId } : {}),
      ...whereIsActive,
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

/**
 * LISTAGEM POR ESTABLISHMENT
 */
export async function listByEstablishment(req, res) {
  try {
    const establishmentId =
      req.params.establishmentId || req.query.establishmentId;
    const {
      q,
      departmentId,
      status,
      includeInactive,
      isActive,
    } = req.query;
    const { skip, take, page, pageSize } = parsePagination(req);

    let whereIsActive = {};

    if (typeof status === 'string') {
      const s = status.toLowerCase();
      if (s === 'active') whereIsActive = { isActive: true };
      else if (s === 'inactive') whereIsActive = { isActive: false };
      else if (s === 'all') whereIsActive = {};
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
      establishmentId,
      ...(departmentId ? { departmentId } : {}),
      ...whereIsActive,
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
      // endereço do colaborador
      street,
      number,
      complement,
      district,
      city,
      state,
      zipCode,
      ibgeCityCode,
      // portal
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
          message:
            'Department não pertence ao Establishment informado',
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
          // endereço
          street: street ?? null,
          number: number ?? null,
          complement: complement ?? null,
          district: district ?? null,
          city: city ?? null,
          state: state ?? null,
          zipCode: zipCode ?? null,
          ibgeCityCode: ibgeCityCode ?? null,
          isActive: true,
        },
      });

      // Cria/atualiza usuário de portal se habilitado
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
      err.message?.startsWith(
        'Email is required to enable portal access',
      )
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
      // endereço
      street,
      number,
      complement,
      district,
      city,
      state,
      zipCode,
      ibgeCityCode,
      // portal
      portalAccessEnabled,
      portalProfileId,
      portalPassword,
      // ativo/inativo
      isActive,
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
        isActive: true,
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
          message:
            'Department não pertence ao Establishment informado',
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
          dismissedAt: dismissedAt
            ? new Date(dismissedAt)
            : undefined,
          bondType: bondType ?? undefined,
          cboId: cboId ?? undefined,
          jobTitle: jobTitle ?? undefined,
          email: email ?? undefined,
          phone: phone ?? undefined,
          nationality: nationality ?? undefined,
          preferredLanguage: language ?? undefined,
          // endereço
          street: street ?? undefined,
          number: number ?? undefined,
          complement: complement ?? undefined,
          district: district ?? undefined,
          city: city ?? undefined,
          state: state ?? undefined,
          zipCode: zipCode ?? undefined,
          ibgeCityCode: ibgeCityCode ?? undefined,
          isActive:
            typeof isActive === 'boolean' ? isActive : undefined,
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
      err.message?.startsWith(
        'Email is required to enable portal access',
      )
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

    // 1) Carrega o colaborador para saber se há portalUserId
    const employee = await prisma.employee.findUnique({
      where: { id },
      select: {
        id: true,
        portalUserId: true,
        isActive: true,
      },
    });

    if (!employee) {
      return res
        .status(404)
        .json({ success: false, message: 'Employee not found' });
    }

    // 2) Transação: inativar o Employee (isActive = false) e, se for o último vínculo ativo,
    // desativar o usuário de portal (isActive = false)
    await prisma.$transaction(async (tx) => {
      // soft delete / inativação
      await tx.employee.update({
        where: { id: employee.id },
        data: { isActive: false },
      });

      if (employee.portalUserId) {
        // verifica se ainda existe algum outro Employee ATIVO usando esse mesmo portalUserId
        const remaining = await tx.employee.count({
          where: {
            portalUserId: employee.portalUserId,
            isActive: true,
          },
        });

        // se não houver mais nenhum, desativa o User
        if (remaining === 0) {
          await tx.user.update({
            where: { id: employee.portalUserId },
            data: { isActive: false },
          });
        }
      }
    });

    await registerAudit({
      userId: req.user?.id,
      action: 'DELETE',
      entity: 'Employee',
      entityId: id,
      details: '',
    });

    return res.json({
      success: true,
      message: 'Employee removed (soft delete)',
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
