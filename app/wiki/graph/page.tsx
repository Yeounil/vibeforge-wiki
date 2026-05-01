import Link from "next/link";
import { getAllPages, getBacklinkMap } from "@/lib/wiki/page-loader";
import { buildGraphData } from "@/lib/wiki/graph";
import { listCategories, getCategoryMeta } from "@/lib/design/categories";
import { GraphView } from "@/components/wiki/GraphView";
import { SiteHeader } from "@/components/layout/SiteHeader";

export const metadata = {
  title: "Graph — VibeForge",
};

export const revalidate = 3600;

export default async function GraphPage() {
  let nodeCount = 0;
  let edgeCount = 0;
  let data: Awaited<ReturnType<typeof buildGraphData>> = { nodes: [], edges: [] };
  try {
    const [pages, backlinks] = await Promise.all([getAllPages(), getBacklinkMap()]);
    data = buildGraphData(pages, backlinks);
    nodeCount = data.nodes.length;
    edgeCount = data.edges.length;
  } catch (e) {
    console.error("[graph build failed]", e);
  }

  const presentGroups = new Set(data.nodes.map((n) => n.group));
  const legend = listCategories().filter((c) => presentGroups.has(c.slug));

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-gradient)]">
      <div className="p-4 md:p-6">
        <SiteHeader />
      </div>
      <div className="px-4 md:px-6 pb-3 flex flex-wrap items-center gap-4 text-sm text-[var(--text-secondary)]">
        <Link href="/wiki" className="underline hover:text-[var(--text-primary)]">
          ← Wiki로 돌아가기
        </Link>
        <span>
          {nodeCount} pages · {edgeCount} links
        </span>
        <div className="flex flex-wrap gap-3">
          {legend.map((c) => (
            <span key={c.slug} className="inline-flex items-center gap-1">
              <span
                aria-hidden
                className="inline-block w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: `var(${getCategoryMeta(c.slug).colorVar})` }}
              />
              {c.label}
            </span>
          ))}
        </div>
      </div>
      <div className="flex-1 px-4 md:px-6 pb-6 flex flex-col min-h-0">
        <div className="vf-card flex-1 min-h-0 overflow-hidden">
          <GraphView data={data} />
        </div>
      </div>
    </div>
  );
}
