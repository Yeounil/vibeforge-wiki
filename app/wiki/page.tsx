import Link from "next/link";
import type { Route } from "next";
import { getAllPages } from "@/lib/wiki/page-loader";
import { listCategories, getCategoryMeta } from "@/lib/design/categories";
import { AppShell } from "@/components/layout/AppShell";
import { Sidebar } from "@/components/layout/Sidebar";
import { SearchBox } from "@/components/wiki/SearchBox";

export const metadata = {
  title: "Wiki — VibeForge",
};

export default async function WikiIndexPage() {
  const all = await getAllPages();
  const sidebarPages = all.map((p) => ({
    slug: p.slug,
    title: p.frontmatter.title,
    category: p.slug.split("/")[0],
  }));

  const groups = new Map<string, { slug: string; title: string }[]>();
  for (const p of all) {
    const cat = p.slug.split("/")[0];
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat)!.push({ slug: p.slug, title: p.frontmatter.title });
  }
  const order = listCategories().map((c) => c.slug);
  const orderedKeys = [
    ...order.filter((c) => groups.has(c)),
    ...Array.from(groups.keys()).filter((c) => !order.includes(c)),
  ];

  return (
    <AppShell
      headerSearch={<SearchBox />}
      sidebar={<Sidebar pages={sidebarPages} currentSlug={null} />}
      main={
        <div className="space-y-6">
          <header className="vf-card p-6">
            <h1 className="text-3xl font-bold">Wiki</h1>
            <p className="mt-2 text-[var(--text-secondary)]">
              바이브코더가 알아두면 좋은 CS 지식. 카테고리별로 정리되어 있어요.
            </p>
          </header>
          {orderedKeys.map((cat) => {
            const meta = getCategoryMeta(cat);
            return (
              <section key={cat} className="vf-card p-6">
                <h2 className="flex items-center gap-2 text-xl font-semibold mb-3">
                  <span
                    aria-hidden
                    className="inline-block w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: `var(${meta.colorVar})` }}
                  />
                  {meta.label}
                </h2>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {groups.get(cat)!.map((p) => (
                    <li key={p.slug}>
                      <Link
                        href={`/wiki/${p.slug}` as Route}
                        className="block px-3 py-2 rounded-md hover:bg-black/5 text-[var(--text-primary)]"
                      >
                        {p.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      }
    />
  );
}
