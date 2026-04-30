// tests/e2e/forum-read.spec.ts
import { test, expect } from "@playwright/test";

test.describe("forum read-only", () => {
  test("/forum landing shows three category cards", async ({ page }) => {
    await page.goto("/forum");
    await expect(page.getByRole("heading", { name: "Forum" })).toBeVisible();
    const main = page.getByTestId("appshell-main");
    await expect(main.getByText("Q&A").first()).toBeVisible();
    await expect(main.getByText("일반").first()).toBeVisible();
    await expect(main.getByText("공지").first()).toBeVisible();
  });

  test("/forum/qa shows category page with new-post CTA", async ({ page }) => {
    await page.goto("/forum/qa");
    const main = page.getByTestId("appshell-main");
    await expect(main.getByRole("heading", { name: "Q&A" })).toBeVisible();
    await expect(main.getByRole("link", { name: "새 글" })).toBeVisible();
  });

  test("/forum/notice renders 공지 heading", async ({ page }) => {
    await page.goto("/forum/notice");
    const main = page.getByTestId("appshell-main");
    await expect(main.getByRole("heading", { name: "공지" })).toBeVisible();
  });

  test("/forum/bogus 404s", async ({ page }) => {
    const resp = await page.goto("/forum/bogus");
    expect(resp?.status()).toBe(404);
  });

  test("/forum/new while signed out shows login prompt", async ({ page }) => {
    await page.goto("/forum/new");
    const main = page.getByTestId("appshell-main");
    await expect(main.getByText(/GitHub 로그인이 필요/)).toBeVisible();
  });
});
