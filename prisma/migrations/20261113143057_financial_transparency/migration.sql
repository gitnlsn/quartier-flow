-- AlterTable
ALTER TABLE "Condominium" ADD COLUMN     "openingBalanceCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "openingBalanceDate" DATE;

-- CreateTable
CREATE TABLE "BalanceSheet" (
    "id" TEXT NOT NULL,
    "condominiumId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "snapshot" JSONB,
    "notes" TEXT,
    "publishedAt" TIMESTAMP(3),
    "publishedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BalanceSheet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BalanceSheet_condominiumId_status_idx" ON "BalanceSheet"("condominiumId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "BalanceSheet_condominiumId_period_key" ON "BalanceSheet"("condominiumId", "period");

-- AddForeignKey
ALTER TABLE "BalanceSheet" ADD CONSTRAINT "BalanceSheet_condominiumId_fkey" FOREIGN KEY ("condominiumId") REFERENCES "Condominium"("id") ON DELETE CASCADE ON UPDATE CASCADE;
