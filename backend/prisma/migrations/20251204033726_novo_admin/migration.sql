-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE', 'PERMISSION_CHANGE', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "DocumentVersionStatus" AS ENUM ('PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "DocumentKind" AS ENUM ('MAIN', 'EVIDENCE');

-- CreateEnum
CREATE TYPE "DocumentRelationType" AS ENUM ('EVIDENCE', 'SUPPORTING', 'REPLACES', 'DERIVED_FROM');

-- CreateEnum
CREATE TYPE "EstablishmentDocumentRole" AS ENUM ('MEMBER', 'VIEWER', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "DocumentAccessAction" AS ENUM ('VIEW', 'DOWNLOAD', 'UPLOAD');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "refreshToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfilePermission" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "ProfilePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "action" "AuditAction" NOT NULL,
    "userId" INTEGER,
    "details" TEXT,
    "ip" INET,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Culture" (
    "id" VARCHAR(10) NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Culture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Label" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "cultureId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "tutorial" TEXT,
    "version" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "keyHash" CHAR(32) NOT NULL,
    "codeHash" CHAR(32),

    CONSTRAINT "Label_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "cnpj" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "tradeName" TEXT,
    "startAt" TIMESTAMP(3),
    "companySize" TEXT,
    "taxRegime" TEXT,
    "fiscalEmail" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "street" TEXT,
    "number" TEXT,
    "complement" TEXT,
    "district" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "ibgeCityCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdByUserId" INTEGER,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Establishment" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "nickname" TEXT,
    "mainCnae" TEXT,
    "riskLevel" INTEGER,
    "isHeadquarter" BOOLEAN NOT NULL DEFAULT false,
    "street" TEXT,
    "number" TEXT,
    "complement" TEXT,
    "district" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "ibgeCityCode" TEXT,
    "geoLat" DOUBLE PRECISION,
    "geoLng" DOUBLE PRECISION,
    "licenseNumber" TEXT,
    "licenseValidUntil" TIMESTAMP(3),
    "legalRepName" TEXT,
    "legalRepCpf" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Establishment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstablishmentCNAE" (
    "id" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "cnaeId" TEXT NOT NULL,
    "riskLevel" INTEGER,

    CONSTRAINT "EstablishmentCNAE_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CNAE" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "nrRisk" INTEGER,
    "source" TEXT,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "CNAE_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "geoLat" DOUBLE PRECISION,
    "geoLng" DOUBLE PRECISION,
    "shift" TEXT,
    "workload" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3),
    "sex" TEXT,
    "registration" TEXT,
    "hiredAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),
    "bondType" TEXT,
    "jobTitle" TEXT,
    "cboId" TEXT,
    "departmentId" TEXT,
    "activityId" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "portalUserId" INTEGER,
    "portalDocumentRole" "EstablishmentDocumentRole" NOT NULL DEFAULT 'MEMBER',
    "nationality" TEXT,
    "preferredLanguage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CBO" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,

    CONSTRAINT "CBO_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "kind" "DocumentKind" NOT NULL DEFAULT 'MAIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "typeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "DocumentStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentVersionId" TEXT,
    "mimetype" TEXT,
    "hash" TEXT,
    "size" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentRelation" (
    "id" TEXT NOT NULL,
    "fromDocumentId" TEXT NOT NULL,
    "toDocumentId" TEXT NOT NULL,
    "relationType" "DocumentRelationType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentRelation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentVersion" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "versionStatus" "DocumentVersionStatus" NOT NULL DEFAULT 'PUBLISHED',
    "filename" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "storageKey" TEXT,
    "mimetype" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "uploadedByUserId" INTEGER,
    "activatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "DocumentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentView" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "documentVersionId" TEXT NOT NULL,
    "userId" INTEGER,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" INET,
    "userAgent" TEXT,

    CONSTRAINT "DocumentView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentAccessLog" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "documentVersionId" TEXT,
    "userId" INTEGER,
    "action" "DocumentAccessAction" NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentAccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_refreshToken_key" ON "User"("refreshToken");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_name_key" ON "Profile"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_name_key" ON "Permission"("name");

