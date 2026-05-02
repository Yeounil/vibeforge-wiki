"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  SigmaContainer,
  useLoadGraph,
  useRegisterEvents,
} from "@react-sigma/core";
import "@react-sigma/core/lib/style.css";
import Graph from "graphology";
import { getCategoryMeta } from "@/lib/design/categories";
import type { GraphData } from "@/lib/wiki/graph";
import { clampNodeSize, computeDegrees } from "@/lib/wiki/graph-render";

const SIGMA_SETTINGS = {
  labelFont: "Pretendard, system-ui, sans-serif",
  labelColor: { color: "#6b7280" },
  labelSize: 12,
  labelWeight: "500",
  labelRenderedSizeThreshold: 8,
  labelDensity: 0.07,
  labelGridCellSize: 60,
  defaultNodeColor: "#9ca3af",
  defaultEdgeColor: "rgba(0,0,0,0.08)",
  renderEdgeLabels: false,
  zIndex: true,
  allowInvalidContainer: true,
};

function resolveColor(group: string): string {
  if (typeof window === "undefined") return "#9ca3af";
  const meta = getCategoryMeta(group);
  const computed = getComputedStyle(document.documentElement)
    .getPropertyValue(meta.colorVar)
    .trim();
  return computed || "#9ca3af";
}

function GraphLoader({ data }: { data: GraphData }) {
  const loadGraph = useLoadGraph();
  useEffect(() => {
    const graph = new Graph();
    const degrees = computeDegrees(data);
    for (const n of data.nodes) {
      graph.addNode(n.id, {
        x: Math.random(),
        y: Math.random(),
        size: clampNodeSize(degrees.get(n.id) ?? 0),
        color: resolveColor(n.group),
        label: n.label,
      });
    }
    for (const e of data.edges) {
      if (
        graph.hasNode(e.source) &&
        graph.hasNode(e.target) &&
        !graph.hasEdge(e.source, e.target)
      ) {
        graph.addEdge(e.source, e.target, { size: 0.6, color: "rgba(0,0,0,0.08)" });
      }
    }
    loadGraph(graph);
  }, [data, loadGraph]);
  return null;
}

function ClickHandler() {
  const router = useRouter();
  const registerEvents = useRegisterEvents();
  useEffect(() => {
    registerEvents({
      clickNode: (e: { node: string }) => router.push(`/wiki/${e.node}` as never),
    });
  }, [registerEvents, router]);
  return null;
}

export function GraphViewInner({ data }: { data: GraphData }) {
  return (
    <SigmaContainer
      style={{ width: "100%", height: "100%" }}
      settings={SIGMA_SETTINGS}
    >
      <GraphLoader data={data} />
      <ClickHandler />
    </SigmaContainer>
  );
}
