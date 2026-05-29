import { test, expect } from "@playwright/test";
import path from "node:path";

test("orders import -> queue call -> calls list -> call center kb upload", async ({ page }) => {
  const email = `test-${Date.now()}@example.com`;

  await page.goto("/en/register");
  await page.getByPlaceholder("Business name").fill("Test Business");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password").fill("test-password-123");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForURL("**/en/dashboard", { timeout: 30_000 });

  await page.goto("/en/orders/import");
  const ordersPath = path.resolve(process.cwd(), "e2e/fixtures/orders.csv");
  await page.locator('input[type="file"]').setInputFiles(ordersPath);
  await page.getByRole("button", { name: "Upload" }).click();
  await expect(page.getByText("Imported")).toBeVisible({ timeout: 30_000 });

  await page.goto("/en/orders");
  await page.getByRole("button", { name: "Queue call" }).first().click();

  await page.goto("/en/calls");
  await page.getByRole("button", { name: "Refresh" }).click();
  await expect(page.getByRole("link", { name: "Open" }).first()).toBeVisible({ timeout: 30_000 });

  await page.goto("/en/call-center");
  await page.getByPlaceholder("KB name (EN)").fill("KB");
  await page.getByPlaceholder("KB name (AR)").fill("قاعدة معرفة");
  await page.getByRole("button", { name: "Create KB" }).click();

  const knowledgePath = path.resolve(process.cwd(), "e2e/fixtures/knowledge.txt");
  await page.locator('input[type="file"]').setInputFiles(knowledgePath);
  await page.getByRole("button", { name: "Upload file" }).click();
  await expect(page.getByText("knowledge.txt")).toBeVisible({ timeout: 30_000 });
});

