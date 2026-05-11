-- Alternate barcodes for a product. Use when the same SKU (same price,
-- same stock) ships in multiple flavours and each has its own barcode.
-- The parent product still carries the primary `barcode` column; this
-- table is for *additional* codes that should resolve to the same row.

CREATE TABLE "product_barcodes" (
  "id" TEXT NOT NULL,
  "product_id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "label" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "product_barcodes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "product_barcodes_code_key" ON "product_barcodes" ("code");
CREATE INDEX "product_barcodes_product_id_idx" ON "product_barcodes" ("product_id");

ALTER TABLE "product_barcodes"
  ADD CONSTRAINT "product_barcodes_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
