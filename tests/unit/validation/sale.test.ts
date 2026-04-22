import { describe, expect, it } from "vitest";
import { checkoutSchema } from "@/lib/validation/sale";

// 25-char cuid-shaped strings (the schema validates cuid format specifically).
const cuid = (n: number) => `cjld2cjxh0000qzrmn831i7${n.toString().padStart(3, "0")}`;

const baseItem = {
  productId: cuid(1),
  qty: "2",
  unitPrice: "10.00",
  discountAmount: "0",
};

const base = {
  items: [baseItem],
  saleDiscount: "0",
  cashTendered: "20",
  notes: "",
  idempotencyKey: "11111111-2222-3333-4444-555555555555",
};

describe("checkoutSchema", () => {
  it("accepts a minimal cart", () => {
    const parsed = checkoutSchema.parse(base);
    expect(parsed.items).toHaveLength(1);
    expect(parsed.items[0].qty).toBe(2);
    expect(parsed.items[0].unitPrice).toBe(10);
    expect(parsed.cashTendered).toBe(20);
    expect(parsed.notes).toBeNull();
  });

  it("rejects an empty cart", () => {
    const result = checkoutSchema.safeParse({ ...base, items: [] });
    expect(result.success).toBe(false);
  });

  it("rejects a non-positive qty", () => {
    const result = checkoutSchema.safeParse({
      ...base,
      items: [{ ...baseItem, qty: "0" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-integer qty", () => {
    const result = checkoutSchema.safeParse({
      ...base,
      items: [{ ...baseItem, qty: "1.5" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects duplicate product ids across lines", () => {
    const result = checkoutSchema.safeParse({
      ...base,
      items: [baseItem, { ...baseItem, qty: "1" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a negative unit price", () => {
    const result = checkoutSchema.safeParse({
      ...base,
      items: [{ ...baseItem, unitPrice: "-1" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a short idempotency key", () => {
    const result = checkoutSchema.safeParse({ ...base, idempotencyKey: "abc" });
    expect(result.success).toBe(false);
  });

  it("defaults paymentMethod to CASH", () => {
    const parsed = checkoutSchema.parse(base);
    expect(parsed.paymentMethod).toBe("CASH");
  });

  it("accepts DIGITAL as a payment method", () => {
    const parsed = checkoutSchema.parse({ ...base, paymentMethod: "DIGITAL" });
    expect(parsed.paymentMethod).toBe("DIGITAL");
  });

  it("rejects unknown payment methods", () => {
    const result = checkoutSchema.safeParse({ ...base, paymentMethod: "CRYPTO" });
    expect(result.success).toBe(false);
  });
});
