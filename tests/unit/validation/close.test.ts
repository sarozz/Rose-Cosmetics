import { describe, expect, it } from "vitest";
import { closeSchema } from "@/lib/validation/close";

const base = {
  openingFloat: "500",
  countedCash: "12450.50",
  notes: "",
};

describe("closeSchema", () => {
  it("accepts a minimal count", () => {
    const parsed = closeSchema.parse(base);
    expect(parsed.openingFloat).toBe(500);
    expect(parsed.countedCash).toBe(12450.5);
    expect(parsed.notes).toBeNull();
  });

  it("defaults opening float to 0 when omitted", () => {
    const parsed = closeSchema.parse({ countedCash: "100" });
    expect(parsed.openingFloat).toBe(0);
  });

  it("rejects a negative counted cash", () => {
    const result = closeSchema.safeParse({ ...base, countedCash: "-1" });
    expect(result.success).toBe(false);
  });

  it("rejects more than two decimals", () => {
    const result = closeSchema.safeParse({ ...base, countedCash: "1.234" });
    expect(result.success).toBe(false);
  });

  it("requires a counted cash value", () => {
    const result = closeSchema.safeParse({ openingFloat: "0" });
    expect(result.success).toBe(false);
  });

  it("caps notes at 500 characters", () => {
    const result = closeSchema.safeParse({ ...base, notes: "x".repeat(501) });
    expect(result.success).toBe(false);
  });
});
