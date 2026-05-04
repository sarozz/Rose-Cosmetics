-- AlterTable: settlement columns on purchases
ALTER TABLE "purchases"
  ADD COLUMN "debited"  DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "credit"   DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "vat"      DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "discount" DECIMAL(12,2) NOT NULL DEFAULT 0;
