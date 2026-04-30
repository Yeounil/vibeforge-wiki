import { describe, it, expect } from "vitest";
import { parseFrontmatter } from "./frontmatter";

const fullDoc = `---
title: 인덱스가 뭐예요?
tags: [DB, 성능]
aliases: [DB 인덱스]
updated: 2026-04-30
---

본문 시작.
`;

describe("parseFrontmatter", () => {
  it("extracts a fully-populated frontmatter and body", () => {
    const { frontmatter, body } = parseFrontmatter(fullDoc);
    expect(frontmatter.title).toBe("인덱스가 뭐예요?");
    expect(frontmatter.tags).toEqual(["DB", "성능"]);
    expect(frontmatter.aliases).toEqual(["DB 인덱스"]);
    expect(frontmatter.video).toBeNull();
    expect(frontmatter.updated).toBe("2026-04-30");
    expect(body.trim()).toBe("본문 시작.");
  });

  it("defaults missing optional fields", () => {
    const doc = `---\ntitle: t\nupdated: 2026-04-30\n---\n\nx`;
    const { frontmatter } = parseFrontmatter(doc);
    expect(frontmatter.tags).toEqual([]);
    expect(frontmatter.aliases).toEqual([]);
    expect(frontmatter.video).toBeNull();
  });

  it("throws when title is missing", () => {
    const doc = `---\nupdated: 2026-04-30\n---\n\nx`;
    expect(() => parseFrontmatter(doc)).toThrow(/title/);
  });

  it("throws when updated is missing", () => {
    const doc = `---\ntitle: t\n---\n\nx`;
    expect(() => parseFrontmatter(doc)).toThrow(/updated/);
  });
});
