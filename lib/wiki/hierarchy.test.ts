import { describe, it, expect } from "vitest";
import {
  buildHierarchy,
  validateHierarchy,
  getParentChain,
  getChildItems,
  getPrereqItems,
} from "./hierarchy";
import { buildAliasMap } from "./backlinks";
import type { Page } from "./types";

function makePage(slug: string, opts: Partial<Page["frontmatter"]> = {}): Page {
  const title = opts.title ?? slug.split("/").pop()!;
  return {
    slug,
    filePath: `data/${slug}.md`,
    body: "",
    frontmatter: {
      title,
      tags: opts.tags ?? [],
      aliases: opts.aliases ?? [],
      video: null,
      updated: "2026-05-02",
      parent: opts.parent ?? null,
      prerequisites: opts.prerequisites ?? [],
    },
  };
}

describe("buildHierarchy", () => {
  it("groups pages into per-folder trees", () => {
    const pages = [
      makePage("concepts/Database"),
      makePage("concepts/DBMS", { parent: "Database" }),
      makePage("entities/Oracle"),
    ];
    const aliases = buildAliasMap(pages);
    const h = buildHierarchy(pages, aliases);
    expect(Object.keys(h).sort()).toEqual(["concepts", "entities"]);
    expect(h.concepts.roots).toEqual(["concepts/Database"]);
    expect(h.concepts.children["concepts/Database"]).toEqual(["concepts/DBMS"]);
    expect(h.concepts.parents["concepts/DBMS"]).toBe("concepts/Database");
    expect(h.entities.roots).toEqual(["entities/Oracle"]);
  });

  it("resolves parent by alias", () => {
    const pages = [
      makePage("concepts/Database", { aliases: ["DB"] }),
      makePage("concepts/DBMS", { parent: "DB" }),
    ];
    const h = buildHierarchy(pages, buildAliasMap(pages));
    expect(h.concepts.children["concepts/Database"]).toEqual(["concepts/DBMS"]);
  });

  it("populates prerequisites map (slug-resolved)", () => {
    const pages = [
      makePage("concepts/A"),
      makePage("concepts/B", { prerequisites: ["A"] }),
    ];
    const h = buildHierarchy(pages, buildAliasMap(pages));
    expect(h.concepts.prerequisites["concepts/B"]).toEqual(["concepts/A"]);
  });

  it("sorts children alphabetically (Korean localeCompare)", () => {
    const pages = [
      makePage("concepts/Root"),
      makePage("concepts/나", { parent: "Root" }),
      makePage("concepts/가", { parent: "Root" }),
      makePage("concepts/다", { parent: "Root" }),
    ];
    const h = buildHierarchy(pages, buildAliasMap(pages));
    expect(h.concepts.children["concepts/Root"]).toEqual([
      "concepts/가",
      "concepts/나",
      "concepts/다",
    ]);
  });

  it("treats unresolved parent strings as if absent (no crash, no edge)", () => {
    const pages = [makePage("concepts/A", { parent: "Ghost" })];
    const h = buildHierarchy(pages, buildAliasMap(pages));
    expect(h.concepts.roots).toEqual(["concepts/A"]);
    expect(h.concepts.parents["concepts/A"]).toBeUndefined();
  });

  it("ignores cross-folder parents (so the tree never spans folders)", () => {
    const pages = [
      makePage("entities/Oracle"),
      makePage("concepts/SQL", { parent: "Oracle" }),
    ];
    const h = buildHierarchy(pages, buildAliasMap(pages));
    expect(h.concepts.roots).toEqual(["concepts/SQL"]);
    expect(h.concepts.parents["concepts/SQL"]).toBeUndefined();
  });

  it("strips a 2-cycle so the tree stays finite (one node becomes root, the other its child)", () => {
    const pages = [
      makePage("concepts/A", { parent: "B" }),
      makePage("concepts/B", { parent: "A" }),
    ];
    const h = buildHierarchy(pages, buildAliasMap(pages));
    // Exactly one of A/B is a root; the other is its child. No infinite traversal.
    expect(h.concepts.roots).toHaveLength(1);
    const root = h.concepts.roots[0];
    const other = root === "concepts/A" ? "concepts/B" : "concepts/A";
    expect(h.concepts.children[root]).toContain(other);
    // The root must NOT have a parent edge.
    expect(h.concepts.parents[root]).toBeUndefined();
  });

  it("preserves a tail node's parent edge when the tail points into a cycle (X → A ↔ B)", () => {
    // X → A; A ↔ B
    const pages = [
      makePage("concepts/X", { parent: "A" }),
      makePage("concepts/A", { parent: "B" }),
      makePage("concepts/B", { parent: "A" }),
    ];
    const h = buildHierarchy(pages, buildAliasMap(pages));
    // X must remain a child of A — it is NOT part of the cycle and should keep its parent edge.
    expect(h.concepts.parents["concepts/X"]).toBe("concepts/A");
    // X must NOT be a root.
    expect(h.concepts.roots).not.toContain("concepts/X");
  });
});

