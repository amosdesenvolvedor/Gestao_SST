-- CreateEnum
CREATE TYPE "CommercialPaymentModality" AS ENUM ('MONTHLY_RECURRING', 'ANNUAL_PIX_ADVANCE');

-- CreateEnum
CREATE TYPE "AnnualAdvanceBillingStatus" AS ENUM ('PENDING_PAYMENT', 'PAID', 'CANCELLED', 'FAILED', 'REVERSED');

-- CreateEnum
CREATE TYPE "AnnualAdvancePaymentStatus" AS ENUM ('NOT_CONFIRMED', 'CONFIRMED', 'REVERSED');

-- CreateTable
CREATE TABLE "ContractCommercialCondition" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "modality" "CommercialPaymentModality" NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "discountPercent" DECIMAL(5,2),
    "discountFixedAmount" DECIMAL(14,2) NOT NULL,
    "eligibleAmount" DECIMAL(14,2) NOT NULL,
    "discountAmount" DECIMAL(14,2) NOT NULL,
    "netAmount" DECIMAL(14,2) NOT NULL,
    "advanceMonths" INTEGER,
    "coverageStartDate" TIMESTAMP(3),
    "coverageEndDate" TIMESTAMP(3),
    "commercialJustification" TEXT NOT NULL,
    "grantedByUserId" TEXT NOT NULL,
    "supersededAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractCommercialCondition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnnualAdvanceCharge" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "commercialConditionId" TEXT NOT NULL,
    "referenceCode" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "internalReference" TEXT,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "grossAmount" DECIMAL(14,2) NOT NULL,
    "discountAmount" DECIMAL(14,2) NOT NULL,
    "netAmount" DECIMAL(14,2) NOT NULL,
    "coverageStartDate" TIMESTAMP(3) NOT NULL,
    "coverageEndDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "billingStatus" "AnnualAdvanceBillingStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "paymentStatus" "AnnualAdvancePaymentStatus" NOT NULL DEFAULT 'NOT_CONFIRMED',
    "paidAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "reversedAt" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "confirmedByUserId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnnualAdvanceCharge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnnualAdvanceChargeInstallment" (
    "annualAdvanceChargeId" TEXT NOT NULL,
    "installmentId" TEXT NOT NULL,
    "allocatedAmount" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnnualAdvanceChargeInstallment_pkey" PRIMARY KEY ("annualAdvanceChargeId","installmentId")
);

-- AlterTable
ALTER TABLE "Installment"
ADD COLUMN "discountAllocatedAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN "coveredByAdvance" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "commercialConditionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ContractCommercialCondition_contractId_version_key" ON "ContractCommercialCondition"("contractId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "AnnualAdvanceCharge_referenceCode_key" ON "AnnualAdvanceCharge"("referenceCode");

-- CreateIndex
CREATE UNIQUE INDEX "AnnualAdvanceCharge_idempotencyKey_key" ON "AnnualAdvanceCharge"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "AnnualAdvanceCharge_contractId_commercialConditionId_key" ON "AnnualAdvanceCharge"("contractId", "commercialConditionId");

-- CreateIndex
CREATE INDEX "AnnualAdvanceCharge_contractId_billingStatus_idx" ON "AnnualAdvanceCharge"("contractId", "billingStatus");

-- CreateIndex
CREATE INDEX "AnnualAdvanceCharge_commercialConditionId_idx" ON "AnnualAdvanceCharge"("commercialConditionId");

-- CreateIndex
CREATE INDEX "AnnualAdvanceCharge_dueDate_idx" ON "AnnualAdvanceCharge"("dueDate");

-- CreateIndex
CREATE INDEX "ContractCommercialCondition_contractId_isActive_idx" ON "ContractCommercialCondition"("contractId", "isActive");

-- CreateIndex
CREATE INDEX "ContractCommercialCondition_coverageStartDate_coverageEndDate_idx" ON "ContractCommercialCondition"("coverageStartDate", "coverageEndDate");

-- CreateIndex
CREATE INDEX "Installment_commercialConditionId_idx" ON "Installment"("commercialConditionId");

-- CreateIndex
CREATE INDEX "AnnualAdvanceChargeInstallment_installmentId_idx" ON "AnnualAdvanceChargeInstallment"("installmentId");

-- AddForeignKey
ALTER TABLE "ContractCommercialCondition" ADD CONSTRAINT "ContractCommercialCondition_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractCommercialCondition" ADD CONSTRAINT "ContractCommercialCondition_grantedByUserId_fkey" FOREIGN KEY ("grantedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnualAdvanceCharge" ADD CONSTRAINT "AnnualAdvanceCharge_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnualAdvanceCharge" ADD CONSTRAINT "AnnualAdvanceCharge_commercialConditionId_fkey" FOREIGN KEY ("commercialConditionId") REFERENCES "ContractCommercialCondition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnualAdvanceCharge" ADD CONSTRAINT "AnnualAdvanceCharge_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnualAdvanceCharge" ADD CONSTRAINT "AnnualAdvanceCharge_confirmedByUserId_fkey" FOREIGN KEY ("confirmedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Installment" ADD CONSTRAINT "Installment_commercialConditionId_fkey" FOREIGN KEY ("commercialConditionId") REFERENCES "ContractCommercialCondition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnualAdvanceChargeInstallment" ADD CONSTRAINT "AnnualAdvanceChargeInstallment_annualAdvanceChargeId_fkey" FOREIGN KEY ("annualAdvanceChargeId") REFERENCES "AnnualAdvanceCharge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnualAdvanceChargeInstallment" ADD CONSTRAINT "AnnualAdvanceChargeInstallment_installmentId_fkey" FOREIGN KEY ("installmentId") REFERENCES "Installment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
