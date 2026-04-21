import { expect, test } from "@playwright/test";

test("landing page lists delivery phases", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "POS & Inventory System" }),
  ).toBeVisible();
  await expect(page.getByText("Phase 1 — Foundations")).toBeVisible();
});
