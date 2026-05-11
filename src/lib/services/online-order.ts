import { randomBytes } from "node:crypto";
import { revalidateTag } from "next/cache";
import { Prisma, type OnlineOrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "./audit";
import type {
  OnlineOrderCreateData,
  OnlineStatusUpdateData,
} from "@/lib/validation/online-order";
import { REPORT_TAGS } from "./report";
import { CATALOG_TAGS } from "./cache-tags";

export class OnlineOrderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OnlineOrderError";
  }
}

/**
 * State transitions are linear with one escape:
 *   CONFIRMED → PACKAGING → OUT_FOR_DELIVERY → DELIVERED
 * any non-terminal state can also go to CANCELLED. Cancelling restores
 * stock; DELIVERED is terminal.
 */
const STATE_GRAPH: Record<OnlineOrderStatus, OnlineOrderStatus[]> = {
  CONFIRMED: ["PACKAGING", "CANCELLED"],
  PACKAGING: ["OUT_FOR_DELIVERY", "CANCELLED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

export function nextStatuses(current: OnlineOrderStatus): OnlineOrderStatus[] {
  return STATE_GRAPH[current];
}

export async function listOnlineOrders(params?: { limit?: number }) {
  return prisma.onlineOrder.findMany({
    orderBy: { createdAt: "desc" },
    take: params?.limit ?? 100,
    include: {
      cashier: { select: { id: true, displayName: true } },
      _count: { select: { items: true } },
    },
  });
}

export async function getOnlineOrder(id: string) {
  return prisma.onlineOrder.findUnique({
    where: { id },
    include: {
      cashier: { select: { id: true, displayName: true } },
      items: {
        include: {
          product: { select: { id: true, name: true, brand: true, sku: true, barcode: true } },
        },
      },
      events: {
        orderBy: { createdAt: "asc" },
        include: {
          actor: { select: { id: true, displayName: true } },
        },
      },
    },
  });
}

export async function getByPublicToken(token: string) {
  return prisma.onlineOrder.findUnique({
    where: { publicToken: token },
    select: {
      orderRef: true,
      customerName: true,
      customerAddress: true,
      status: true,
      total: true,
      channel: true,
      createdAt: true,
      updatedAt: true,
      items: {
        select: {
          qty: true,
          lineTotal: true,
          unitPrice: true,
          product: { select: { name: true, brand: true } },
        },
      },
      events: {
        orderBy: { createdAt: "asc" },
        select: { status: true, note: true, createdAt: true },
      },
    },
  });
}

/**
 * Create a new online order. Same stock-deduction semantics as POS — every
 * line decrements product.currentStock and writes an InventoryMovement
 * with sourceTable="online_orders" so the inventory ledger stays in one
 * place. We refuse to oversell.
 */
export async function createOnlineOrder(
  actorUserId: string,
  data: OnlineOrderCreateData,
) {
  const result = await prisma.$transaction(
    async (tx) => {
    const orderRef = await generateOnlineOrderRef(tx);
    const publicToken = randomToken();

    const productIds = data.items.map((i) => i.productId);
    const products = await tx.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        name: true,
        currentStock: true,
        isActive: true,
      },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    let subtotal = new Prisma.Decimal(0);
    const lines = data.items.map((item) => {
      const product = byId.get(item.productId);
      if (!product || !product.isActive) {
        throw new OnlineOrderError("Product is unavailable");
      }
      if (product.currentStock < item.qty) {
        throw new OnlineOrderError(
          `Not enough stock for ${product.name} (have ${product.currentStock})`,
        );
      }
      const unit = new Prisma.Decimal(item.unitPrice);
      const lineTotal = unit.mul(item.qty);
      subtotal = subtotal.add(lineTotal);
      return {
        productId: item.productId,
        qty: item.qty,
        unitPrice: unit,
        lineTotal,
      };
    });

    const discount = new Prisma.Decimal(data.discount);
    if (discount.gt(subtotal)) {
      throw new OnlineOrderError("Discount exceeds subtotal");
    }
    const total = subtotal.sub(discount);

    const order = await tx.onlineOrder.create({
      data: {
        orderRef,
        publicToken,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerAddress: data.customerAddress,
        note: data.note,
        channel: data.channel,
        status: "CONFIRMED",
        subtotal,
        discount,
        total,
        cashierId: actorUserId,
        items: {
          create: lines.map((l) => ({
            productId: l.productId,
            qty: l.qty,
            unitPrice: l.unitPrice,
            lineTotal: l.lineTotal,
          })),
        },
        events: {
          create: {
            status: "CONFIRMED",
            actorId: actorUserId,
          },
        },
      },
    });

    await Promise.all(
      lines.flatMap((line) => [
        tx.product.update({
          where: { id: line.productId },
          data: { currentStock: { decrement: line.qty } },
        }),
        tx.inventoryMovement.create({
          data: {
            productId: line.productId,
            movementType: "SALE_OUT",
            qtyDelta: -line.qty,
            sourceTable: "online_orders",
            sourceId: order.id,
            createdById: actorUserId,
          },
        }),
      ]),
    );

    await writeAuditLog(tx, {
      actorUserId,
      entityType: "online_order",
      entityId: order.id,
      action: "CREATE",
      after: order,
    });

    return order;
    },
    { timeout: 30_000, maxWait: 10_000 },
  );

  revalidateTag(REPORT_TAGS.stock);
  revalidateTag(CATALOG_TAGS.STOCK);
  return result;
}

/**
 * Move the order to a new status. CANCELLED restores stock and writes
 * compensating inventory movements; other transitions are bookkeeping
 * only (the goods are still in motion).
 */
export async function updateOnlineOrderStatus(
  actorUserId: string,
  orderId: string,
  data: OnlineStatusUpdateData,
) {
  const order = await prisma.onlineOrder.findUnique({
    where: { id: orderId },
    include: { items: { select: { productId: true, qty: true } } },
  });
  if (!order) throw new OnlineOrderError("Order not found");
  if (!STATE_GRAPH[order.status].includes(data.status)) {
    throw new OnlineOrderError(
      `Cannot move from ${order.status} to ${data.status}`,
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    if (data.status === "CANCELLED") {
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { currentStock: { increment: item.qty } },
        });
        await tx.inventoryMovement.create({
          data: {
            productId: item.productId,
            movementType: "ADJUSTMENT_PLUS",
            qtyDelta: item.qty,
            sourceTable: "online_orders",
            sourceId: order.id,
            note: "Online order cancelled — stock restored",
            createdById: actorUserId,
          },
        });
      }
    }

    const updated = await tx.onlineOrder.update({
      where: { id: orderId },
      data: { status: data.status },
    });
    await tx.onlineOrderEvent.create({
      data: {
        orderId,
        status: data.status,
        note: data.note,
        actorId: actorUserId,
      },
    });
    await writeAuditLog(tx, {
      actorUserId,
      entityType: "online_order",
      entityId: orderId,
      action: "UPDATE",
      before: order,
      after: updated,
    });
    return updated;
  });

  if (data.status === "CANCELLED") {
    revalidateTag(REPORT_TAGS.stock);
    revalidateTag(CATALOG_TAGS.STOCK);
  }
  return result;
}

function randomToken(): string {
  // 16 hex chars (64 bits) — plenty of entropy for an unguessable URL
  // even with billions of orders.
  return randomBytes(8).toString("hex");
}

async function generateOnlineOrderRef(tx: Prisma.TransactionClient): Promise<string> {
  const now = new Date();
  const stamp = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(now.getUTCDate()).padStart(2, "0")}`;
  const prefix = `OL-${stamp}-`;

  const latest = await tx.onlineOrder.findFirst({
    where: { orderRef: { startsWith: prefix } },
    orderBy: { orderRef: "desc" },
    select: { orderRef: true },
  });
  const next = latest ? parseCounter(latest.orderRef) + 1 : 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}

function parseCounter(ref: string): number {
  const last = ref.split("-").pop();
  const n = Number.parseInt(last ?? "", 10);
  return Number.isFinite(n) ? n : 0;
}
