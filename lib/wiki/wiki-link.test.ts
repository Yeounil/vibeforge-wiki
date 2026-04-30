import { describe, it, expect } from "vitest";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import { remarkWikiLink } from "./wiki-link";

function process(md: string): string {
  return unified()
    .use(remarkParse)
    .use(remarkWikiLink)
    .use(remarkRehype)
    .use(rehypeStringify)
    .processSync(md)
    .toString();
}

describe("remarkWikiLink", () => {
  it("rewrites [[Target]] into a placeholder anchor with data attribute", () => {
    const html = process("see [[hello-world]] for details");
    expect(html).toContain('data-wiki-target="hello-world"');
    expect(html).toContain(">hello-world<");
  });

  it("supports [[Target|Display Text]] form", () => {
    const html = process("see [[hello-world|the intro]]");
    expect(html).toContain('data-wiki-target="hello-world"');
    expect(html).toContain(">the intro<");
  });

  it("ignores triple-bracketed text", () => {
    const html = process("[[[not a wiki link]]]");
    expect(html).not.toContain("data-wiki-target");
  });

  it("handles multiple links on one line", () => {
    const html = process("[[a]] and [[b]]");
    expect(html).toContain('data-wiki-target="a"');
    expect(html).toContain('data-wiki-target="b"');
  });
});
