-- CreateTable
CREATE TABLE "Culture" (
    "id" TEXT NOT NULL,
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

    CONSTRAINT "Label_pkey" PRIMARY KEY ("id")
);

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
CREATE INDEX "Label_description_idx" ON "Label"("description");

-- CreateIndex
CREATE UNIQUE INDEX "Label_cultureId_key_key" ON "Label"("cultureId", "key");

-- AddForeignKey
ALTER TABLE "Label" ADD CONSTRAINT "Label_cultureId_fkey" FOREIGN KEY ("cultureId") REFERENCES "Culture"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
