import { describe, expect, it } from "vitest";
import { productSchema } from "@/lib/validation/product";

const base = {
  name: "Rose Lip Balm",
  brand: "",
  barcode: "",
  sku: "",
  categoryId: "",
  costPrice: "12.50",
  sellPrice: "20.00",
  reorderLevel: "5",
  isActive: true,
};

describe("productSchema", () => {
  it("accepts a minimal product", () => {
    const parsed = productSchema.parse(base);
    expect(parsed.name).toBe("Rose Lip Balm");
    expect(parsed.costPrice).toBe(12.5);
    expect(parsed.sellPrice).toBe(20);
    expect(parsed.reorderLevel).toBe(5);
    expect(parsed.barcode).toBeNull();
  });

  it("rejects a sell price below cost price", () => {
    const result = productSchema.safeParse({
      ...base,
      costPrice: "20.00",
      sellPrice: "10.00",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid barcode (non-digit)", () => {
    const result = productSchema.safeParse({
      ...base,
      barcode: "12345ABC9012",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a too-short barcode", () => {
    const result = productSchema.safeParse({
      ...base,
      barcode: "1234567",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid barcode", () => {
    const parsed = productSchema.parse({
      ...base,
      barcode: "036000291452",
    });
    expect(parsed.barcode).toBe("036000291452");
  });

  it("rejects a negative price", () => {
    const result = productSchema.safeParse({
      ...base,
      costPrice: "-1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects more than two decimal places", () => {
    const result = productSchema.safeParse({
      ...base,
      sellPrice: "10.123",
    });
    expect(result.success).toBe(false);
  });
});
