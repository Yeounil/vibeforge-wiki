"use client";

import dynamic from "next/dynamic";
import type { GraphData } from "@/lib/wiki/graph";

interface Props {
  data: GraphData;
}

const GraphViewInner = dynamic(
  () => import("./GraphViewInner").then((m) => m.GraphViewInner),
  {
    ssr: false,
    loading: () => (
      <div className="h-full flex items-center justify-center text-[var(--text-secondary)]">
        그래프 불러오는 중…
      </div>
    ),
  }
);

export function GraphView({ data }: Props) {
  if (data.nodes.length < 2) {
    return (
      <div className="vf-card p-8 text-center">
        <p className="text-[var(--text-secondary)]">
          페이지가 더 쌓이면 그래프가 풍성해져요.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full flex-1 min-h-0" data-testid="graph-canvas">
      <GraphViewInner data={data} />
    </div>
  );
}
