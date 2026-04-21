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
});
