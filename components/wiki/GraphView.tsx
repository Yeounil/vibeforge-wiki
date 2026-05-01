"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getCategoryMeta } from "@/lib/design/categories";
import type { GraphData, GraphNode } from "@/lib/wiki/graph";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center text-[var(--text-secondary)]">
      그래프 불러오는 중…
    </div>
  ),
});

interface Props {
  data: GraphData;
}

function resolveColor(group: string): string {
  if (typeof window === "undefined") return "#888";
  const meta = getCategoryMeta(group);
  const computed = getComputedStyle(document.documentElement)
    .getPropertyValue(meta.colorVar)
    .trim();
  return computed || "#888";
}

export function GraphView({ data }: Props) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 800, h: 600 });

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const obs = new ResizeObserver(update);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  if (data.nodes.length < 2) {
    return (
      <div className="vf-card p-8 text-center">
        <p className="text-[var(--text-secondary)]">
          페이지가 더 쌓이면 그래프가 풍성해져요.
        </p>
      </div>
    );
  }

  const graphData = {
    nodes: data.nodes.map((n) => ({ ...n })),
    links: data.edges.map((e) => ({ source: e.source, target: e.target })),
  };

  return (
    <div ref={containerRef} className="w-full h-full" data-testid="graph-canvas">
      <ForceGraph2D
        graphData={graphData}
        width={size.w}
        height={size.h}
        nodeId="id"
        nodeLabel={(n) => (n as unknown as GraphNode).label}
        nodeColor={(n) => resolveColor((n as unknown as GraphNode).group)}
        linkColor={() => "rgba(0,0,0,0.15)"}
        nodeRelSize={6}
        cooldownTicks={100}
        onNodeClick={(n) => router.push(`/wiki/${(n as unknown as GraphNode).id}` as never)}
      />
    </div>
  );
}
