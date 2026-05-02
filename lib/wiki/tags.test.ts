import { describe, it, expect } from "vitest";
import { buildTagMap } from "./tags";
import type { Page } from "./types";

const mk = (slug: string, tags: string[]): Page => ({
  slug,
  filePath: `data/${slug}.md`,
  frontmatter: { title: slug, tags, aliases: [], video: null, updated: "2026-04-30", parent: null, prerequisites: [] },
  body: "",
});

describe("buildTagMap", () => {
  it("groups slugs by tag", () => {
    const pages = [mk("a", ["DB", "기초"]), mk("b", ["DB"]), mk("c", ["성능"])];
    const map = buildTagMap(pages);
    expect(map["DB"]).toEqual(["a", "b"]);
    expect(map["기초"]).toEqual(["a"]);
    expect(map["성능"]).toEqual(["c"]);
  });

  it("returns slugs sorted within each tag", () => {
    const pages = [mk("z", ["x"]), mk("a", ["x"]), mk("m", ["x"])];
    const map = buildTagMap(pages);
    expect(map["x"]).toEqual(["a", "m", "z"]);
  });

  it("handles pages with no tags", () => {
    const map = buildTagMap([mk("a", [])]);
    expect(Object.keys(map)).toEqual([]);
  });
});
