// app/wiki/tag/[tag]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Route } from "next";
import type { TagMap } from "@/lib/wiki/types";
import { getAllPages } from "@/lib/wiki/page-loader";
import { AppShell } from "@/components/layout/AppShell";
import { Sidebar } from "@/components/layout/Sidebar";
import { SearchBox } from "@/components/wiki/SearchBox";

interface ManifestEntry {
  slug: string;
  title: string;
  tags: string[];
  updated: string;
}

async function loadIndexes() {
  const dataDir = path.resolve(process.cwd(), "public", "wiki-data");
  const tags = JSON.parse(await readFile(path.join(dataDir, "tags.json"), "utf-8")) as TagMap;
  const manifest = JSON.parse(
    await readFile(path.join(dataDir, "manifest.json"), "utf-8")
  ) as ManifestEntry[];
  const titleBySlug: Record<string, string> = {};
  for (const m of manifest) titleBySlug[m.slug] = m.title;
  return { tags, titleBySlug };
}

export const dynamicParams = false;

export async function generateStaticParams() {
  const { tags } = await loadIndexes();
  return Object.keys(tags).map((tag) => ({ tag: encodeURIComponent(tag) }));
}

export default async function TagPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag: rawTag } = await params;
  const tag = decodeURIComponent(rawTag);
  const { tags, titleBySlug } = await loadIndexes();
  const slugs = tags[tag];
  if (!slugs || slugs.length === 0) notFound();

  const all = await getAllPages();
  const sidebarPages = all.map((p) => ({
    slug: p.slug,
    title: p.frontmatter.title,
    category: p.slug.split("/")[0],
  }));

  return (
    <AppShell
      headerSearch={<SearchBox />}
      sidebar={<Sidebar pages={sidebarPages} currentSlug={null} />}
      main={
        <div className="bg-[var(--canvas)] border border-[var(--hairline)] rounded-[var(--r-md)] p-6">
          <h1 className="text-2xl font-bold mb-1">#{tag}</h1>
          <p className="text-sm text-[var(--ink-muted)] mb-4">{slugs.length}개 페이지</p>
          <ul className="space-y-2">
            {slugs.map((s) => (
              <li key={s}>
                <Link
                  href={`/wiki/${s}` as Route}
                  className="block px-3 py-2 rounded-md hover:bg-black/5 text-[var(--ink)]"
                >
                  {titleBySlug[s] ?? s}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm">
            <Link href="/wiki" className="underline hover:text-[var(--ink)]">
              ← Wiki 홈
            </Link>
          </p>
        </div>
      }
    />
  );
}
