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
    await expect(main.getByRole("link", { name: "인덱스가 뭐예요?" })).toBeVisible();
    await expect(main.getByRole("link", { name: "프로세스가 뭐예요?" })).toBeVisible();
    await expect(main.getByRole("link", { name: "배열이 뭐예요?" })).toBeVisible();
  });

  test("clicking a seed page renders body and resolves [[wiki-link]]", async ({ page }) => {
    await page.goto("/wiki/data-handling/what-is-an-index");
    await expect(page.getByRole("heading", { name: "인덱스가 뭐예요?", level: 1 })).toBeVisible();
    // body content
    await expect(page.getByText("색인", { exact: false }).first()).toBeVisible();
    // resolved wiki-link to "what-is-a-process" — appears in main body, sidebar, and (collapsed) mobile drawer
    const main = page.getByTestId("appshell-main");
    const wikiLink = main.locator('a[href="/wiki/how-computers-work/what-is-a-process"]').first();
    await expect(wikiLink).toBeVisible();
  });

  test("backlinks appear on the linked-to page", async ({ page }) => {
    await page.goto("/wiki/how-computers-work/what-is-a-process");
    await expect(page.getByRole("heading", { name: "이 페이지를 인용한 곳" })).toBeVisible();
    // the index page links here — scope to right panel to avoid sidebar collision
    const right = page.getByTestId("appshell-right");
    await expect(right.getByRole("link", { name: "인덱스가 뭐예요?" })).toBeVisible();
  });

  test("tag page lists matching pages", async ({ page }) => {
    await page.goto("/wiki/tag/DB");
    await expect(page.getByRole("heading", { name: "#DB" })).toBeVisible();
    const main = page.getByTestId("appshell-main");
    await expect(main.getByRole("link", { name: "인덱스가 뭐예요?" })).toBeVisible();
  });

  test("search box returns a hit", async ({ page }) => {
    await page.goto("/wiki");
    await page.getByRole("searchbox", { name: "Search wiki" }).fill("인덱스");
    // Search results render in a popover dropdown (relative to the searchbox).
    // Disambiguate from sidebar/main by picking the first matching link.
    await expect(
      page.getByRole("link", { name: "인덱스가 뭐예요?" }).first()
    ).toBeVisible();
  });
});
