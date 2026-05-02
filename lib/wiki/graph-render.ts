import type { GraphData } from "./graph";

const MIN_SIZE = 4;
const MAX_SIZE = 16;

/** Map degree → node radius in pixels. Sub-linear (sqrt) growth, clamped to [4, 16]. */
export function clampNodeSize(degree: number): number {
  const raw = MIN_SIZE + Math.sqrt(Math.max(0, degree)) * 2;
  return Math.min(MAX_SIZE, Math.max(MIN_SIZE, raw));
}

/** Count undirected degree per node id. Edges referencing unknown ids are silently dropped. */
export function computeDegrees(data: GraphData): Map<string, number> {
  const degrees = new Map<string, number>();
  for (const n of data.nodes) degrees.set(n.id, 0);
  for (const e of data.edges) {
    if (degrees.has(e.source)) degrees.set(e.source, (degrees.get(e.source) ?? 0) + 1);
    if (degrees.has(e.target)) degrees.set(e.target, (degrees.get(e.target) ?? 0) + 1);
  }
  return degrees;
}
