-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ComponentType" AS ENUM ('FIXED_MESSAGE', 'BULLET_LIST', 'GROUPED_LIST');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiaryComponent" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ComponentType" NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiaryComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormVersion" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormVersionItem" (
    "id" TEXT NOT NULL,
    "formVersionId" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "overrides" JSONB,

    CONSTRAINT "FormVersionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiaryEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "goal" TEXT,
    "rating" INTEGER,
    "formVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiaryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiaryEntryValue" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "value" JSONB NOT NULL,

    CONSTRAINT "DiaryEntryValue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "DiaryComponent_key_key" ON "DiaryComponent"("key");

-- CreateIndex
CREATE INDEX "FormVersion_effectiveFrom_idx" ON "FormVersion"("effectiveFrom");

-- CreateIndex
CREATE INDEX "FormVersionItem_formVersionId_order_idx" ON "FormVersionItem"("formVersionId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "FormVersionItem_formVersionId_componentId_key" ON "FormVersionItem"("formVersionId", "componentId");

-- CreateIndex
CREATE INDEX "DiaryEntry_userId_date_idx" ON "DiaryEntry"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DiaryEntry_userId_date_key" ON "DiaryEntry"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DiaryEntryValue_entryId_componentId_key" ON "DiaryEntryValue"("entryId", "componentId");

-- AddForeignKey
ALTER TABLE "FormVersionItem" ADD CONSTRAINT "FormVersionItem_formVersionId_fkey" FOREIGN KEY ("formVersionId") REFERENCES "FormVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormVersionItem" ADD CONSTRAINT "FormVersionItem_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "DiaryComponent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiaryEntry" ADD CONSTRAINT "DiaryEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiaryEntry" ADD CONSTRAINT "DiaryEntry_formVersionId_fkey" FOREIGN KEY ("formVersionId") REFERENCES "FormVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiaryEntryValue" ADD CONSTRAINT "DiaryEntryValue_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "DiaryEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiaryEntryValue" ADD CONSTRAINT "DiaryEntryValue_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "DiaryComponent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
