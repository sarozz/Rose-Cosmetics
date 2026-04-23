import { NextResponse } from "next/server";
import { REPORT_VIEW_ROLES, requireRole } from "@/lib/auth";
import {
  lowStock,
  paymentMethodSplit,
  salesByDay,
  salesByMonth,
  salesByWeek,
  topProducts,
  type ReportRange,
} from "@/lib/services/report";

/**
 * CSV exporter for the reports page. One endpoint, `kind` picks the
 * dataset and `range` sizes the window. Every response is text/csv with
 * Content-Disposition: attachment so the browser downloads rather than
 * rendering. Strings go through `csvEscape` to neutralise commas and
 * stray quotes so the file opens cleanly in Excel / Sheets.
 */

const KINDS = ["sales", "top-products", "payments", "low-stock"] as const;
type Kind = (typeof KINDS)[number];

function parseRange(raw: string | null): ReportRange {
  if (raw === "weekly" || raw === "monthly") return raw;
  return "daily";
}

function parseKind(raw: string | null): Kind {
  if (raw && (KINDS as readonly string[]).includes(raw)) return raw as Kind;
  return "sales";
}

function windowDays(range: ReportRange): number {
  if (range === "weekly") return 84;
  if (range === "monthly") return 365;
  return 30;
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (s.includes(",") || s.includes("\n") || s.includes('"')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCsv(rows: Array<Array<unknown>>): string {
  return rows.map((r) => r.map(csvEscape).join(",")).join("\n") + "\n";
}

function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  await requireRole(REPORT_VIEW_ROLES);

  const { searchParams } = new URL(request.url);
  const kind = parseKind(searchParams.get("kind"));
  const range = parseRange(searchParams.get("range"));

  let body: string;
  let filename: string;

  if (kind === "sales") {
    const rows =
      range === "weekly"
        ? await salesByWeek(12)
        : range === "monthly"
          ? await salesByMonth(12)
          : await salesByDay(30);
    const header = [
      range === "daily"
        ? "Date"
        : range === "weekly"
          ? "Week starting"
          : "Month",
      "Transactions",
      "Revenue",
    ];
    body = toCsv([
      header,
      ...rows.map((r) => [r.date, r.count, r.total]),
    ]);
    filename = `rose-sales-${range}-${todayStamp()}.csv`;
  } else if (kind === "top-products") {
    const rows = await topProducts(windowDays(range), 50);
    body = toCsv([
      ["Product", "Brand", "Barcode", "Units sold", "Revenue"],
      ...rows.map((r) => [r.name, r.brand, r.barcode, r.qty, r.revenue]),
    ]);
    filename = `rose-top-products-${range}-${todayStamp()}.csv`;
  } else if (kind === "payments") {
    const rows = await paymentMethodSplit(windowDays(range));
    body = toCsv([
      ["Method", "Total"],
      ...rows.map((r) => [r.method, r.total]),
    ]);
    filename = `rose-payments-${range}-${todayStamp()}.csv`;
  } else {
    const rows = await lowStock(200);
    body = toCsv([
      ["Product", "Brand", "Barcode", "On hand", "Reorder level"],
      ...rows.map((r) => [
        r.name,
        r.brand,
        r.barcode,
        r.currentStock,
        r.reorderLevel,
      ]),
    ]);
    filename = `rose-low-stock-${todayStamp()}.csv`;
  }

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
