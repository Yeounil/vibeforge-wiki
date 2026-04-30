import { describe, it, expect } from "vitest";
import { renderBody } from "./render";

describe("renderBody", () => {
  const aliasMap = new Map([
    ["target-page", "cat/target-page"],
    ["page two", "cat/target-page"],
  ]);

  it("renders basic markdown", async () => {
    const html = await renderBody("# Hello\n\nWorld", aliasMap);
    expect(html).toContain("<h1");
    expect(html).toContain("Hello");
    expect(html).toContain("<p>World</p>");
  });

  it("resolves [[wiki-link]] to real /wiki/<slug> URL", async () => {
    const html = await renderBody("see [[target-page]]", aliasMap);
    expect(html).toContain('href="/wiki/cat/target-page"');
  });

  it("flags broken [[wiki-link]] with data-broken", async () => {
    const html = await renderBody("see [[nope]]", aliasMap);
    expect(html).toContain("data-broken=\"true\"");
    expect(html).toContain(">nope<");
  });

  it("supports GFM tables", async () => {
    const html = await renderBody("| a | b |\n|---|---|\n| 1 | 2 |", aliasMap);
    expect(html).toContain("<table>");
  });

  it("adds slugs and autolinks to headings", async () => {
    const html = await renderBody("## Section Title", aliasMap);
    expect(html).toContain('id="section-title"');
  });
});
