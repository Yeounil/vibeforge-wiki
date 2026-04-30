import Link from "next/link";
import { notFound } from "next/navigation";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Route } from "next";
import type { TagMap } from "@/lib/wiki/types";

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

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">#{tag}</h1>
      <p className="text-sm text-gray-500 mb-4">{slugs.length}개 페이지</p>
      <ul className="list-disc pl-6">
        {slugs.map((s) => (
          <li key={s}>
            <Link href={`/wiki/${s}` as Route} className="underline">
              {titleBySlug[s] ?? s}
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-sm">
        <Link href="/wiki" className="underline">← Wiki 홈</Link>
      </p>
    </main>
  );
}
