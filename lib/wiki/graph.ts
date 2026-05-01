import type { Page, BacklinkMap } from "./types";

export interface GraphNode {
  id: string;
  label: string;
  group: string;
}

export interface GraphEdge {
  source: string;
  target: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export function buildGraphData(
  pages: Page[],
  backlinks: BacklinkMap,
): GraphData {
  const nodes: GraphNode[] = pages
    .map((p) => ({
      id: p.slug,
      label: p.frontmatter.title,
      group: p.slug.split("/")[0],
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  const edges: GraphEdge[] = [];
  for (const [target, sources] of Object.entries(backlinks)) {
    for (const source of sources) {
      edges.push({ source, target });
    }
  }
  edges.sort((a, b) => {
    if (a.source !== b.source) return a.source.localeCompare(b.source);
    return a.target.localeCompare(b.target);
  });

  return { nodes, edges };
}
