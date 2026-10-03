-- CreateTable
CREATE TABLE "ClientMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientMembership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClientMembership_userId_isActive_idx" ON "ClientMembership"("userId", "isActive");

-- CreateIndex
CREATE INDEX "ClientMembership_clientId_isActive_idx" ON "ClientMembership"("clientId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ClientMembership_userId_clientId_key" ON "ClientMembership"("userId", "clientId");

-- AddForeignKey
ALTER TABLE "ClientMembership" ADD CONSTRAINT "ClientMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientMembership" ADD CONSTRAINT "ClientMembership_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
