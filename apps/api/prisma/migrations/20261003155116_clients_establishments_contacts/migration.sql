-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('CNPJ', 'CPF', 'OTHER');

-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('PROSPECT', 'ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "EstablishmentStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "tradeName" TEXT,
    "taxIdType" "DocumentType",
    "taxIdNumberNormalized" TEXT,
    "stateRegistration" TEXT,
    "municipalRegistration" TEXT,
    "cnaeMain" TEXT,
    "cnaeSecondary" TEXT[],
    "sizeCategory" TEXT,
    "status" "ClientStatus" NOT NULL DEFAULT 'PROSPECT',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Establishment" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "nickname" TEXT,
    "taxIdType" "DocumentType",
    "taxIdNumberNormalized" TEXT,
    "stateRegistration" TEXT,
    "isHeadquarters" BOOLEAN NOT NULL DEFAULT false,
    "status" "EstablishmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "cnaeMain" TEXT,
    "cnaeSecondary" TEXT[],
    "employeeCount" INTEGER,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "postalCode" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "complement" TEXT,
    "neighborhood" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Establishment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientContact" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "department" TEXT,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "preferredChannel" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "receivesBilling" BOOLEAN NOT NULL DEFAULT false,
    "receivesReports" BOOLEAN NOT NULL DEFAULT false,
    "receivesAlerts" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientContact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Client_taxIdNumberNormalized_key" ON "Client"("taxIdNumberNormalized");

-- CreateIndex
CREATE INDEX "Client_legalName_idx" ON "Client"("legalName");

-- CreateIndex
CREATE INDEX "Client_status_idx" ON "Client"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Establishment_taxIdNumberNormalized_key" ON "Establishment"("taxIdNumberNormalized");

-- CreateIndex
CREATE INDEX "Establishment_clientId_status_idx" ON "Establishment"("clientId", "status");

-- CreateIndex
CREATE INDEX "Establishment_clientId_city_idx" ON "Establishment"("clientId", "city");

-- CreateIndex
CREATE INDEX "Establishment_clientId_state_idx" ON "Establishment"("clientId", "state");

-- CreateIndex
CREATE INDEX "Establishment_clientId_isHeadquarters_idx" ON "Establishment"("clientId", "isHeadquarters");

-- CreateIndex
CREATE INDEX "ClientContact_clientId_isActive_idx" ON "ClientContact"("clientId", "isActive");

-- CreateIndex
CREATE INDEX "ClientContact_clientId_isPrimary_idx" ON "ClientContact"("clientId", "isPrimary");

-- AddForeignKey
ALTER TABLE "Establishment" ADD CONSTRAINT "Establishment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientContact" ADD CONSTRAINT "ClientContact_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
