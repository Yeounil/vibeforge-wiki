import { describe, it, expect } from "vitest";
import { buildBacklinks, buildAliasMap } from "./backlinks";
import type { Page } from "./types";

const pages: Page[] = [
  {
    slug: "a",
    filePath: "data/a.md",
    frontmatter: { title: "Apple", tags: [], aliases: [], video: null, updated: "2026-04-30" },
    body: "links to [[b]] and [[Cat]] (alias for c)",
  },
  {
    slug: "b",
    filePath: "data/b.md",
    frontmatter: { title: "Banana", tags: [], aliases: [], video: null, updated: "2026-04-30" },
    body: "loops back to [[a]]",
  },
  {
    slug: "c",
    filePath: "data/c.md",
    frontmatter: { title: "Coconut", tags: [], aliases: ["Cat"], video: null, updated: "2026-04-30" },
    body: "no links",
  },
];

describe("buildAliasMap", () => {
  it("maps title and aliases (lowercased) to slugs", () => {
    const m = buildAliasMap(pages);
    expect(m.get("apple")).toBe("a");
    expect(m.get("banana")).toBe("b");
    expect(m.get("coconut")).toBe("c");
    expect(m.get("cat")).toBe("c");
    // raw slug is also resolvable
    expect(m.get("a")).toBe("a");
    expect(m.get("c")).toBe("c");
  });
});

describe("buildBacklinks", () => {
  it("collects reverse edges using slug + alias resolution", () => {
    const { backlinks, broken } = buildBacklinks(pages);
    expect(backlinks["a"]).toEqual(["b"]);
    expect(backlinks["b"]).toEqual(["a"]);
    expect(backlinks["c"]).toEqual(["a"]);
    expect(broken).toEqual([]);
  });

  it("reports broken links", () => {
    const withBroken: Page[] = [
      ...pages,
      {
        slug: "d",
        filePath: "data/d.md",
        frontmatter: { title: "D", tags: [], aliases: [], video: null, updated: "2026-04-30" },
        body: "points to [[nowhere]]",
      },
    ];
    const { broken } = buildBacklinks(withBroken);
    expect(broken).toContainEqual({ from: "d", target: "nowhere" });
  });
});
