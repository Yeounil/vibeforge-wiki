import { test, expect } from "@playwright/test";

const ROUTES = [
  { name: "landing",       path: "/" },
  { name: "wiki-index",    path: "/wiki" },
  { name: "wiki-page",     path: "/wiki/concepts/%EB%8D%B0%EC%9D%B4%ED%84%B0%EB%B2%A0%EC%9D%B4%EC%8A%A4" },
  { name: "forum-index",   path: "/forum" },
  { name: "forum-qa",      path: "/forum/qa" },
  { name: "about",         path: "/about" },
];

for (const scheme of ["light", "dark"] as const) {
  test.describe(`visual baseline (${scheme})`, () => {
    test.use({ colorScheme: scheme });
    for (const route of ROUTES) {
      test(`${route.name}`, async ({ page }) => {
        await page.goto(route.path);
        await page.waitForLoadState("networkidle");
        await expect(page).toHaveScreenshot(`${route.name}-${scheme}.png`, {
          fullPage: true,
          maxDiffPixelRatio: 0.02,
        });
      });
    }
  });
}
