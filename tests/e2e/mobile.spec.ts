// tests/e2e/mobile.spec.ts
// Smoke pass at 375×667 (iPhone SE viewport). Verifies the mobile shell
// renders, the bottom tab bar works, the landing hero h2 sits on one line,
// and the wiki sticky TOC is wired up on long-form documents.
import { test, expect } from "@playwright/test";

const LONG_WIKI_SLUG = "/wiki/concepts/SQL";

// iPhone SE viewport without forcing webkit (project config has chromium only).
test.use({
  viewport: { width: 375, height: 667 },
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1",
  hasTouch: true,
  isMobile: true,
});

test.describe("mobile shell", () => {
  test("homepage renders without horizontal overflow", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "VibeForge", level: 1 })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("hero h2 in lilac block fits one line", async ({ page }) => {
    await page.goto("/");
    const h2 = page.getByRole("heading", { name: "배우고, 토론하고, 성장하세요" });
    await expect(h2).toBeVisible();
    const lineHeight = await h2.evaluate((el) => parseFloat(getComputedStyle(el).lineHeight));
    const height = await h2.evaluate((el) => (el as HTMLElement).getBoundingClientRect().height);
    expect(height).toBeLessThan(lineHeight * 1.6);
  });

  test("bottom tab bar is visible and active matches /wiki", async ({ page }) => {
    await page.goto("/wiki");
    const tabBar = page.getByRole("navigation", { name: "Bottom navigation" });
    await expect(tabBar).toBeVisible();
    await expect(tabBar.getByRole("link", { name: /Wiki/ })).toHaveAttribute("aria-current", "page");
    await tabBar.getByRole("link", { name: /Forum/ }).click();
    await expect(page).toHaveURL(/\/forum$/);
    await expect(tabBar.getByRole("link", { name: /Forum/ })).toHaveAttribute("aria-current", "page");
  });

  test("hamburger opens mobile menu sheet", async ({ page }) => {
    // Landing page (/) doesn't use AppShell, so navigate to a route that does.
    await page.goto("/wiki");
    await page.getByRole("button", { name: "Open menu" }).click();
    const dialog = page.getByRole("dialog", { name: "Mobile menu" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("link", { name: /About/i })).toBeVisible();
    // Click the canonical close affordance (the ✕ in the panel header). The
    // backdrop carries a separate aria-label "Close menu (backdrop)" — use
    // exact match so this lookup resolves only to the panel button.
    await dialog.getByRole("button", { name: "Close menu", exact: true }).click();
    await expect(dialog).toBeHidden();
  });

  test("wiki long page shows sticky TOC bar", async ({ page }) => {
    await page.goto(LONG_WIKI_SLUG);
    const stickyNav = page.getByRole("navigation", { name: /목차 \(모바일\)/i });
    await expect(stickyNav).toBeVisible();
    await stickyNav.getByRole("button", { name: "목차 열기" }).click();
    await expect(page.getByRole("dialog", { name: "목차" })).toBeVisible();
  });
});
