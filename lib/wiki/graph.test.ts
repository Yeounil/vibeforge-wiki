import { describe, it, expect } from "vitest";
import { buildGraphData } from "./graph";
import type { Page, BacklinkMap } from "./types";

function page(slug: string, title: string): Page {
  return {
    slug,
    filePath: `data/${slug}.md`,
    frontmatter: { title, tags: [], aliases: [], video: null, updated: "2026-05-01" },
    body: "",
  };
}

describe("buildGraphData", () => {
  it("returns empty data for empty vault", () => {
    expect(buildGraphData([], {})).toEqual({ nodes: [], edges: [] });
  });

  it("emits one node per page with no backlinks", () => {
    const pages = [page("a/x", "X"), page("b/y", "Y")];
    const data = buildGraphData(pages, {});
    expect(data.nodes).toEqual([
      { id: "a/x", label: "X", group: "a" },
      { id: "b/y", label: "Y", group: "b" },
    ]);
    expect(data.edges).toEqual([]);
  });

  it("flattens backlinks into source→target edges", () => {
    const pages = [page("a/x", "X"), page("a/y", "Y")];
    const backlinks: BacklinkMap = { "a/x": ["a/y"] };
    const data = buildGraphData(pages, backlinks);
    expect(data.edges).toEqual([{ source: "a/y", target: "a/x" }]);
  });

  it("groups by top-level slug segment", () => {
    const pages = [page("data-handling/index", "Idx"), page("code-flow/loops", "Loops")];
    const data = buildGraphData(pages, {});
    expect(data.nodes.map((n) => n.group)).toEqual(["code-flow", "data-handling"]);
  });

  it("sorts nodes by id and edges by (source, target) for determinism", () => {
    const pages = [page("z", "Z"), page("a", "A"), page("m", "M")];
    const backlinks: BacklinkMap = { z: ["m", "a"], a: ["z"] };
    const data = buildGraphData(pages, backlinks);
    expect(data.nodes.map((n) => n.id)).toEqual(["a", "m", "z"]);
    expect(data.edges).toEqual([
      { source: "a", target: "z" },
      { source: "m", target: "z" },
      { source: "z", target: "a" },
    ]);
  });
});
