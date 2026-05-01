import { describe, it, expect } from "vitest";
import { extractWikiRefs } from "./extract";

// Minimal alias map — covers slug, title, alias forms.
const aliasMap = new Map<string, string>([
  ["data-handling/what-is-an-index", "data-handling/what-is-an-index"],
  ["what-is-an-index", "data-handling/what-is-an-index"],
  ["인덱스란", "data-handling/what-is-an-index"],
  ["code-flow/async", "code-flow/async"],
  ["async", "code-flow/async"],
]);

describe("extractWikiRefs", () => {
  it("returns empty array for empty body", () => {
    expect(extractWikiRefs("", aliasMap)).toEqual([]);
  });

  it("extracts /wiki/<slug> from markdown link target", () => {
    const body = "참고: [인덱스 글](/wiki/data-handling/what-is-an-index) 보세요.";
    expect(extractWikiRefs(body, aliasMap)).toEqual([
      "data-handling/what-is-an-index",
    ]);
  });

  it("extracts /wiki/<slug> from bare URL", () => {
    const body = "더 보기: /wiki/code-flow/async";
    expect(extractWikiRefs(body, aliasMap)).toEqual(["code-flow/async"]);
  });

  it("extracts [[Page Name]] wikilink", () => {
    const body = "[[What Is An Index]]를 먼저 보세요.";
    // The buildAliasMap pattern lowercases keys; "what is an index" isn't in
    // our minimal map. Use the slug-leaf form instead.
    const body2 = "[[what-is-an-index]] 보세요.";
    expect(extractWikiRefs(body2, aliasMap)).toEqual([
      "data-handling/what-is-an-index",
    ]);
  });

  it("extracts [[Target|Display]] wikilink (uses target, not display)", () => {
    const body = "[[async|비동기]]에 대해 ...";
    expect(extractWikiRefs(body, aliasMap)).toEqual(["code-flow/async"]);
  });

  it("resolves alias forms via aliasMap", () => {
    const body = "[[인덱스란]]은 ...";
    expect(extractWikiRefs(body, aliasMap)).toEqual([
      "data-handling/what-is-an-index",
    ]);
  });

  it("drops unresolved /wiki/ paths", () => {
    const body = "broken: /wiki/non/existent and good: /wiki/code-flow/async";
    expect(extractWikiRefs(body, aliasMap)).toEqual(["code-flow/async"]);
  });

  it("drops unresolved [[wikilinks]]", () => {
    const body = "[[Unknown Page]] vs [[async]]";
    expect(extractWikiRefs(body, aliasMap)).toEqual(["code-flow/async"]);
  });

  it("dedupes same slug appearing multiple times across both formats", () => {
    const body =
      "[[async]] / /wiki/code-flow/async / [[async|aka 비동기]]";
    expect(extractWikiRefs(body, aliasMap)).toEqual(["code-flow/async"]);
  });

  it("returns deterministic sorted output", () => {
    const body = "/wiki/code-flow/async /wiki/data-handling/what-is-an-index";
    const result = extractWikiRefs(body, aliasMap);
    expect(result).toEqual([
      "code-flow/async",
      "data-handling/what-is-an-index",
    ]);
  });

  it("handles markdown link target stripped of trailing punctuation", () => {
    const body = "see [foo](/wiki/code-flow/async).";
    expect(extractWikiRefs(body, aliasMap)).toEqual(["code-flow/async"]);
  });
});
