-- CreateEnum
CREATE TYPE "ExternalPaymentProvider" AS ENUM ('MERCADO_PAGO');

-- CreateEnum
CREATE TYPE "ExternalPaymentIntegrationStatus" AS ENUM (
  'NOT_REQUESTED',
  'PENDING_PROVIDER',
  'PENDING_RECONCILIATION',
  'CONFIRMED',
  'FAILED',
  'CANCELLED',
  'REFUNDED'
);

-- CreateEnum
CREATE TYPE "WebhookProcessingStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'IGNORED', 'FAILED');

-- CreateTable
CREATE TABLE "AnnualAdvanceExternalPayment" (
  "id" TEXT NOT NULL,
  "annualAdvanceChargeId" TEXT NOT NULL,
  "provider" "ExternalPaymentProvider" NOT NULL,
  "integrationStatus" "ExternalPaymentIntegrationStatus" NOT NULL DEFAULT 'NOT_REQUESTED',
  "externalPaymentId" TEXT,
  "externalOrderId" TEXT,
  "externalReference" TEXT NOT NULL,
  "externalIdempotencyKey" TEXT NOT NULL,
  "lastProviderStatus" TEXT,
  "lastProviderStatusDetail" TEXT,
  "lastProviderStatusAt" TIMESTAMP(3),
  "lastWebhookAt" TIMESTAMP(3),
  "lastSyncedAt" TIMESTAMP(3),
  "lastErrorCode" TEXT,
  "lastErrorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AnnualAdvanceExternalPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentProviderWebhookEvent" (
  "id" TEXT NOT NULL,
  "provider" "ExternalPaymentProvider" NOT NULL,
  "topic" TEXT,
  "action" TEXT,
  "eventId" TEXT,
  "resourceId" TEXT,
  "xRequestId" TEXT,
  "signatureTs" TEXT,
  "dedupeKey" TEXT NOT NULL,
  "payload" JSONB,
  "processingStatus" "WebhookProcessingStatus" NOT NULL DEFAULT 'RECEIVED',
  "processingError" TEXT,
  "processedAt" TIMESTAMP(3),
  "annualAdvanceExternalPaymentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PaymentProviderWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AnnualAdvanceExternalPayment_annualAdvanceChargeId_key" ON "AnnualAdvanceExternalPayment"("annualAdvanceChargeId");

-- CreateIndex
CREATE UNIQUE INDEX "AnnualAdvanceExternalPayment_externalPaymentId_key" ON "AnnualAdvanceExternalPayment"("externalPaymentId");

-- CreateIndex
CREATE INDEX "AnnualAdvanceExternalPayment_provider_integrationStatus_idx" ON "AnnualAdvanceExternalPayment"("provider", "integrationStatus");

-- CreateIndex
CREATE INDEX "AnnualAdvanceExternalPayment_provider_externalPaymentId_idx" ON "AnnualAdvanceExternalPayment"("provider", "externalPaymentId");

-- CreateIndex
CREATE INDEX "AnnualAdvanceExternalPayment_provider_externalReference_idx" ON "AnnualAdvanceExternalPayment"("provider", "externalReference");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentProviderWebhookEvent_dedupeKey_key" ON "PaymentProviderWebhookEvent"("dedupeKey");

-- CreateIndex
CREATE INDEX "PaymentProviderWebhookEvent_provider_resourceId_idx" ON "PaymentProviderWebhookEvent"("provider", "resourceId");

-- CreateIndex
CREATE INDEX "PaymentProviderWebhookEvent_provider_eventId_idx" ON "PaymentProviderWebhookEvent"("provider", "eventId");

-- CreateIndex
CREATE INDEX "PaymentProviderWebhookEvent_processingStatus_createdAt_idx" ON "PaymentProviderWebhookEvent"("processingStatus", "createdAt");

-- AddForeignKey
ALTER TABLE "AnnualAdvanceExternalPayment" ADD CONSTRAINT "AnnualAdvanceExternalPayment_annualAdvanceChargeId_fkey" FOREIGN KEY ("annualAdvanceChargeId") REFERENCES "AnnualAdvanceCharge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentProviderWebhookEvent" ADD CONSTRAINT "PaymentProviderWebhookEvent_annualAdvanceExternalPaymentId_fkey" FOREIGN KEY ("annualAdvanceExternalPaymentId") REFERENCES "AnnualAdvanceExternalPayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
