import { describe, it, expect } from "vitest";
import { clampNodeSize, computeDegrees } from "./graph-render";
import type { GraphData } from "./graph";

describe("clampNodeSize", () => {
  it("returns the minimum (4) for an isolated node (degree 0)", () => {
    expect(clampNodeSize(0)).toBe(4);
  });

  it("scales sub-linearly with degree", () => {
    expect(clampNodeSize(1)).toBeCloseTo(6, 5);
    expect(clampNodeSize(4)).toBeCloseTo(8, 5);
    expect(clampNodeSize(9)).toBeCloseTo(10, 5);
  });

  it("clamps at the maximum (16) for very high degree", () => {
    expect(clampNodeSize(100)).toBe(16);
    expect(clampNodeSize(10_000)).toBe(16);
  });
});

describe("computeDegrees", () => {
  it("returns 0 for every node when there are no edges", () => {
    const data: GraphData = {
      nodes: [
        { id: "a", label: "A", group: "concepts" },
        { id: "b", label: "B", group: "concepts" },
      ],
      edges: [],
    };
    const d = computeDegrees(data);
    expect(d.get("a")).toBe(0);
    expect(d.get("b")).toBe(0);
  });

  it("counts both endpoints of every edge", () => {
    const data: GraphData = {
      nodes: [
        { id: "a", label: "A", group: "concepts" },
        { id: "b", label: "B", group: "concepts" },
        { id: "c", label: "C", group: "concepts" },
      ],
      edges: [
        { source: "a", target: "b" },
        { source: "b", target: "c" },
      ],
    };
    const d = computeDegrees(data);
    expect(d.get("a")).toBe(1);
    expect(d.get("b")).toBe(2);
    expect(d.get("c")).toBe(1);
  });

  it("ignores edges referencing unknown node ids (defensive — shouldn't happen in real data)", () => {
    const data: GraphData = {
      nodes: [{ id: "a", label: "A", group: "concepts" }],
      edges: [{ source: "a", target: "ghost" }],
    };
    const d = computeDegrees(data);
    expect(d.get("a")).toBe(1);
    expect(d.has("ghost")).toBe(false);
  });
});
