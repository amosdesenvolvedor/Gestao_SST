-- CreateEnum
CREATE TYPE "ProfessionalType" AS ENUM ('OCCUPATIONAL_PHYSICIAN', 'SAFETY_ENGINEER', 'SAFETY_TECHNICIAN', 'OTHER');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastLoginAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Professional" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "cpf" TEXT,
    "professionalType" "ProfessionalType" NOT NULL,
    "councilType" TEXT,
    "councilNumber" TEXT,
    "councilState" TEXT,
    "specialty" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Professional_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Professional_userId_key" ON "Professional"("userId");

-- CreateIndex
CREATE INDEX "Professional_name_idx" ON "Professional"("name");

-- CreateIndex
CREATE INDEX "Professional_professionalType_idx" ON "Professional"("professionalType");

-- CreateIndex
CREATE INDEX "Professional_isActive_idx" ON "Professional"("isActive");

-- AddForeignKey
ALTER TABLE "Professional" ADD CONSTRAINT "Professional_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
