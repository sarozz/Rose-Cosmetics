import { describe, expect, it } from "vitest";
import { purchaseSchema } from "@/lib/validation/purchase";

// 25 chars; the schema checks for .cuid() format specifically.
const cuid = (n: number) => `cjld2cjxh0000qzrmn831i7${n.toString().padStart(3, "0")}`;

const baseItem = {
  productId: cuid(1),
  qty: "5",
  costPrice: "10.00",
  sellPrice: "20.00",
};

const base = {
  supplierId: cuid(9),
  purchaseDate: undefined,
  notes: "",
  debited: "0",
  credit: "0",
  items: [baseItem],
};

describe("purchaseSchema", () => {
  it("accepts a minimal purchase", () => {
    const parsed = purchaseSchema.parse(base);
    expect(parsed.supplierId).toBe(cuid(9));
    expect(parsed.items).toHaveLength(1);
    expect(parsed.items[0].qty).toBe(5);
    expect(parsed.items[0].costPrice).toBe(10);
    expect(parsed.notes).toBeNull();
  });

  it("rejects an empty items list", () => {
    const result = purchaseSchema.safeParse({ ...base, items: [] });
    expect(result.success).toBe(false);
  });

  it("rejects a non-positive qty", () => {
    const result = purchaseSchema.safeParse({
      ...base,
      items: [{ ...baseItem, qty: "0" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-integer qty", () => {
    const result = purchaseSchema.safeParse({
      ...base,
      items: [{ ...baseItem, qty: "1.5" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects duplicate product ids across rows", () => {
    const result = purchaseSchema.safeParse({
      ...base,
      items: [baseItem, { ...baseItem, qty: "2" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a negative cost price", () => {
    const result = purchaseSchema.safeParse({
      ...base,
      items: [{ ...baseItem, costPrice: "-1" }],
    });
    expect(result.success).toBe(false);
  });

  it("requires debited and credit", () => {
    const a = purchaseSchema.safeParse({ ...base, debited: undefined });
    const b = purchaseSchema.safeParse({ ...base, credit: undefined });
    expect(a.success).toBe(false);
    expect(b.success).toBe(false);
  });

  it("defaults vat and discount to 0 when omitted", () => {
    const parsed = purchaseSchema.parse(base);
    expect(parsed.vat).toBe(0);
    expect(parsed.discount).toBe(0);
  });

  it("accepts populated vat and discount", () => {
    const parsed = purchaseSchema.parse({
      ...base,
      debited: "100",
      credit: "50",
      vat: "13",
      discount: "5",
    });
    expect(parsed.debited).toBe(100);
    expect(parsed.credit).toBe(50);
    expect(parsed.vat).toBe(13);
    expect(parsed.discount).toBe(5);
  });
});
