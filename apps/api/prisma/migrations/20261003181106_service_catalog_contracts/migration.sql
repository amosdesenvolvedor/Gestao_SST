-- CreateEnum
CREATE TYPE "ServiceCategory" AS ENUM ('TECHNICAL_DOCUMENT', 'OCCUPATIONAL_HEALTH', 'OCCUPATIONAL_SAFETY', 'MANAGEMENT', 'TRAINING', 'CONSULTING', 'OTHER');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'READY_FOR_SIGNATURE', 'AWAITING_SIGNATURE', 'SIGNED', 'ACTIVE', 'EXPIRING', 'ENDED', 'TERMINATED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('PIX', 'CREDIT_CARD', 'BANK_TRANSFER', 'BOLETO', 'OTHER');

-- CreateTable
CREATE TABLE "ServiceCatalog" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "ServiceCategory" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "renewedFromId" TEXT,
    "contractNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "durationMonths" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "totalValue" DECIMAL(14,2) NOT NULL,
    "monthlyBaseValue" DECIMAL(14,2) NOT NULL,
    "dueDay" INTEGER NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractService" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "serviceCatalogId" TEXT NOT NULL,
    "serviceCodeSnapshot" TEXT NOT NULL,
    "serviceNameSnapshot" TEXT NOT NULL,
    "serviceDescriptionSnapshot" TEXT,
    "serviceCategorySnapshot" "ServiceCategory" NOT NULL,
    "descriptionOverride" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitValue" DECIMAL(14,2),
    "totalValue" DECIMAL(14,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractEstablishment" (
    "contractId" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractEstablishment_pkey" PRIMARY KEY ("contractId","establishmentId")
);

-- CreateIndex
CREATE UNIQUE INDEX "ServiceCatalog_code_key" ON "ServiceCatalog"("code");

-- CreateIndex
CREATE INDEX "ServiceCatalog_name_idx" ON "ServiceCatalog"("name");

-- CreateIndex
CREATE INDEX "ServiceCatalog_isActive_idx" ON "ServiceCatalog"("isActive");

-- CreateIndex
CREATE INDEX "ServiceCatalog_sortOrder_idx" ON "ServiceCatalog"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_contractNumber_key" ON "Contract"("contractNumber");

-- CreateIndex
CREATE INDEX "Contract_clientId_idx" ON "Contract"("clientId");

-- CreateIndex
CREATE INDEX "Contract_status_idx" ON "Contract"("status");

-- CreateIndex
CREATE INDEX "Contract_startDate_idx" ON "Contract"("startDate");

-- CreateIndex
CREATE INDEX "Contract_endDate_idx" ON "Contract"("endDate");

-- CreateIndex
CREATE INDEX "Contract_clientId_status_idx" ON "Contract"("clientId", "status");

-- CreateIndex
CREATE INDEX "ContractService_contractId_idx" ON "ContractService"("contractId");

-- CreateIndex
CREATE INDEX "ContractService_serviceCatalogId_idx" ON "ContractService"("serviceCatalogId");

-- CreateIndex
CREATE INDEX "ContractService_contractId_isActive_idx" ON "ContractService"("contractId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ContractService_contractId_serviceCatalogId_key" ON "ContractService"("contractId", "serviceCatalogId");

-- CreateIndex
CREATE INDEX "ContractEstablishment_contractId_idx" ON "ContractEstablishment"("contractId");

-- CreateIndex
CREATE INDEX "ContractEstablishment_establishmentId_idx" ON "ContractEstablishment"("establishmentId");

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_renewedFromId_fkey" FOREIGN KEY ("renewedFromId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractService" ADD CONSTRAINT "ContractService_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractService" ADD CONSTRAINT "ContractService_serviceCatalogId_fkey" FOREIGN KEY ("serviceCatalogId") REFERENCES "ServiceCatalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractEstablishment" ADD CONSTRAINT "ContractEstablishment_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractEstablishment" ADD CONSTRAINT "ContractEstablishment_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
