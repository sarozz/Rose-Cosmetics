import { describe, expect, it } from "vitest";
import { returnSchema } from "@/lib/validation/return";

const cuid = (n: number) => `cjld2cjxh0000qzrmn831i7${n.toString().padStart(3, "0")}`;

const baseItem = {
  saleItemId: cuid(1),
  qty: "1",
  refundAmount: "10.00",
  restockFlag: "on",
};

const base = {
  originalSaleId: cuid(9),
  reasonNote: "",
  items: [baseItem],
};

describe("returnSchema", () => {
  it("accepts a minimal refund line", () => {
    const parsed = returnSchema.parse(base);
    expect(parsed.originalSaleId).toBe(cuid(9));
    expect(parsed.items).toHaveLength(1);
    expect(parsed.items[0].qty).toBe(1);
    expect(parsed.items[0].refundAmount).toBe(10);
    expect(parsed.items[0].restockFlag).toBe(true);
    expect(parsed.reasonNote).toBeNull();
  });

  it("rejects an empty items list", () => {
    const result = returnSchema.safeParse({ ...base, items: [] });
    expect(result.success).toBe(false);
  });

  it("rejects a non-positive qty", () => {
    const result = returnSchema.safeParse({
      ...base,
      items: [{ ...baseItem, qty: "0" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects duplicate sale line ids", () => {
    const result = returnSchema.safeParse({
      ...base,
      items: [baseItem, { ...baseItem, qty: "2" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a negative refund amount", () => {
    const result = returnSchema.safeParse({
      ...base,
      items: [{ ...baseItem, refundAmount: "-1" }],
    });
    expect(result.success).toBe(false);
  });

  it("accepts an unchecked restock flag (damaged unit)", () => {
    const parsed = returnSchema.parse({
      ...base,
      items: [{ ...baseItem, restockFlag: "" }],
    });
    expect(parsed.items[0].restockFlag).toBe(false);
  });
});
