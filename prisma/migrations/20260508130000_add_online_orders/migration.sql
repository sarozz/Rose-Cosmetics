CREATE TYPE "OnlineOrderStatus" AS ENUM (
  'CONFIRMED',
  'PACKAGING',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED'
);

CREATE TYPE "OnlineSalesChannel" AS ENUM (
  'TIKTOK',
  'INSTAGRAM',
  'WHATSAPP',
  'OTHER'
);

CREATE TABLE "online_orders" (
  "id" TEXT NOT NULL,
  "orderRef" TEXT NOT NULL,
  "public_token" TEXT NOT NULL,
  "customer_name" TEXT NOT NULL,
  "customer_phone" TEXT,
  "customer_address" TEXT NOT NULL,
  "note" TEXT,
  "channel" "OnlineSalesChannel" NOT NULL DEFAULT 'INSTAGRAM',
  "status" "OnlineOrderStatus" NOT NULL DEFAULT 'CONFIRMED',
  "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "total"    DECIMAL(12,2) NOT NULL DEFAULT 0,
  "cashier_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "online_orders_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "online_orders_orderRef_key" ON "online_orders"("orderRef");
CREATE UNIQUE INDEX "online_orders_public_token_key" ON "online_orders"("public_token");
CREATE INDEX "online_orders_status_created_at_idx" ON "online_orders"("status", "created_at");

ALTER TABLE "online_orders"
  ADD CONSTRAINT "online_orders_cashier_id_fkey"
  FOREIGN KEY ("cashier_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "online_order_items" (
  "id" TEXT NOT NULL,
  "order_id" TEXT NOT NULL,
  "product_id" TEXT NOT NULL,
  "qty" INTEGER NOT NULL,
  "unit_price" DECIMAL(12,2) NOT NULL,
  "line_total" DECIMAL(12,2) NOT NULL,
  CONSTRAINT "online_order_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "online_order_items_order_id_idx" ON "online_order_items"("order_id");
CREATE INDEX "online_order_items_product_id_idx" ON "online_order_items"("product_id");

ALTER TABLE "online_order_items"
  ADD CONSTRAINT "online_order_items_order_id_fkey"
  FOREIGN KEY ("order_id") REFERENCES "online_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "online_order_items"
  ADD CONSTRAINT "online_order_items_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "online_order_events" (
  "id" TEXT NOT NULL,
  "order_id" TEXT NOT NULL,
  "status" "OnlineOrderStatus" NOT NULL,
  "note" TEXT,
  "actor_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "online_order_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "online_order_events_order_id_created_at_idx"
  ON "online_order_events"("order_id", "created_at");

ALTER TABLE "online_order_events"
  ADD CONSTRAINT "online_order_events_order_id_fkey"
  FOREIGN KEY ("order_id") REFERENCES "online_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "online_order_events"
  ADD CONSTRAINT "online_order_events_actor_id_fkey"
  FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
