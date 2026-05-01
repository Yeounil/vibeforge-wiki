import { test, expect } from "@playwright/test";

test.describe("plan 5 surfaces (read-only)", () => {
  test("/wiki/graph renders the canvas mount", async ({ page }) => {
    await page.goto("/wiki/graph");
    await expect(page.getByText("Wiki로 돌아가기")).toBeVisible();
    // GraphView either renders the canvas or the empty-state card
    const canvas = page.getByTestId("graph-canvas");
    const emptyCard = page.getByText("페이지가 더 쌓이면");
    await expect(canvas.or(emptyCard)).toBeVisible();
  });

  test("/about renders h1", async ({ page }) => {
    await page.goto("/about");
    await expect(page.getByRole("heading", { level: 1, name: "VibeForge" })).toBeVisible();
  });

  test("/about/contribute renders the contribute heading", async ({ page }) => {
    await page.goto("/about/contribute");
    await expect(page.getByRole("heading", { name: "기여 규칙" })).toBeVisible();
  });

  test("giscus iframe shows on a wiki slug page when env is set", async ({ page }) => {
    test.skip(
      !process.env.NEXT_PUBLIC_GISCUS_REPO ||
        !process.env.NEXT_PUBLIC_GISCUS_REPO_ID ||
        !process.env.NEXT_PUBLIC_GISCUS_CATEGORY ||
        !process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID,
      "giscus env not set",
    );
    // pick any seed wiki page that exists in the vault
    await page.goto("/wiki/data-handling/what-is-an-index");
    const giscusFrame = page.locator("iframe.giscus-frame");
    await expect(giscusFrame).toBeVisible({ timeout: 10_000 });
  });
});
