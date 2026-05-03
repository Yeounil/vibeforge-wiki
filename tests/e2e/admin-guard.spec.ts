import { test, expect } from "@playwright/test";

test.describe("admin guard", () => {
  test("/admin returns 404 to anonymous visitors", async ({ page }) => {
    const resp = await page.goto("/admin");
    expect(resp?.status()).toBe(404);
  });

  test("/admin does not appear in the public nav for anonymous visitors", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Admin" })).toHaveCount(0);
  });
});
