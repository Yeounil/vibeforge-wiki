// tests/e2e/visual-shell.spec.ts
import { test, expect } from "@playwright/test";

test.describe("visual shell", () => {
  test("homepage hero shows VibeForge title and CTA", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "VibeForge", level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: /Wiki 둘러보기/ })).toBeVisible();
  });

  test("wiki page renders sidebar with category dots and right panel TOC", async ({ page }) => {
    await page.goto("/wiki/concepts/Memex");
    const sidebar = page.getByTestId("appshell-sidebar");
    await expect(sidebar.getByRole("navigation", { name: "Categories" })).toBeVisible();
    await expect(sidebar.getByText("Concepts")).toBeVisible();
    // Backlinks always present on this seed page (linked from LLM Wiki Pattern)
    await expect(page.getByRole("navigation", { name: "Backlinks" })).toBeVisible();
  });

  test("Pretendard font is applied to body", async ({ page }) => {
    await page.goto("/");
    const family = await page.evaluate(() =>
      window.getComputedStyle(document.body).fontFamily
    );
    expect(family).toMatch(/Pretendard/);
  });
});
