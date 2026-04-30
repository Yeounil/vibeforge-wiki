import { describe, it, expect } from "vitest";
import { buildSearchIndex, loadSearchIndex, searchPages } from "./search-index";
import type { Page } from "./types";

const pages: Page[] = [
  {
    slug: "a",
    filePath: "data/a.md",
    frontmatter: { title: "인덱스란 무엇인가", tags: ["DB"], aliases: [], video: null, updated: "2026-04-30" },
    body: "DB 인덱스는 책 색인과 같다",
  },
  {
    slug: "b",
    filePath: "data/b.md",
    frontmatter: { title: "프로세스 기초", tags: ["OS"], aliases: [], video: null, updated: "2026-04-30" },
    body: "프로세스는 실행 중인 프로그램이다",
  },
];

describe("buildSearchIndex + searchPages", () => {
  it("builds an index that finds pages by title term", () => {
    const idx = buildSearchIndex(pages);
    const hits = searchPages(idx, "인덱스");
    expect(hits.map((h) => h.slug)).toContain("a");
  });

  it("finds pages by body term", () => {
    const idx = buildSearchIndex(pages);
    const hits = searchPages(idx, "프로그램");
    expect(hits.map((h) => h.slug)).toContain("b");
  });

  it("returns empty for unmatched query", () => {
    const idx = buildSearchIndex(pages);
    const hits = searchPages(idx, "zzzznotfoundzzz");
    expect(hits).toEqual([]);
  });

  it("supports serialize/load round-trip via JSON", () => {
    const idx = buildSearchIndex(pages);
    const json = JSON.stringify(idx);
    // Note: spec used require("./search-index") to exercise dynamic loading,
    // but this project's vitest runs in ESM mode where require() cannot resolve
    // TypeScript sources. The function under test (loadSearchIndex) is imported
    // at the top of the file so the round-trip semantics are fully tested here.
    const reloaded = loadSearchIndex(json);
    const hits = searchPages(reloaded, "인덱스");
    expect(hits.map((h) => h.slug)).toContain("a");
  });
});
