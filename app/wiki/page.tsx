import Link from "next/link";
import type { Route } from "next";
import { getAllPages, getHierarchy, getTitleMap } from "@/lib/wiki/page-loader";
import { listCategories, getCategoryMeta } from "@/lib/design/categories";
import { AppShell } from "@/components/layout/AppShell";
import { Sidebar } from "@/components/layout/Sidebar";
import { SearchBox } from "@/components/wiki/SearchBox";
import { Pill } from "@/components/ui/Pill";

export const metadata = {
  title: "Wiki — VibeForge",
};

export default async function WikiIndexPage() {
  const all = await getAllPages();
  const hierarchy = await getHierarchy();
  const titleMap = await getTitleMap();

  const sidebarPages = all.map((p) => ({
    slug: p.slug,
    title: p.frontmatter.title,
    category: p.slug.split("/")[0],
  }));

  const knownOrder = listCategories().map((c) => c.slug);
  const allCats = Array.from(new Set(all.map((p) => p.slug.split("/")[0])));
  const orderedCats = [
    ...knownOrder.filter((c) => allCats.includes(c)),
    ...allCats.filter((c) => !knownOrder.includes(c)).sort(),
  ];

  return (
    <AppShell
      headerSearch={<SearchBox />}
      sidebar={<Sidebar pages={sidebarPages} tree={hierarchy} currentSlug={null} />}
      main={
        <div className="space-y-6">
          <header className="bg-[var(--canvas)] border border-[var(--hairline)] rounded-[var(--r-md)] p-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <h1 className="text-3xl font-bold">Wiki</h1>
              <p className="mt-2 text-[var(--ink-muted)]">
                바이브코더가 알아두면 좋은 CS 지식. 카테고리별로 정리되어 있어요.
              </p>
            </div>
            <div className="flex gap-2 md:shrink-0 md:self-center md:flex-wrap">
              <Link
                href={"/wiki/graph" as Route}
                className="flex-1 md:flex-none inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-semibold text-white text-center"
                style={{ background: "var(--brand-gradient)" }}
              >
                그래프뷰 →
              </Link>
              <Pill
                href={"/about#위키-로컬로-가져오기" as Route}
                variant="secondary"
                size="sm"
                className="flex-1 md:flex-none"
              >
                위키 다운로드
              </Pill>
            </div>
          </header>

          {orderedCats.map((cat) => {
            const meta = getCategoryMeta(cat);
            const folderTree = hierarchy[cat];
            const pagesInCat = all.filter((p) => p.slug.split("/")[0] === cat);

            const roots = folderTree?.roots ?? pagesInCat.map((p) => p.slug);
            const orphans = roots.filter((slug) => {
              const children = folderTree?.children[slug] ?? [];
              const hasChildren = children.length > 0;
              return !hasChildren;
            });
            const realRoots = roots.filter((slug) => {
              const children = folderTree?.children[slug] ?? [];
              return children.length > 0;
            });

            return (
              <section key={cat} className="bg-[var(--canvas)] border border-[var(--hairline)] rounded-[var(--r-md)] p-6">
                <h2 className="flex items-center gap-2 text-xl font-semibold mb-4">
                  <span
                    aria-hidden
                    className="inline-block w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: `var(${meta.colorVar})` }}
                  />
                  {meta.label}
                </h2>

                <ul className="space-y-3">
                  {realRoots.map((rootSlug) => {
                    const children = folderTree?.children[rootSlug] ?? [];
                    return (
                      <li key={rootSlug}>
                        <Link
                          href={`/wiki/${rootSlug}` as Route}
                          className="font-medium text-[var(--ink)] hover:underline"
                        >
                          {titleMap[rootSlug] ?? rootSlug}
                        </Link>
                        {children.length > 0 && (
                          <div className="mt-1 text-sm text-[var(--ink-muted)] pl-3">
                            {children.map((c, i) => (
                              <span key={c}>
                                <Link
                                  href={`/wiki/${c}` as Route}
                                  className="hover:text-[var(--ink)]"
                                >
                                  {titleMap[c] ?? c}
                                </Link>
                                {i < children.length - 1 ? " · " : ""}
                              </span>
                            ))}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>

                {orphans.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-[var(--border-subtle,rgba(0,0,0,0.08))]">
                    <p className="text-xs uppercase tracking-wide text-[var(--ink-muted)] mb-2">
                      독립 항목
                    </p>
                    <div className="text-sm text-[var(--ink-muted)]">
                      {orphans.map((s, i) => (
                        <span key={s}>
                          <Link
                            href={`/wiki/${s}` as Route}
                            className="hover:text-[var(--ink)]"
                          >
                            {titleMap[s] ?? s}
                          </Link>
                          {i < orphans.length - 1 ? " · " : ""}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      }
    />
  );
}
