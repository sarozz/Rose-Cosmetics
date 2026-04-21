/**
 * Telegram Bot API integration.
 *
 * Three call paths:
 *   - `notifySaleCompleted`: fan-out an instant ping after every completed
 *     sale. Goes to recipients with `notifySales` on.
 *   - `notifyLowStock`: fan-out a short alert when one or more products drop
 *     to/below their reorder level as a side-effect of a sale.
 *   - `sendDailySummary`: fan-out a daily recap, invoked by a Vercel cron.
 *
 * The bot token is optional. When `TELEGRAM_BOT_TOKEN` isn't set, every
 * send resolves to `{ ok: false, skipped: true }` — useful in dev and in
 * test environments where the owner hasn't wired up a bot yet.
 *
 * Sends are best-effort: a failed HTTP request is logged but does not
 * propagate to the caller (a sale must never fail because Telegram is
 * unreachable). Each send uses a 3s timeout so a slow Telegram response
 * cannot stall the checkout action.
 */

import { prisma } from "@/lib/prisma";

const API_BASE = "https://api.telegram.org";
const SEND_TIMEOUT_MS = 3000;

export type LowStockItem = {
  id: string;
  name: string;
  sku: string | null;
  currentStock: number;
  reorderLevel: number;
};

export type SendResult =
  | { ok: true; chatId: string }
  | { ok: false; chatId: string; error: string; skipped?: boolean };

/**
 * POST to Telegram's sendMessage endpoint. Returns a discriminated result so
 * callers can choose to log failures without branching on exception types.
 */
export async function sendTelegramMessage(
  chatId: string,
  text: string,
): Promise<SendResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return { ok: false, chatId, error: "bot token not configured", skipped: true };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);

  try {
    const res = await fetch(`${API_BASE}/bot${token}/sendMessage`, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return {
        ok: false,
        chatId,
        error: `HTTP ${res.status}: ${body.slice(0, 200)}`,
      };
    }
    const json = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      description?: string;
    };
    if (!json.ok) {
      return { ok: false, chatId, error: json.description ?? "unknown" };
    }
    return { ok: true, chatId };
  } catch (err) {
    return {
      ok: false,
      chatId,
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Send the same message to every enabled recipient whose preference flag
 * is on. Sends are run in parallel — Telegram comfortably handles our
 * fan-out volume (a handful of recipients).
 */
async function fanout(
  text: string,
  where: "notifySales" | "notifyStockReceipts",
): Promise<SendResult[]> {
  const recipients = await prisma.telegramRecipient.findMany({
    where: { enabled: true, [where]: true },
    select: { chatId: true },
  });
  if (recipients.length === 0) return [];
  return Promise.all(recipients.map((r) => sendTelegramMessage(r.chatId, text)));
}

/**
 * Fire a low-stock alert for one or more items that crossed the reorder
 * threshold during a sale. Call after the sale transaction commits —
 * never inside a Prisma transaction, since the network round-trip would
 * hold a DB connection.
 */
export async function notifyLowStock(
  saleRef: string,
  items: LowStockItem[],
): Promise<SendResult[]> {
  if (items.length === 0) return [];
  return fanout(renderLowStockMessage(saleRef, items), "notifyStockReceipts");
}

export function renderLowStockMessage(
  saleRef: string,
  items: LowStockItem[],
): string {
  const lines = items.map((item) => {
    const suffix = item.sku ? ` (${escapeHtml(item.sku)})` : "";
    return `• <b>${escapeHtml(item.name)}</b>${suffix} — ${item.currentStock} / ${item.reorderLevel}`;
  });
  return [
    "🚨 <b>Low stock alert</b>",
    ...lines,
    "",
    `After sale <code>${escapeHtml(saleRef)}</code>`,
  ].join("\n");
}

export type SaleCompletedItem = {
  name: string;
  qty: number;
};

export type SaleCompletedStats = {
  saleRef: string;
  /** Total as a decimal string — caller has already formatted to 2dp. */
  total: string;
  /** Sum of qty across all lines. */
  itemCount: number;
  cashierName: string;
  /** e.g. ["CASH"] today; ready for CARD/other later. */
  paymentLabels: string[];
  items: SaleCompletedItem[];
};

/**
 * Fire an instant alert after every completed sale. Fans out to recipients
 * with `notifySales` on — same flag as the daily summary, so a user who
 * cares about sales activity gets both.
 */
export async function notifySaleCompleted(
  stats: SaleCompletedStats,
): Promise<SendResult[]> {
  return fanout(renderSaleCompletedMessage(stats), "notifySales");
}

const SALE_ITEM_CAP = 5;

export function renderSaleCompletedMessage(stats: SaleCompletedStats): string {
  const summary = [
    `Rs <b>${escapeHtml(stats.total)}</b>`,
    stats.paymentLabels.length > 0
      ? stats.paymentLabels.map(escapeHtml).join("/")
      : null,
    `${stats.itemCount} item${stats.itemCount === 1 ? "" : "s"}`,
    escapeHtml(stats.cashierName),
  ]
    .filter((v): v is string => Boolean(v))
    .join(" · ");

  const lines = [
    `💰 <b>Sale</b> <code>${escapeHtml(stats.saleRef)}</code>`,
    summary,
  ];

  const shown = stats.items.slice(0, SALE_ITEM_CAP);
  for (const item of shown) {
    lines.push(`• ${escapeHtml(item.name)} × ${item.qty}`);
  }
  const remaining = stats.items.length - shown.length;
  if (remaining > 0) {
    lines.push(`• …and ${remaining} more`);
  }

  return lines.join("\n");
}

export type DailySummaryStats = {
  dateLabel: string;
  salesCount: number;
  salesTotal: string;
  cashTotal: string;
  cardTotal: string;
  otherTotal: string;
  topProduct: { name: string; qty: number } | null;
  lowStockCount: number;
};

export async function sendDailySummary(
  stats: DailySummaryStats,
): Promise<SendResult[]> {
  return fanout(renderDailySummary(stats), "notifySales");
}

export function renderDailySummary(stats: DailySummaryStats): string {
  const lines = [
    `📊 <b>Daily summary</b> — ${escapeHtml(stats.dateLabel)}`,
    "",
    `• Sales: <b>${stats.salesCount}</b> · total <b>Rs ${escapeHtml(stats.salesTotal)}</b>`,
  ];
  const payments: string[] = [];
  if (Number(stats.cashTotal) > 0) payments.push(`Cash Rs ${escapeHtml(stats.cashTotal)}`);
  if (Number(stats.cardTotal) > 0) payments.push(`Card Rs ${escapeHtml(stats.cardTotal)}`);
  if (Number(stats.otherTotal) > 0) payments.push(`Other Rs ${escapeHtml(stats.otherTotal)}`);
  if (payments.length > 0) lines.push(`• ${payments.join(" · ")}`);
  if (stats.topProduct) {
    lines.push(
      `• Top: <b>${escapeHtml(stats.topProduct.name)}</b> (${stats.topProduct.qty} sold)`,
    );
  }
  if (stats.lowStockCount > 0) {
    lines.push(`• Low stock: <b>${stats.lowStockCount}</b> item${stats.lowStockCount === 1 ? "" : "s"}`);
  }
  return lines.join("\n");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function isTelegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN);
}
