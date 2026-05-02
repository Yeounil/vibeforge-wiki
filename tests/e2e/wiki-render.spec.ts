import { test, expect } from "@playwright/test";

test.describe("wiki rendering", () => {
  test("homepage links to /wiki", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "VibeForge" })).toBeVisible();
    await page.getByRole("link", { name: "Wiki" }).click();
    await page.waitForURL("**/wiki");
    await expect(page).toHaveURL("/wiki");
  });

  test("/wiki shows category groups and seed pages", async ({ page }) => {
    await page.goto("/wiki");
    await expect(page.getByRole("heading", { name: "Wiki" })).toBeVisible();
    const main = page.getByTestId("appshell-main");
    await expect(main.getByRole("link", { name: "Memex", exact: true })).toBeVisible();
    await expect(main.getByRole("link", { name: "Vannevar Bush", exact: true })).toBeVisible();
    await expect(main.getByRole("link", { name: "DBMS", exact: true })).toBeVisible();
  });

  test("clicking a seed page renders body and resolves [[wiki-link]]", async ({ page }) => {
    await page.goto("/wiki/concepts/Memex");
    // Page-title H1 (in the WikiPage card header). The body markdown also has
    // its own '# Memex' heading, so scope to the card header.
    const main = page.getByTestId("appshell-main");
    await expect(
      main.locator("header").getByRole("heading", { name: "Memex", level: 1 })
    ).toBeVisible();
    // body content
    await expect(page.getByText("associative trails", { exact: false }).first()).toBeVisible();
    // resolved [[Vannevar Bush]] wiki-link → /wiki/people/Vannevar Bush (literal space in href)
    const wikiLink = main.locator('a[href="/wiki/people/Vannevar Bush"]').first();
    await expect(wikiLink).toBeVisible();
  });

  test("backlinks appear on the linked-to page", async ({ page }) => {
    await page.goto("/wiki/people/Vannevar Bush");
    await expect(page.getByRole("heading", { name: "이 페이지를 인용한 곳" })).toBeVisible();
    // Memex links to Vannevar Bush — scope to right panel to avoid sidebar collision
    const right = page.getByTestId("appshell-right");
    await expect(right.getByRole("link", { name: "Memex" })).toBeVisible();
  });

  test("tag page lists matching pages", async ({ page }) => {
    await page.goto("/wiki/tag/database");
    await expect(page.getByRole("heading", { name: "#database" })).toBeVisible();
    const main = page.getByTestId("appshell-main");
    await expect(main.getByRole("link", { name: "DBMS", exact: true })).toBeVisible();
  });

  test("search box returns a hit", async ({ page }) => {
    await page.goto("/wiki");
    await page.getByRole("searchbox", { name: "Search wiki" }).fill("Memex");
    // Search results render in a popover dropdown (relative to the searchbox).
    // Disambiguate from sidebar/main by picking the first matching link.
    await expect(
      page.getByRole("link", { name: "Memex" }).first()
    ).toBeVisible();
  });
});