describe("validateHierarchy", () => {
  it("returns no errors when everything is consistent", () => {
    const pages = [
      makePage("concepts/A"),
      makePage("concepts/B", { parent: "A" }),
    ];
    const r = validateHierarchy(pages, buildAliasMap(pages));
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
  });

  it("flags missing-parent", () => {
    const pages = [makePage("concepts/A", { parent: "Ghost" })];
    const r = validateHierarchy(pages, buildAliasMap(pages));
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0].kind).toBe("missing-parent");
    expect(r.errors[0].page).toBe("data/concepts/A.md");
    expect(r.errors[0].detail).toContain("Ghost");
  });

  it("flags cross-folder-parent", () => {
    const pages = [
      makePage("entities/Oracle"),
      makePage("concepts/SQL", { parent: "Oracle" }),
    ];
    const r = validateHierarchy(pages, buildAliasMap(pages));
    expect(r.errors.some((e) => e.kind === "cross-folder-parent")).toBe(true);
  });

  it("flags self-parent", () => {
    const pages = [makePage("concepts/A", { parent: "A" })];
    const r = validateHierarchy(pages, buildAliasMap(pages));
    expect(r.errors.some((e) => e.kind === "self-parent")).toBe(true);
  });

  it("flags cycles (A→B→A)", () => {
    const pages = [
      makePage("concepts/A", { parent: "B" }),
      makePage("concepts/B", { parent: "A" }),
    ];
    const r = validateHierarchy(pages, buildAliasMap(pages));
    expect(r.errors.some((e) => e.kind === "cycle")).toBe(true);
  });

  it("flags longer cycles (A→B→C→A)", () => {
    const pages = [
      makePage("concepts/A", { parent: "C" }),
      makePage("concepts/B", { parent: "A" }),
      makePage("concepts/C", { parent: "B" }),
    ];
    const r = validateHierarchy(pages, buildAliasMap(pages));
    expect(r.errors.filter((e) => e.kind === "cycle").length).toBeGreaterThan(0);
  });

  it("flags missing-prereq", () => {
    const pages = [makePage("concepts/A", { prerequisites: ["Ghost"] })];
    const r = validateHierarchy(pages, buildAliasMap(pages));
    expect(r.errors.some((e) => e.kind === "missing-prereq")).toBe(true);
  });

  it("flags self-prereq", () => {
    const pages = [makePage("concepts/A", { prerequisites: ["A"] })];
    const r = validateHierarchy(pages, buildAliasMap(pages));
    expect(r.errors.some((e) => e.kind === "self-prereq")).toBe(true);
  });

  it("warns (does not error) on cross-folder-prereq", () => {
    const pages = [
      makePage("people/Codd"),
      makePage("concepts/SQL", { prerequisites: ["Codd"] }),
    ];
    const r = validateHierarchy(pages, buildAliasMap(pages));
    expect(r.errors).toEqual([]);
    expect(r.warnings.some((w) => w.kind === "cross-folder-prereq")).toBe(true);
  });
});

describe("getParentChain", () => {
  it("returns chain root → parent → ... excluding the current page", () => {
    const pages = [
      makePage("concepts/A"),
      makePage("concepts/B", { parent: "A" }),
      makePage("concepts/C", { parent: "B" }),
    ];
    const tree = buildHierarchy(pages, buildAliasMap(pages));
    const titleMap = { "concepts/A": "A", "concepts/B": "B", "concepts/C": "C" };
    const chain = getParentChain(tree, "concepts/C", titleMap);
    expect(chain).toEqual([
      { slug: "concepts/A", title: "A" },
      { slug: "concepts/B", title: "B" },
    ]);
  });

  it("returns [] for a root (parentless) page", () => {
    const pages = [makePage("concepts/A")];
    const tree = buildHierarchy(pages, buildAliasMap(pages));
    const chain = getParentChain(tree, "concepts/A", { "concepts/A": "A" });
    expect(chain).toEqual([]);
  });

  it("falls back to slug when title is missing", () => {
    const pages = [makePage("concepts/A"), makePage("concepts/B", { parent: "A" })];
    const tree = buildHierarchy(pages, buildAliasMap(pages));
    const chain = getParentChain(tree, "concepts/B", {} /* no titles */);
    expect(chain).toEqual([{ slug: "concepts/A", title: "concepts/A" }]);
  });
});

describe("getChildItems", () => {
  it("returns sorted children with titles", () => {
    const pages = [
      makePage("concepts/A"),
      makePage("concepts/Z-child", { parent: "A", title: "Z-child" }),
      makePage("concepts/A-child", { parent: "A", title: "A-child" }),
    ];
    const tree = buildHierarchy(pages, buildAliasMap(pages));
    const titleMap = {
      "concepts/A-child": "A-child",
      "concepts/Z-child": "Z-child",
    };
    const items = getChildItems(tree, "concepts/A", titleMap);
    expect(items).toEqual([
      { slug: "concepts/A-child", title: "A-child" },
      { slug: "concepts/Z-child", title: "Z-child" },
    ]);
  });

  it("returns [] when no children", () => {
    const pages = [makePage("concepts/A")];
    const tree = buildHierarchy(pages, buildAliasMap(pages));
    expect(getChildItems(tree, "concepts/A", { "concepts/A": "A" })).toEqual([]);
  });
});

describe("getPrereqItems", () => {
  it("returns prereqs with titles", () => {
    const pages = [
      makePage("concepts/A"),
      makePage("concepts/B", { prerequisites: ["A"] }),
    ];
    const tree = buildHierarchy(pages, buildAliasMap(pages));
    const items = getPrereqItems(tree, "concepts/B", {
      "concepts/A": "A",
      "concepts/B": "B",
    });
    expect(items).toEqual([{ slug: "concepts/A", title: "A" }]);
  });

  it("returns [] when no prereqs", () => {
    const pages = [makePage("concepts/A")];
    const tree = buildHierarchy(pages, buildAliasMap(pages));
    expect(getPrereqItems(tree, "concepts/A", { "concepts/A": "A" })).toEqual([]);
  });
});
