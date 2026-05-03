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

function readDesignTokens() {
  if (typeof window === "undefined") {
    return { edge: "#e5e7eb", label: "#1f2937", canvas: "#ffffff", nodeFallback: "#9ca3af", hoverEdge: "#7c3aed", font: "system-ui, sans-serif" };
  }
  const cs = getComputedStyle(document.documentElement);
  const get = (name: string, fallback: string) => {
    const v = cs.getPropertyValue(name).trim();
    return v || fallback;
  };
  return {
    edge:        get("--graph-edge",  "#cbd5e1"),
    label:       get("--ink",         "#1f2937"),
    canvas:      get("--canvas",      "#ffffff"),
    nodeFallback: get("--ink-muted",  "#9ca3af"),
    hoverEdge:   get("--brand-from",  "#7c3aed"),
    font:        get("--font-sans",   "system-ui, sans-serif"),
  };
}

// The default hover pill is white; in dark mode our labelColor (--ink) is also
// near-white, so the hovered node's text becomes invisible. Mirror sigma's
// drawDiscNodeHover but pin the label text to a dark color so it stays
// readable against the white pill in both themes.
const HOVER_LABEL_COLOR = "#0f172a";

type HoverData = {
  x: number;
  y: number;
  size: number;
  label: string | null;
};
type HoverSettings = {
  labelSize: number;
  labelFont: string;
  labelWeight: string;
};

function drawNodeHoverWithDarkLabel(
  context: CanvasRenderingContext2D,
  data: HoverData,
  settings: HoverSettings,
) {
  const { labelSize: size, labelFont: font, labelWeight: weight } = settings;
  context.font = `${weight} ${size}px ${font}`;

  context.fillStyle = "#FFF";
  context.shadowOffsetX = 0;
  context.shadowOffsetY = 0;
  context.shadowBlur = 8;
  context.shadowColor = "#000";

  const PADDING = 2;
  if (typeof data.label === "string") {
    const textWidth = context.measureText(data.label).width;
    const boxWidth = Math.round(textWidth + 5);
    const boxHeight = Math.round(size + 2 * PADDING);
    const radius = Math.max(data.size, size / 2) + PADDING;
    const angleRadian = Math.asin(boxHeight / 2 / radius);
    const xDeltaCoord = Math.sqrt(
      Math.abs(Math.pow(radius, 2) - Math.pow(boxHeight / 2, 2)),
    );
    context.beginPath();
    context.moveTo(data.x + xDeltaCoord, data.y + boxHeight / 2);
    context.lineTo(data.x + radius + boxWidth, data.y + boxHeight / 2);
    context.lineTo(data.x + radius + boxWidth, data.y - boxHeight / 2);
    context.lineTo(data.x + xDeltaCoord, data.y - boxHeight / 2);
    context.arc(data.x, data.y, radius, angleRadian, -angleRadian);
    context.closePath();
    context.fill();
  } else {
    context.beginPath();
    context.arc(data.x, data.y, data.size + PADDING, 0, Math.PI * 2);
    context.closePath();
    context.fill();
  }
  context.shadowOffsetX = 0;
  context.shadowOffsetY = 0;
  context.shadowBlur = 0;

  if (data.label) {
    context.fillStyle = HOVER_LABEL_COLOR;
    context.font = `${weight} ${size}px ${font}`;
    context.fillText(data.label, data.x + data.size + 3, data.y + size / 3);
  }
}

function makeSigmaSettings() {
  const tokens = readDesignTokens();
  return {
    labelFont: tokens.font,
    labelColor: { color: tokens.label },
    labelSize: 13,
    labelWeight: "600",
    defaultDrawNodeHover: drawNodeHoverWithDarkLabel,
    // Sigma renders Math.ceil(labelDensity / cameraRatio²) labels per
    // (labelGridCellSize × labelGridCellSize) cell, then drops any whose
    // scaled size < labelRenderedSizeThreshold. With density=5 cellSize=90
    // threshold=5, the default-fit camera (ratio≈1.5) shows ~3 labels per
    // cell, and a modest 1.5× zoom-in already saturates the grid so labels
    // come into view well before the user has to zoom in hard.
    labelRenderedSizeThreshold: 5,
    labelDensity: 5,
    labelGridCellSize: 90,
    defaultNodeColor: tokens.nodeFallback,
    defaultEdgeColor: tokens.edge,
    renderEdgeLabels: false,
    zIndex: true,
    allowInvalidContainer: true,
  };
}

function resolveColor(group: string): string {
  if (typeof window === "undefined") return readDesignTokens().nodeFallback;
  const meta = getCategoryMeta(group);
  const computed = getComputedStyle(document.documentElement)
    .getPropertyValue(meta.colorVar)
    .trim();
  return computed || readDesignTokens().nodeFallback;
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
        graph.addEdge(e.source, e.target, { size: 0.6, color: readDesignTokens().edge });
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
    const container = sigma.getContainer();
    registerEvents({
      enterNode: (e: { node: string }) => {
        setHoveredNode(e.node);
        container.style.cursor = "pointer";
      },
      leaveNode: () => {
        setHoveredNode(null);
        container.style.cursor = "";
      },
      clickNode: (e: { node: string }) => router.push(`/wiki/${e.node}`),
    });
    return () => {
      container.style.cursor = "";
    };
  }, [registerEvents, router, sigma]);

  useEffect(() => {
    const graph = sigma.getGraph();
    const tokens = readDesignTokens();
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
        return { ...attrs, color: tokens.hoverEdge, size: 1.2 };
      }
      return { ...attrs, hidden: true };
    });
    sigma.refresh();
  }, [hoveredNode, sigma]);

  return null;
}

export function GraphViewInner({ data }: { data: GraphData }) {
  const [isReady, setIsReady] = useState(false);
  const [themeRev, setThemeRev] = useState(0);
  const settleDelay = useMemo(
    () => layoutCooldownMs(data.nodes.length) + 800,
    [data.nodes.length]
  );

  useEffect(() => {
    const t = setTimeout(() => setIsReady(true), settleDelay);
    return () => clearTimeout(t);
  }, [settleDelay]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      setIsReady(false);
      setThemeRev((r) => r + 1);
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  // Re-arm the isReady timer whenever themeRev bumps (SigmaContainer remounts)
  useEffect(() => {
    if (themeRev === 0) return;
    const t = setTimeout(() => setIsReady(true), settleDelay);
    return () => clearTimeout(t);
  }, [themeRev, settleDelay]);

  return (
    <>
      <SigmaContainer
        key={themeRev}
        style={{
          position: "absolute",
          inset: 0,
          opacity: isReady ? 1 : 0,
          transition: "opacity 400ms ease-out",
        }}
        settings={makeSigmaSettings()}
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
          <div className="w-10 h-10 rounded-full border-2 border-[var(--brand-from)] border-t-transparent animate-spin" />
          <p className="text-sm text-[var(--ink-muted)]">
            그래프 정렬 중…
          </p>
        </div>
      )}
    </>
  );
}
