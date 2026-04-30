import Link from "next/link";
import type { Route } from "next";
import { loadVault } from "@/lib/wiki/load";
import path from "node:path";

interface CategoryGroup {
  category: string;
  pages: { slug: string; title: string }[];
}

const CATEGORY_LABELS: Record<string, string> = {
  "data-handling": "데이터 다루기",
  "how-computers-work": "컴퓨터는 어떻게 일하나",
  "code-flow": "코드 흐름",
};

export const metadata = {
  title: "Wiki — VibeForge",
};

export default async function WikiIndexPage() {
  const all = await loadVault(path.resolve(process.cwd(), "content"));
  const groups = new Map<string, { slug: string; title: string }[]>();
  for (const page of all) {
    const [category] = page.slug.split("/");
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category)!.push({ slug: page.slug, title: page.frontmatter.title });
  }
  const grouped: CategoryGroup[] = Array.from(groups.entries())
    .map(([category, pages]) => ({ category, pages }))
    .sort((a, b) => a.category.localeCompare(b.category));

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Wiki</h1>
      <p className="mb-4 text-gray-600">
        바이브코더가 알아두면 좋은 CS 지식. 카테고리별로 정리되어 있어요.
      </p>
      {grouped.map(({ category, pages }) => (
        <section key={category} className="mb-8">
          <h2 className="text-xl font-semibold mb-2">
            {CATEGORY_LABELS[category] ?? category}
          </h2>
          <ul className="list-disc pl-6">
            {pages.map((p) => (
              <li key={p.slug}>
                <Link href={`/wiki/${p.slug}` as Route} className="underline">
                  {p.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
