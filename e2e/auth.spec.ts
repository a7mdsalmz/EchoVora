import { test, expect } from "@playwright/test";

test("register and reach dashboard", async ({ page }) => {
  const email = `test-${Date.now()}@example.com`;

  await page.goto("/en/register");
  await page.getByPlaceholder("Business name").fill("Test Business");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password").fill("test-password-123");
  await page.getByRole("button", { name: "Continue" }).click();

  await page.waitForURL("**/en/dashboard", { timeout: 30_000 });
  await expect(page).toHaveURL(/\/en\/dashboard$/);
});

