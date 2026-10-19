-- CreateEnum
CREATE TYPE "SstIndoorOutdoorType" AS ENUM ('INDOOR', 'OUTDOOR', 'MIXED');

-- CreateEnum
CREATE TYPE "SstScheduleType" AS ENUM ('FIXED', 'SHIFT', 'FLEX', 'OTHER');

-- CreateEnum
CREATE TYPE "SstActivityFrequency" AS ENUM ('ROUTINE', 'NON_ROUTINE', 'EVENTUAL');

-- CreateTable
CREATE TABLE "SstSector" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SstSector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SstWorkEnvironment" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "sectorId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "indoorOutdoorType" "SstIndoorOutdoorType" NOT NULL DEFAULT 'INDOOR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SstWorkEnvironment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SstRole" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "cboCode" TEXT,
    "cboDescription" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SstRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SstActivity" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "frequency" "SstActivityFrequency" NOT NULL DEFAULT 'ROUTINE',
    "description" TEXT,
    "isCritical" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SstActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SstWorkSchedule" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scheduleType" "SstScheduleType" NOT NULL DEFAULT 'FIXED',
    "weeklyHours" DECIMAL(5,2),
    "shiftPattern" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SstWorkSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SstSector_clientId_isActive_idx" ON "SstSector"("clientId", "isActive");

-- CreateIndex
CREATE INDEX "SstSector_establishmentId_isActive_idx" ON "SstSector"("establishmentId", "isActive");

-- CreateIndex
CREATE INDEX "SstSector_name_idx" ON "SstSector"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SstSector_establishmentId_code_key" ON "SstSector"("establishmentId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "SstSector_clientId_establishmentId_id_key" ON "SstSector"("clientId", "establishmentId", "id");

-- CreateIndex
CREATE INDEX "SstWorkEnvironment_clientId_isActive_idx" ON "SstWorkEnvironment"("clientId", "isActive");

-- CreateIndex
CREATE INDEX "SstWorkEnvironment_establishmentId_isActive_idx" ON "SstWorkEnvironment"("establishmentId", "isActive");

-- CreateIndex
CREATE INDEX "SstWorkEnvironment_sectorId_isActive_idx" ON "SstWorkEnvironment"("sectorId", "isActive");

-- CreateIndex
CREATE INDEX "SstWorkEnvironment_name_idx" ON "SstWorkEnvironment"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SstWorkEnvironment_sectorId_code_key" ON "SstWorkEnvironment"("sectorId", "code");

-- CreateIndex
CREATE INDEX "SstRole_clientId_isActive_idx" ON "SstRole"("clientId", "isActive");

-- CreateIndex
CREATE INDEX "SstRole_title_idx" ON "SstRole"("title");

-- CreateIndex
CREATE INDEX "SstRole_cboCode_idx" ON "SstRole"("cboCode");

-- CreateIndex
CREATE UNIQUE INDEX "SstRole_clientId_id_key" ON "SstRole"("clientId", "id");

-- CreateIndex
CREATE INDEX "SstActivity_clientId_isActive_idx" ON "SstActivity"("clientId", "isActive");

-- CreateIndex
CREATE INDEX "SstActivity_roleId_isActive_idx" ON "SstActivity"("roleId", "isActive");

-- CreateIndex
CREATE INDEX "SstActivity_title_idx" ON "SstActivity"("title");

-- CreateIndex
CREATE UNIQUE INDEX "SstActivity_roleId_title_key" ON "SstActivity"("roleId", "title");

-- CreateIndex
CREATE INDEX "SstWorkSchedule_clientId_isActive_idx" ON "SstWorkSchedule"("clientId", "isActive");

-- CreateIndex
CREATE INDEX "SstWorkSchedule_establishmentId_isActive_idx" ON "SstWorkSchedule"("establishmentId", "isActive");

-- CreateIndex
CREATE INDEX "SstWorkSchedule_scheduleType_idx" ON "SstWorkSchedule"("scheduleType");

-- CreateIndex
CREATE UNIQUE INDEX "SstWorkSchedule_establishmentId_name_key" ON "SstWorkSchedule"("establishmentId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Establishment_clientId_id_key" ON "Establishment"("clientId", "id");

-- AddForeignKey
ALTER TABLE "SstSector" ADD CONSTRAINT "SstSector_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SstSector" ADD CONSTRAINT "SstSector_clientId_establishmentId_fkey" FOREIGN KEY ("clientId", "establishmentId") REFERENCES "Establishment"("clientId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SstWorkEnvironment" ADD CONSTRAINT "SstWorkEnvironment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SstWorkEnvironment" ADD CONSTRAINT "SstWorkEnvironment_clientId_establishmentId_fkey" FOREIGN KEY ("clientId", "establishmentId") REFERENCES "Establishment"("clientId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SstWorkEnvironment" ADD CONSTRAINT "SstWorkEnvironment_clientId_establishmentId_sectorId_fkey" FOREIGN KEY ("clientId", "establishmentId", "sectorId") REFERENCES "SstSector"("clientId", "establishmentId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SstRole" ADD CONSTRAINT "SstRole_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SstActivity" ADD CONSTRAINT "SstActivity_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SstActivity" ADD CONSTRAINT "SstActivity_clientId_roleId_fkey" FOREIGN KEY ("clientId", "roleId") REFERENCES "SstRole"("clientId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SstWorkSchedule" ADD CONSTRAINT "SstWorkSchedule_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SstWorkSchedule" ADD CONSTRAINT "SstWorkSchedule_clientId_establishmentId_fkey" FOREIGN KEY ("clientId", "establishmentId") REFERENCES "Establishment"("clientId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

