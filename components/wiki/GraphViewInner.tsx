"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  SigmaContainer,
  useLoadGraph,
  useRegisterEvents,
  useCamera,
  useSigma,
} from "@react-sigma/core";
import "@react-sigma/core/lib/style.css";
import { useWorkerLayoutForceAtlas2 } from "@react-sigma/layout-forceatlas2";
import Graph from "graphology";
import { getCategoryMeta } from "@/lib/design/categories";
import type { GraphData } from "@/lib/wiki/graph";
import { clampNodeSize, computeDegrees } from "@/lib/wiki/graph-render";

const layoutCooldownMs = (n: number) => Math.min(4000 + n * 10, 8000);

const SIGMA_SETTINGS = {
  labelFont: "Pretendard, system-ui, sans-serif",
  labelColor: { color: "#374151" },
  labelSize: 13,
  labelWeight: "500",
  labelRenderedSizeThreshold: 12,
  labelDensity: 0.05,
  labelGridCellSize: 150,
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
    const total = data.nodes.length;
    data.nodes.forEach((n, i) => {
      const angle = (2 * Math.PI * i) / total;
      graph.addNode(n.id, {
        x: Math.cos(angle),
        y: Math.sin(angle),
        size: clampNodeSize(degrees.get(n.id) ?? 0),
        color: resolveColor(n.group),
        label: n.label,
      });
    });
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

function LayoutDriver({ nodeCount }: { nodeCount: number }) {
  const { start, stop } = useWorkerLayoutForceAtlas2({
    settings: {
      gravity: 1,
      scalingRatio: 8,
      slowDown: 1.5,
      strongGravityMode: true,
      barnesHutOptimize: nodeCount > 50,
    },
  });
  useEffect(() => {
    start();
    const cooldown = layoutCooldownMs(nodeCount);
    const t = setTimeout(() => stop(), cooldown);
    return () => {
      clearTimeout(t);
      stop();
    };
  }, [start, stop, nodeCount]);
  return null;
}

function CameraFitter({ nodeCount }: { nodeCount: number }) {
  const { reset } = useCamera({ duration: 600, factor: 1.5 });
  useEffect(() => {
    const cooldown = layoutCooldownMs(nodeCount);
    const t = setTimeout(() => reset(), cooldown + 200);
    return () => clearTimeout(t);
  }, [reset, nodeCount]);
  return null;
}

function InteractionLayer() {
  const router = useRouter();
  const sigma = useSigma();
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const registerEvents = useRegisterEvents();
  useEffect(() => {
    registerEvents({
      enterNode: (e: { node: string }) => setHoveredNode(e.node),
      leaveNode: () => setHoveredNode(null),
      clickNode: (e: { node: string }) => router.push(`/wiki/${e.node}`),
    });
  }, [registerEvents, router]);

  useEffect(() => {
    const graph = sigma.getGraph();
    sigma.setSetting("nodeReducer", (node, attrs) => {
      if (!hoveredNode) return attrs;
      if (node === hoveredNode || graph.areNeighbors(hoveredNode, node)) {
        return { ...attrs, zIndex: 1, forceLabel: true };
      }
      return { ...attrs, color: "rgba(150,150,150,0.25)", label: "", zIndex: 0 };
    });
    sigma.setSetting("edgeReducer", (edge, attrs) => {
      if (!hoveredNode) return attrs;
      const ext = graph.extremities(edge);
      if (ext.includes(hoveredNode)) {
        return { ...attrs, color: "#7c3aed", size: 1.2 };
      }
      return { ...attrs, hidden: true };
    });
    sigma.refresh();
  }, [hoveredNode, sigma]);

  return null;
}

export function GraphViewInner({ data }: { data: GraphData }) {
  const [isReady, setIsReady] = useState(false);
  const settleDelay = useMemo(
    () => layoutCooldownMs(data.nodes.length) + 800,
    [data.nodes.length]
  );

  useEffect(() => {
    const t = setTimeout(() => setIsReady(true), settleDelay);
    return () => clearTimeout(t);
  }, [settleDelay]);

  return (
    <>
      <SigmaContainer
        style={{
          position: "absolute",
          inset: 0,
          opacity: isReady ? 1 : 0,
          transition: "opacity 400ms ease-out",
        }}
        settings={SIGMA_SETTINGS}
      >
        <GraphLoader data={data} />
        <LayoutDriver nodeCount={data.nodes.length} />
        <CameraFitter nodeCount={data.nodes.length} />
        <InteractionLayer />
      </SigmaContainer>
      {!isReady && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-4 pointer-events-none z-10"
          aria-live="polite"
        >
          <div className="w-10 h-10 rounded-full border-2 border-[var(--accent-from)] border-t-transparent animate-spin" />
          <p className="text-sm text-[var(--text-secondary)]">
            그래프 정렬 중…
          </p>
        </div>
      )}
    </>
  );
}
