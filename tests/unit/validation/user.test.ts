import { describe, expect, it } from "vitest";
import {
  userCreateSchema,
  userUpdateSchema,
} from "@/lib/validation/user";

describe("userCreateSchema", () => {
  it("accepts a minimal staff invite and lowercases email", () => {
    const parsed = userCreateSchema.parse({
      email: "New.Cashier@Example.COM",
      displayName: "Anju",
      role: "CASHIER",
      password: "changeme123",
    });
    expect(parsed.email).toBe("new.cashier@example.com");
    expect(parsed.displayName).toBe("Anju");
    expect(parsed.role).toBe("CASHIER");
    expect(parsed.password).toBe("changeme123");
  });

  it("rejects a missing email", () => {
    const result = userCreateSchema.safeParse({
      email: "",
      displayName: "Anju",
      role: "CASHIER",
      password: "changeme123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = userCreateSchema.safeParse({
      email: "not-an-email",
      displayName: "Anju",
      role: "CASHIER",
      password: "changeme123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing display name", () => {
    const result = userCreateSchema.safeParse({
      email: "cashier@example.com",
      displayName: "   ",
      role: "CASHIER",
      password: "changeme123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown role", () => {
    const result = userCreateSchema.safeParse({
      email: "cashier@example.com",
      displayName: "Anju",
      role: "SUPERADMIN",
      password: "changeme123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a too-short password", () => {
    const result = userCreateSchema.safeParse({
      email: "cashier@example.com",
      displayName: "Anju",
      role: "CASHIER",
      password: "short",
    });
    expect(result.success).toBe(false);
  });
});

describe("userUpdateSchema", () => {
  it("treats checkbox 'on' as active", () => {
    const parsed = userUpdateSchema.parse({
      displayName: "Anju",
      role: "MANAGER",
      isActive: "on",
    });
    expect(parsed.isActive).toBe(true);
  });

  it("treats an absent checkbox as inactive", () => {
    const parsed = userUpdateSchema.parse({
      displayName: "Anju",
      role: "MANAGER",
      isActive: "",
    });
    expect(parsed.isActive).toBe(false);
  });

  it("rejects an empty display name", () => {
    const result = userUpdateSchema.safeParse({
      displayName: "",
      role: "MANAGER",
      isActive: "on",
    });
    expect(result.success).toBe(false);
  });
});
