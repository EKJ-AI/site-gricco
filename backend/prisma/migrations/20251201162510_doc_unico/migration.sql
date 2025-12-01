/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `DocumentType` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "DocumentType_name_key" ON "DocumentType"("name");
