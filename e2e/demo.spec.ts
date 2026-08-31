import { test, expect } from "@playwright/test";

test("login and open weekly menu", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("ایمیل یا شماره پرسنلی").fill("admin@example.local");
  await page.getByLabel("رمز عبور").fill("ChangeMe-Admin-0!");
  await page.getByRole("button", { name: "ورود" }).click();
  await expect(page.getByRole("heading", { name: "منوی هفته" })).toBeVisible();
});
