import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  lookupBarcode,
  matchCategory,
} from "../../src/lib/services/product-lookup";

const originalFetch = globalThis.fetch;

function mockFetch(impl: typeof fetch) {
  globalThis.fetch = impl as unknown as typeof fetch;
}

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

beforeEach(() => {
  vi.useRealTimers();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("lookupBarcode", () => {
  it("rejects a barcode that isn't 8–14 digits without making a network call", async () => {
    const calls: string[] = [];
    mockFetch(async (input) => {
      calls.push(String(input));
      return jsonResponse({});
    });

    const hit = await lookupBarcode("abc");
    expect(hit).toBeNull();
    expect(calls).toHaveLength(0);
  });

  it("returns null when Open Beauty Facts reports status 0 (unknown code)", async () => {
    mockFetch(async () => jsonResponse({ status: 0 }));
    const hit = await lookupBarcode("1234567890123");
    expect(hit).toBeNull();
  });

  it("parses a hit into name, brand, and category hints", async () => {
    mockFetch(async () =>
      jsonResponse({
        status: 1,
        product: {
          product_name: "Ruby Red Lipstick",
          brands: "RougeCo, Sub-Brand",
          categories: "Cosmetics, Lipsticks",
          categories_tags: ["en:cosmetics", "en:lipsticks"],
        },
      }),
    );
    const hit = await lookupBarcode("1234567890123");
    expect(hit).toEqual({
      barcode: "1234567890123",
      name: "Ruby Red Lipstick",
      brand: "RougeCo",
      categoryHints: ["cosmetics", "lipsticks"],
    });
  });

  it("falls back to the English name field when product_name is empty", async () => {
    mockFetch(async () =>
      jsonResponse({
        status: 1,
        product: {
          product_name: "",
          product_name_en: "Rose Blush",
          brands: "",
          categories: "",
        },
      }),
    );
    const hit = await lookupBarcode("1234567890123");
    expect(hit?.name).toBe("Rose Blush");
    expect(hit?.brand).toBeNull();
    expect(hit?.categoryHints).toEqual([]);
  });

  it("swallows transport failures and returns null", async () => {
    mockFetch(async () => {
      throw new Error("ECONNRESET");
    });
    const hit = await lookupBarcode("1234567890123");
    expect(hit).toBeNull();
  });

  it("returns null on non-2xx responses", async () => {
    mockFetch(async () => new Response("rate limited", { status: 429 }));
    const hit = await lookupBarcode("1234567890123");
    expect(hit).toBeNull();
  });
});

describe("matchCategory", () => {
  const categories = [
    { id: "c1", name: "Lipsticks" },
    { id: "c2", name: "Skin Care" },
    { id: "c3", name: "Fragrance" },
  ];

  it("prefers the most-specific hint (end of list)", () => {
    const match = matchCategory(
      ["Cosmetics", "Lipsticks"],
      categories,
    );
    expect(match?.id).toBe("c1");
  });

  it("matches case-insensitively", () => {
    expect(matchCategory(["lipsticks"], categories)?.id).toBe("c1");
    expect(matchCategory(["SKIN CARE"], categories)?.id).toBe("c2");
  });

  it("returns null when nothing matches", () => {
    expect(matchCategory(["Hair Care"], categories)).toBeNull();
  });

  it("returns null when either list is empty", () => {
    expect(matchCategory([], categories)).toBeNull();
    expect(matchCategory(["Lipsticks"], [])).toBeNull();
  });
});
