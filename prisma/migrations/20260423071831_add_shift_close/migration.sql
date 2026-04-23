-- CreateTable
CREATE TABLE "shift_closes" (
    "id" TEXT NOT NULL,
    "closedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedById" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "openingFloat" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "expectedCash" DECIMAL(12,2) NOT NULL,
    "countedCash" DECIMAL(12,2) NOT NULL,
    "variance" DECIMAL(12,2) NOT NULL,
    "cashSalesTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "digitalSalesTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "cardSalesTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "cashRefundsTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "salesCount" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,

    CONSTRAINT "shift_closes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shift_closes_closedAt_idx" ON "shift_closes"("closedAt");

-- AddForeignKey
ALTER TABLE "shift_closes" ADD CONSTRAINT "shift_closes_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
