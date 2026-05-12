-- Online orders can be PREPAID (already settled — Esewa, bank transfer,
-- cash in advance) or COD (courier collects on arrival). Default COD
-- because that's the common case for DM-driven orders.

CREATE TYPE "OnlinePaymentMode" AS ENUM ('PREPAID', 'COD');

ALTER TABLE "online_orders"
  ADD COLUMN "payment_mode" "OnlinePaymentMode" NOT NULL DEFAULT 'COD';
