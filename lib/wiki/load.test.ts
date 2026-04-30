import { describe, it, expect } from "vitest";
import path from "node:path";
import { loadVault } from "./load";

const FIXTURE = path.resolve(__dirname, "__fixtures__/sample-vault");

describe("loadVault", () => {
  it("loads all .md files under data/ recursively", async () => {
    const pages = await loadVault(FIXTURE);
    expect(pages).toHaveLength(3);
    const slugs = pages.map((p) => p.slug).sort();
    expect(slugs).toEqual(["cat-a/page-1", "cat-a/page-2", "cat-b/page-3"]);
  });

  it("populates frontmatter and body on each page", async () => {
    const pages = await loadVault(FIXTURE);
    const p1 = pages.find((p) => p.slug === "cat-a/page-1")!;
    expect(p1.frontmatter.title).toBe("Page One");
    expect(p1.frontmatter.tags).toEqual(["t1"]);
    expect(p1.body).toContain("[[page-2]]");
  });

  it("returns deterministic order (sorted by slug)", async () => {
    const pages = await loadVault(FIXTURE);
    const slugs = pages.map((p) => p.slug);
    expect(slugs).toEqual([...slugs].sort());
  });
});
