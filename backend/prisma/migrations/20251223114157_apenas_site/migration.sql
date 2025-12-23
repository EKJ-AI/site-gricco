/*
  Warnings:

  - You are about to drop the `CBO` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CNAE` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Company` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Department` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Document` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DocumentAccessLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DocumentRelation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DocumentType` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DocumentVersion` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DocumentView` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Employee` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Establishment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EstablishmentCNAE` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "BlogPostStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "BlogPostType" AS ENUM ('NEWS', 'ARTICLE', 'PAGE');

-- DropForeignKey
ALTER TABLE "Company" DROP CONSTRAINT "Company_createdByUserId_fkey";

-- DropForeignKey
ALTER TABLE "Department" DROP CONSTRAINT "Department_establishmentId_fkey";

-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_currentVersionId_fkey";

-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_establishmentId_fkey";

-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_typeId_fkey";

-- DropForeignKey
ALTER TABLE "DocumentAccessLog" DROP CONSTRAINT "DocumentAccessLog_documentId_fkey";

-- DropForeignKey
ALTER TABLE "DocumentAccessLog" DROP CONSTRAINT "DocumentAccessLog_documentVersionId_fkey";

-- DropForeignKey
ALTER TABLE "DocumentAccessLog" DROP CONSTRAINT "DocumentAccessLog_userId_fkey";

-- DropForeignKey
ALTER TABLE "DocumentRelation" DROP CONSTRAINT "DocumentRelation_fromDocumentId_fkey";

-- DropForeignKey
ALTER TABLE "DocumentRelation" DROP CONSTRAINT "DocumentRelation_toDocumentId_fkey";

-- DropForeignKey
ALTER TABLE "DocumentVersion" DROP CONSTRAINT "DocumentVersion_documentId_fkey";

-- DropForeignKey
ALTER TABLE "DocumentVersion" DROP CONSTRAINT "DocumentVersion_uploadedByUserId_fkey";

-- DropForeignKey
ALTER TABLE "DocumentView" DROP CONSTRAINT "DocumentView_documentId_fkey";

-- DropForeignKey
ALTER TABLE "DocumentView" DROP CONSTRAINT "DocumentView_documentVersionId_fkey";

-- DropForeignKey
ALTER TABLE "DocumentView" DROP CONSTRAINT "DocumentView_userId_fkey";

-- DropForeignKey
ALTER TABLE "Employee" DROP CONSTRAINT "Employee_cboId_fkey";

-- DropForeignKey
ALTER TABLE "Employee" DROP CONSTRAINT "Employee_companyId_fkey";

-- DropForeignKey
ALTER TABLE "Employee" DROP CONSTRAINT "Employee_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "Employee" DROP CONSTRAINT "Employee_establishmentId_fkey";

-- DropForeignKey
ALTER TABLE "Employee" DROP CONSTRAINT "Employee_portalUserId_fkey";

-- DropForeignKey
ALTER TABLE "Establishment" DROP CONSTRAINT "Establishment_companyId_fkey";

-- DropForeignKey
ALTER TABLE "EstablishmentCNAE" DROP CONSTRAINT "EstablishmentCNAE_cnaeId_fkey";

-- DropForeignKey
ALTER TABLE "EstablishmentCNAE" DROP CONSTRAINT "EstablishmentCNAE_establishmentId_fkey";

-- DropTable
DROP TABLE "CBO";

-- DropTable
DROP TABLE "CNAE";

-- DropTable
DROP TABLE "Company";

-- DropTable
DROP TABLE "Department";

-- DropTable
DROP TABLE "Document";

-- DropTable
DROP TABLE "DocumentAccessLog";

-- DropTable
DROP TABLE "DocumentRelation";

-- DropTable
DROP TABLE "DocumentType";

-- DropTable
DROP TABLE "DocumentVersion";

-- DropTable
DROP TABLE "DocumentView";

-- DropTable
DROP TABLE "Employee";

-- DropTable
DROP TABLE "Establishment";

-- DropTable
DROP TABLE "EstablishmentCNAE";

-- DropEnum
DROP TYPE "DocumentAccessAction";

-- DropEnum
DROP TYPE "DocumentKind";

-- DropEnum
DROP TYPE "DocumentRelationType";

-- DropEnum
DROP TYPE "DocumentStatus";

-- DropEnum
DROP TYPE "DocumentVersionStatus";

-- DropEnum
DROP TYPE "EstablishmentDocumentRole";

-- CreateTable
CREATE TABLE "BlogPost" (
    "id" TEXT NOT NULL,
    "type" "BlogPostType" NOT NULL DEFAULT 'ARTICLE',
    "status" "BlogPostStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "summary" TEXT,
    "content" TEXT,
    "coverImageUrl" TEXT,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "readingTimeMinutes" INTEGER,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "authorId" INTEGER NOT NULL,
    "lastEditorId" INTEGER,
    "publishedAt" TIMESTAMP(3),
    "scheduledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "BlogPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "BlogCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogPostCategory" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "BlogPostCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogTag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "BlogTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogPostTag" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "BlogPostTag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BlogPost_status_type_publishedAt_idx" ON "BlogPost"("status", "type", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "BlogPost_slug_key" ON "BlogPost"("slug");

-- CreateIndex
CREATE INDEX "BlogCategory_name_idx" ON "BlogCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "BlogCategory_slug_key" ON "BlogCategory"("slug");

-- CreateIndex
CREATE INDEX "BlogPostCategory_categoryId_idx" ON "BlogPostCategory"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "BlogPostCategory_postId_categoryId_key" ON "BlogPostCategory"("postId", "categoryId");

-- CreateIndex
CREATE INDEX "BlogTag_name_idx" ON "BlogTag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "BlogTag_slug_key" ON "BlogTag"("slug");

-- CreateIndex
CREATE INDEX "BlogPostTag_tagId_idx" ON "BlogPostTag"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "BlogPostTag_postId_tagId_key" ON "BlogPostTag"("postId", "tagId");

-- AddForeignKey
ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_lastEditorId_fkey" FOREIGN KEY ("lastEditorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogPostCategory" ADD CONSTRAINT "BlogPostCategory_postId_fkey" FOREIGN KEY ("postId") REFERENCES "BlogPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogPostCategory" ADD CONSTRAINT "BlogPostCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "BlogCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogPostTag" ADD CONSTRAINT "BlogPostTag_postId_fkey" FOREIGN KEY ("postId") REFERENCES "BlogPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogPostTag" ADD CONSTRAINT "BlogPostTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "BlogTag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
