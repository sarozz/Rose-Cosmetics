import { describe, expect, it } from "vitest";
import type { User } from "@prisma/client";
import { hasRole } from "@/lib/auth";

function user(role: User["role"]): User {
  return {
    id: "u1",
    authId: null,
    email: "staff@example.com",
    displayName: "Staff",
    role,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  } satisfies User;
}

describe("hasRole", () => {
  it("allows a role listed in the allowed set", () => {
    expect(hasRole(user("OWNER"), ["OWNER", "MANAGER"])).toBe(true);
  });

  it("denies a role not in the allowed set", () => {
    expect(hasRole(user("CASHIER"), ["OWNER", "MANAGER"])).toBe(false);
  });

  it("denies when the allowed set is empty", () => {
    expect(hasRole(user("OWNER"), [])).toBe(false);
  });
});
