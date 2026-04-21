import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  renderDailySummary,
  renderLowStockMessage,
  renderSaleCompletedMessage,
  sendTelegramMessage,
} from "../../src/lib/services/telegram";

const originalFetch = globalThis.fetch;

function mockFetch(impl: typeof fetch) {
  globalThis.fetch = impl as unknown as typeof fetch;
}

beforeEach(() => {
  delete process.env.TELEGRAM_BOT_TOKEN;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
  delete process.env.TELEGRAM_BOT_TOKEN;
});

describe("renderLowStockMessage", () => {
  it("formats multiple items with stock over reorder ratio", () => {
    const msg = renderLowStockMessage("SALE-2026-0001", [
      {
        id: "p1",
        name: "Ruby Lipstick",
        sku: "SKU-001",
        currentStock: 2,
        reorderLevel: 10,
      },
      {
        id: "p2",
        name: "Nude Blush",
        sku: null,
        currentStock: 0,
        reorderLevel: 5,
      },
    ]);
    expect(msg).toContain("🚨 <b>Low stock alert</b>");
    expect(msg).toContain("<b>Ruby Lipstick</b> (SKU-001) — 2 / 10");
    expect(msg).toContain("<b>Nude Blush</b> — 0 / 5");
    expect(msg).toContain("<code>SALE-2026-0001</code>");
  });

  it("HTML-escapes product names to prevent injection", () => {
    const msg = renderLowStockMessage("S-1", [
      {
        id: "p1",
        name: "Evil <script>alert(1)</script>",
        sku: null,
        currentStock: 0,
        reorderLevel: 1,
      },
    ]);
    expect(msg).toContain("Evil &lt;script&gt;");
    expect(msg).not.toContain("<script>");
  });
});

describe("renderDailySummary", () => {
  it("includes payment split, top product, and low-stock count", () => {
    const msg = renderDailySummary({
      dateLabel: "2026-04-20",
      salesCount: 34,
      salesTotal: "12450.00",
      cashTotal: "8200.00",
      cardTotal: "4250.00",
      otherTotal: "0.00",
      topProduct: { name: "Ruby Lipstick", qty: 12 },
      lowStockCount: 3,
    });
    expect(msg).toContain("2026-04-20");
    expect(msg).toContain("Sales: <b>34</b>");
    expect(msg).toContain("Rs 12450.00");
    expect(msg).toContain("Cash Rs 8200.00");
    expect(msg).toContain("Card Rs 4250.00");
    expect(msg).not.toContain("Other Rs");
    expect(msg).toContain("Ruby Lipstick");
    expect(msg).toContain("Low stock: <b>3</b> items");
  });

  it("omits sections that are zero", () => {
    const msg = renderDailySummary({
      dateLabel: "2026-04-20",
      salesCount: 0,
      salesTotal: "0.00",
      cashTotal: "0.00",
      cardTotal: "0.00",
      otherTotal: "0.00",
      topProduct: null,
      lowStockCount: 0,
    });
    expect(msg).not.toContain("Cash Rs");
    expect(msg).not.toContain("Top:");
    expect(msg).not.toContain("Low stock:");
  });

  it("uses singular 'item' when low stock count is 1", () => {
    const msg = renderDailySummary({
      dateLabel: "2026-04-20",
      salesCount: 1,
      salesTotal: "10.00",
      cashTotal: "10.00",
      cardTotal: "0.00",
      otherTotal: "0.00",
      topProduct: null,
      lowStockCount: 1,
    });
    expect(msg).toContain("Low stock: <b>1</b> item");
    expect(msg).not.toContain("1</b> items");
  });
});

describe("renderSaleCompletedMessage", () => {
  it("formats header, summary, and item list", () => {
    const msg = renderSaleCompletedMessage({
      saleRef: "S-2026-0142",
      total: "1234.56",
      itemCount: 3,
      cashierName: "Jane",
      paymentLabels: ["CASH"],
      items: [
        { name: "Ruby Lipstick", qty: 2 },
        { name: "Foundation", qty: 1 },
      ],
    });
    expect(msg).toContain("💰 <b>Sale</b> <code>S-2026-0142</code>");
    expect(msg).toContain("Rs <b>1234.56</b>");
    expect(msg).toContain("CASH");
    expect(msg).toContain("3 items");
    expect(msg).toContain("Jane");
    expect(msg).toContain("• Ruby Lipstick × 2");
    expect(msg).toContain("• Foundation × 1");
  });

  it("caps the item list and summarises the remainder", () => {
    const items = Array.from({ length: 8 }, (_, i) => ({
      name: `Item ${i + 1}`,
      qty: 1,
    }));
    const msg = renderSaleCompletedMessage({
      saleRef: "S-1",
      total: "80.00",
      itemCount: 8,
      cashierName: "Jane",
      paymentLabels: ["CASH"],
      items,
    });
    expect(msg).toContain("• Item 1 × 1");
    expect(msg).toContain("• Item 5 × 1");
    expect(msg).not.toContain("Item 6 × 1");
    expect(msg).toContain("• …and 3 more");
  });

  it("uses singular 'item' for count of 1", () => {
    const msg = renderSaleCompletedMessage({
      saleRef: "S-1",
      total: "10.00",
      itemCount: 1,
      cashierName: "Jane",
      paymentLabels: ["CASH"],
      items: [{ name: "Foo", qty: 1 }],
    });
    expect(msg).toContain("1 item");
    expect(msg).not.toContain("1 items");
  });

  it("HTML-escapes product names and cashier name", () => {
    const msg = renderSaleCompletedMessage({
      saleRef: "S-1",
      total: "10.00",
      itemCount: 1,
      cashierName: "Evil <b>",
      paymentLabels: ["CASH"],
      items: [{ name: "<img src=x>", qty: 1 }],
    });
    expect(msg).toContain("&lt;img src=x&gt;");
    expect(msg).toContain("Evil &lt;b&gt;");
    expect(msg).not.toContain("<img");
  });
});

describe("sendTelegramMessage", () => {
  it("skips when TELEGRAM_BOT_TOKEN is not configured", async () => {
    let calls = 0;
    mockFetch(async () => {
      calls += 1;
      return new Response("{}");
    });
    const res = await sendTelegramMessage("123", "hello");
    expect(res.ok).toBe(false);
    expect(res.ok === false && res.skipped).toBe(true);
    expect(calls).toBe(0);
  });

  it("posts to the Bot API when a token is set", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "test-token";
    const calls: { url: string; body: string }[] = [];
    mockFetch(async (input, init) => {
      calls.push({
        url: String(input),
        body: String(init?.body ?? ""),
      });
      return new Response(JSON.stringify({ ok: true, result: {} }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    const res = await sendTelegramMessage("999", "hi");
    expect(res.ok).toBe(true);
    expect(calls[0].url).toContain("/bottest-token/sendMessage");
    expect(calls[0].body).toContain('"chat_id":"999"');
    expect(calls[0].body).toContain('"parse_mode":"HTML"');
  });

  it("returns an error result when the API returns ok:false", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "test-token";
    mockFetch(
      async () =>
        new Response(
          JSON.stringify({ ok: false, description: "chat not found" }),
          { status: 200 },
        ),
    );
    const res = await sendTelegramMessage("999", "hi");
    expect(res.ok).toBe(false);
    expect(res.ok === false && res.error).toContain("chat not found");
  });

  it("returns an error result on network failure without throwing", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "test-token";
    mockFetch(async () => {
      throw new Error("ECONNRESET");
    });
    const res = await sendTelegramMessage("999", "hi");
    expect(res.ok).toBe(false);
  });
});
