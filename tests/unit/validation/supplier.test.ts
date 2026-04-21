import { describe, expect, it } from "vitest";
import { supplierSchema } from "@/lib/validation/supplier";

describe("supplierSchema", () => {
  it("accepts a minimal supplier", () => {
    const parsed = supplierSchema.parse({
      name: "Rose Distributors",
      phone: "",
      email: "",
      defaultTerms: "",
      notes: "",
      isActive: true,
    });
    expect(parsed.name).toBe("Rose Distributors");
    expect(parsed.phone).toBeNull();
    expect(parsed.email).toBeNull();
    expect(parsed.defaultTerms).toBeNull();
    expect(parsed.notes).toBeNull();
  });

  it("rejects empty name", () => {
    const result = supplierSchema.safeParse({
      name: "   ",
      phone: "",
      email: "",
      defaultTerms: "",
      notes: "",
      isActive: true,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = supplierSchema.safeParse({
      name: "Acme",
      phone: "",
      email: "not-an-email",
      defaultTerms: "",
      notes: "",
      isActive: true,
    });
    expect(result.success).toBe(false);
  });

  it("keeps a valid email", () => {
    const parsed = supplierSchema.parse({
      name: "Acme",
      phone: "",
      email: "hi@acme.com",
      defaultTerms: "",
      notes: "",
      isActive: true,
    });
    expect(parsed.email).toBe("hi@acme.com");
  });
});
