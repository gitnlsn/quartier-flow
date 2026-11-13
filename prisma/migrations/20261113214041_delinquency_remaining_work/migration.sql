-- AlterTable
ALTER TABLE "Administradora" ADD COLUMN     "reminderSender" TEXT NOT NULL DEFAULT 'asaas';

-- AlterTable
ALTER TABLE "Agreement" ADD COLUMN     "replacesId" TEXT;

-- AlterTable
ALTER TABLE "BillingConfig" ADD COLUMN     "agreementAutoBreakDays" INTEGER;

-- CreateTable
CREATE TABLE "CollectionStep" (
    "id" TEXT NOT NULL,
    "condominiumId" TEXT NOT NULL,
    "offsetDays" INTEGER NOT NULL,
    "audience" TEXT NOT NULL DEFAULT 'payer',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollectionStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReminderLog" (
    "id" TEXT NOT NULL,
    "chargeId" TEXT NOT NULL,
    "offsetDays" INTEGER NOT NULL,
    "audience" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReminderLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionCase" (
    "id" TEXT NOT NULL,
    "condominiumId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'extrajudicial',
    "handler" TEXT,
    "openedById" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollectionCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionEvent" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "text" TEXT,
    "fileKey" TEXT,
    "fileName" TEXT,
    "fileType" TEXT,
    "fileSize" INTEGER,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CollectionStep_condominiumId_offsetDays_audience_key" ON "CollectionStep"("condominiumId", "offsetDays", "audience");

-- CreateIndex
CREATE UNIQUE INDEX "ReminderLog_chargeId_offsetDays_audience_key" ON "ReminderLog"("chargeId", "offsetDays", "audience");

-- CreateIndex
CREATE INDEX "CollectionCase_condominiumId_idx" ON "CollectionCase"("condominiumId");

-- CreateIndex
CREATE INDEX "CollectionCase_unitId_idx" ON "CollectionCase"("unitId");

-- CreateIndex
CREATE INDEX "CollectionEvent_caseId_createdAt_idx" ON "CollectionEvent"("caseId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Agreement_replacesId_key" ON "Agreement"("replacesId");

-- AddForeignKey
ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_replacesId_fkey" FOREIGN KEY ("replacesId") REFERENCES "Agreement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionStep" ADD CONSTRAINT "CollectionStep_condominiumId_fkey" FOREIGN KEY ("condominiumId") REFERENCES "Condominium"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReminderLog" ADD CONSTRAINT "ReminderLog_chargeId_fkey" FOREIGN KEY ("chargeId") REFERENCES "Charge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionCase" ADD CONSTRAINT "CollectionCase_condominiumId_fkey" FOREIGN KEY ("condominiumId") REFERENCES "Condominium"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionCase" ADD CONSTRAINT "CollectionCase_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionEvent" ADD CONSTRAINT "CollectionEvent_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "CollectionCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