-- CreateIndex
CREATE INDEX "ProfilePermission_permissionId_idx" ON "ProfilePermission"("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "ProfilePermission_profileId_permissionId_key" ON "ProfilePermission"("profileId", "permissionId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Culture_active_order_idx" ON "Culture"("active", "order");

-- CreateIndex
CREATE INDEX "Culture_description_idx" ON "Culture"("description");

-- CreateIndex
CREATE INDEX "Label_cultureId_idx" ON "Label"("cultureId");

-- CreateIndex
CREATE INDEX "Label_code_idx" ON "Label"("code");

-- CreateIndex
CREATE INDEX "Label_key_idx" ON "Label"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Label_cultureId_keyHash_key" ON "Label"("cultureId", "keyHash");

-- CreateIndex
CREATE UNIQUE INDEX "Label_cultureId_codeHash_key" ON "Label"("cultureId", "codeHash");

-- CreateIndex
CREATE INDEX "Company_createdByUserId_idx" ON "Company"("createdByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Company_cnpj_key" ON "Company"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "Company_tenantId_cnpj_key" ON "Company"("tenantId", "cnpj");

-- CreateIndex
CREATE INDEX "Establishment_companyId_mainCnae_idx" ON "Establishment"("companyId", "mainCnae");

-- CreateIndex
CREATE UNIQUE INDEX "EstablishmentCNAE_establishmentId_cnaeId_key" ON "EstablishmentCNAE"("establishmentId", "cnaeId");

-- CreateIndex
CREATE UNIQUE INDEX "CNAE_code_key" ON "CNAE"("code");

-- CreateIndex
CREATE INDEX "Employee_establishmentId_idx" ON "Employee"("establishmentId");

-- CreateIndex
CREATE INDEX "Employee_portalUserId_idx" ON "Employee"("portalUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_companyId_cpf_key" ON "Employee"("companyId", "cpf");

-- CreateIndex
CREATE UNIQUE INDEX "CBO_code_key" ON "CBO"("code");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentType_name_key" ON "DocumentType"("name");

-- CreateIndex
CREATE INDEX "DocumentType_kind_name_idx" ON "DocumentType"("kind", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Document_currentVersionId_key" ON "Document"("currentVersionId");

-- CreateIndex
CREATE INDEX "Document_establishmentId_typeId_idx" ON "Document"("establishmentId", "typeId");

-- CreateIndex
CREATE INDEX "Document_name_idx" ON "Document"("name");

-- CreateIndex
CREATE INDEX "Document_status_idx" ON "Document"("status");

-- CreateIndex
CREATE INDEX "DocumentRelation_toDocumentId_idx" ON "DocumentRelation"("toDocumentId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentRelation_fromDocumentId_toDocumentId_relationType_key" ON "DocumentRelation"("fromDocumentId", "toDocumentId", "relationType");

-- CreateIndex
CREATE INDEX "idx_doc_version_sequence" ON "DocumentVersion"("documentId", "versionNumber");

-- CreateIndex
CREATE INDEX "DocumentVersion_versionStatus_idx" ON "DocumentVersion"("versionStatus");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentVersion_documentId_versionNumber_key" ON "DocumentVersion"("documentId", "versionNumber");

-- CreateIndex
CREATE INDEX "DocumentView_documentId_documentVersionId_viewedAt_idx" ON "DocumentView"("documentId", "documentVersionId", "viewedAt");

-- CreateIndex
CREATE INDEX "DocumentView_userId_viewedAt_idx" ON "DocumentView"("userId", "viewedAt");

-- CreateIndex
CREATE INDEX "DocumentAccessLog_documentId_createdAt_idx" ON "DocumentAccessLog"("documentId", "createdAt");

-- CreateIndex
CREATE INDEX "DocumentAccessLog_documentVersionId_idx" ON "DocumentAccessLog"("documentVersionId");

-- CreateIndex
CREATE INDEX "DocumentAccessLog_userId_idx" ON "DocumentAccessLog"("userId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfilePermission" ADD CONSTRAINT "ProfilePermission_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfilePermission" ADD CONSTRAINT "ProfilePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Label" ADD CONSTRAINT "Label_cultureId_fkey" FOREIGN KEY ("cultureId") REFERENCES "Culture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Establishment" ADD CONSTRAINT "Establishment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstablishmentCNAE" ADD CONSTRAINT "EstablishmentCNAE_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstablishmentCNAE" ADD CONSTRAINT "EstablishmentCNAE_cnaeId_fkey" FOREIGN KEY ("cnaeId") REFERENCES "CNAE"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_portalUserId_fkey" FOREIGN KEY ("portalUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_cboId_fkey" FOREIGN KEY ("cboId") REFERENCES "CBO"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "DocumentVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "DocumentType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRelation" ADD CONSTRAINT "DocumentRelation_fromDocumentId_fkey" FOREIGN KEY ("fromDocumentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRelation" ADD CONSTRAINT "DocumentRelation_toDocumentId_fkey" FOREIGN KEY ("toDocumentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentView" ADD CONSTRAINT "DocumentView_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentView" ADD CONSTRAINT "DocumentView_documentVersionId_fkey" FOREIGN KEY ("documentVersionId") REFERENCES "DocumentVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentView" ADD CONSTRAINT "DocumentView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentAccessLog" ADD CONSTRAINT "DocumentAccessLog_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentAccessLog" ADD CONSTRAINT "DocumentAccessLog_documentVersionId_fkey" FOREIGN KEY ("documentVersionId") REFERENCES "DocumentVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentAccessLog" ADD CONSTRAINT "DocumentAccessLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
