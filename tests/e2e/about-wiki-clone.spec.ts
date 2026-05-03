import { test, expect } from "@playwright/test";

test.describe("about wiki clone", () => {
  test("about page shows the git clone command and repo link", async ({ page }) => {
    await page.goto("/about");
    await expect(page.getByRole("heading", { name: "위키 로컬로 가져오기" })).toBeVisible();
    await expect(page.getByText("git clone https://github.com/Yeounil/vibeforge-wiki.git")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "https://github.com/Yeounil/vibeforge-wiki" })
    ).toBeVisible();
  });

  test("wiki index has a 위키 다운로드 link to the about anchor", async ({ page }) => {
    await page.goto("/wiki");
    const link = page.getByRole("link", { name: "위키 다운로드" });
    await expect(link).toBeVisible();
    const href = await link.getAttribute("href");
    expect(href).toMatch(/^\/about#/);
  });
});
