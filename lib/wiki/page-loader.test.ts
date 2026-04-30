import { describe, it, expect } from "vitest";
import { getAllPages, getAllSlugs } from "./page-loader";

describe("page-loader cache", () => {
  it("getAllPages returns the same array reference across calls (single scan)", async () => {
    const a = await getAllPages();
    const b = await getAllPages();
    expect(a).toBe(b);
  });

  it("getAllPages includes title and slug for every page", async () => {
    const pages = await getAllPages();
    expect(pages.length).toBeGreaterThan(0);
    for (const p of pages) {
      expect(typeof p.slug).toBe("string");
      expect(typeof p.frontmatter.title).toBe("string");
    }
  });

  it("getAllSlugs returns same length as getAllPages", async () => {
    const slugs = await getAllSlugs();
    const pages = await getAllPages();
    expect(slugs.length).toBe(pages.length);
  });
});
