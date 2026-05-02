import { test, expect } from "@playwright/test";

test.describe("wiki hierarchy", () => {
  test("sidebar tree expands and navigates from Database → DBMS", async ({ page }) => {
    await page.goto("/wiki/concepts/%EB%8D%B0%EC%9D%B4%ED%84%B0%EB%B2%A0%EC%9D%B4%EC%8A%A4");
    const sidebar = page.getByRole("navigation", { name: "Categories" });
    const databaseToggle = sidebar.getByRole("button", { name: /데이터베이스/ });
    if ((await databaseToggle.getAttribute("aria-expanded")) !== "true") {
      await databaseToggle.click();
    }
    const dbmsLink = sidebar.getByRole("link", { name: "DBMS", exact: true });
    await expect(dbmsLink).toBeVisible();
    await dbmsLink.click();
    await page.waitForURL(/\/wiki\/concepts\/DBMS$/);
  });

  test("DBMS page shows breadcrumb Wiki › Concepts › 데이터베이스 › DBMS", async ({ page }) => {
    await page.goto("/wiki/concepts/DBMS");
    const breadcrumb = page.getByRole("navigation", { name: "Breadcrumb" });
    await expect(breadcrumb.getByRole("link", { name: "Wiki" })).toBeVisible();
    await expect(breadcrumb.getByRole("link", { name: "Concepts" })).toBeVisible();
    await expect(breadcrumb.getByRole("link", { name: "데이터베이스" })).toBeVisible();
    // current page (DBMS) is non-link text
    await expect(breadcrumb.getByText("DBMS", { exact: true })).toBeVisible();
  });

  test("3단계 스키마 page shows prereq box and links to 데이터 독립성", async ({ page }) => {
    await page.goto("/wiki/concepts/3%EB%8B%A8%EA%B3%84%20%EC%8A%A4%ED%82%A4%EB%A7%88");
    const prereq = page.getByRole("complementary", { name: "Prerequisites" });
    await expect(prereq).toBeVisible();
    await expect(prereq.getByText("먼저 보면 좋아요")).toBeVisible();
    const link = prereq.getByRole("link", { name: "데이터 독립성" });
    await expect(link).toBeVisible();
    await link.click();
    await page.waitForURL(/\/wiki\/concepts\/.+/);
  });

  test("데이터베이스 page shows child list with DBMS", async ({ page }) => {
    await page.goto("/wiki/concepts/%EB%8D%B0%EC%9D%B4%ED%84%B0%EB%B2%A0%EC%9D%B4%EC%8A%A4");
    const childSection = page.getByRole("region", { name: "Child pages" });
    await expect(childSection).toBeVisible();
    await expect(childSection.getByRole("link", { name: "DBMS" })).toBeVisible();
  });

  test("sidebar expansion state persists across reloads (localStorage)", async ({ page }) => {
    await page.goto("/wiki/concepts/%EB%8D%B0%EC%9D%B4%ED%84%B0%EB%B2%A0%EC%9D%B4%EC%8A%A4");
    const sidebar = page.getByRole("navigation", { name: "Categories" });
    const databaseToggle = sidebar.getByRole("button", { name: /데이터베이스/ });
    const initial = await databaseToggle.getAttribute("aria-expanded");
    if (initial !== "true") {
      await databaseToggle.click();
    }
    await expect(databaseToggle).toHaveAttribute("aria-expanded", "true");
    await page.reload();
    const reloadedToggle = sidebar.getByRole("button", { name: /데이터베이스/ });
    await expect(reloadedToggle).toHaveAttribute("aria-expanded", "true");
  });
});
