/*
  Warnings:

  - You are about to drop the column `description` on the `Document` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "DocumentKind" AS ENUM ('MAIN', 'EVIDENCE');

-- CreateEnum
CREATE TYPE "DocumentRelationType" AS ENUM ('EVIDENCE', 'SUPPORTING', 'REPLACES', 'DERIVED_FROM');

-- DropIndex
DROP INDEX "DocumentType_name_key";

-- AlterTable
ALTER TABLE "Document" DROP COLUMN "description",
ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "DocumentType" ADD COLUMN     "kind" "DocumentKind" NOT NULL DEFAULT 'MAIN';

-- CreateTable
CREATE TABLE "DocumentRelation" (
    "id" TEXT NOT NULL,
    "fromDocumentId" TEXT NOT NULL,
    "toDocumentId" TEXT NOT NULL,
    "relationType" "DocumentRelationType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentRelation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentRelation_toDocumentId_idx" ON "DocumentRelation"("toDocumentId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentRelation_fromDocumentId_toDocumentId_relationType_key" ON "DocumentRelation"("fromDocumentId", "toDocumentId", "relationType");

-- CreateIndex
CREATE INDEX "DocumentType_kind_name_idx" ON "DocumentType"("kind", "name");

-- AddForeignKey
ALTER TABLE "DocumentRelation" ADD CONSTRAINT "DocumentRelation_fromDocumentId_fkey" FOREIGN KEY ("fromDocumentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRelation" ADD CONSTRAINT "DocumentRelation_toDocumentId_fkey" FOREIGN KEY ("toDocumentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
