// lib/design/categories.test.ts
import { describe, it, expect } from "vitest";
import { getCategoryMeta, listCategories } from "./categories";

describe("categories", () => {
  it("returns label and color for known slug", () => {
    const m = getCategoryMeta("data-handling");
    expect(m.label).toBe("데이터 다루기");
    expect(m.colorVar).toBe("--cat-data-handling");
  });

  it("falls back to default color for unknown slug", () => {
    const m = getCategoryMeta("unknown-cat");
    expect(m.label).toBe("unknown-cat");
    expect(m.colorVar).toBe("--cat-default");
  });

  it("listCategories returns all known categories in stable order", () => {
    const list = listCategories();
    expect(list.map((c) => c.slug)).toEqual([
      "concepts",
      "entities",
      "people",
      "sources",
      "data-handling",
      "how-computers-work",
      "code-flow",
    ]);
  });
});
