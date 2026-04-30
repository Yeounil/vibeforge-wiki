import Link from "next/link";
import type { Route } from "next";
import { createClient } from "@/lib/supabase/server";
import { listPosts, countPostsByCategory } from "@/lib/forum/queries";
import { CATEGORY_LABELS, FORUM_CATEGORIES } from "@/lib/forum/types";
import { AppShell } from "@/components/layout/AppShell";
import { Sidebar } from "@/components/layout/Sidebar";
import { SearchBox } from "@/components/wiki/SearchBox";
import { PostList } from "@/components/forum/PostList";
import { CategoryBadge } from "@/components/forum/CategoryBadge";
import { getAllPages } from "@/lib/wiki/page-loader";

export const metadata = { title: "Forum — VibeForge" };

export default async function ForumLanding() {
  const supabase = await createClient();
  const [recent, counts] = await Promise.all([
    listPosts(supabase, { limit: 10 }),
    countPostsByCategory(supabase),
  ]);

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
        <div className="space-y-6">
          <header className="vf-card p-6">
            <h1 className="text-3xl font-bold mb-2">Forum</h1>
            <p className="text-[var(--text-secondary)]">
              질문, 토론, 공지를 한 곳에서. Q&A는 시나리오 태그로 분류됩니다.
            </p>
          </header>
          <section className="grid gap-3 sm:grid-cols-3">
            {FORUM_CATEGORIES.map((cat) => (
              <Link
                key={cat}
                href={`/forum/${cat}` as Route}
                className="vf-card p-4 hover:shadow-lg transition"
              >
                <div className="flex items-center justify-between mb-1">
                  <CategoryBadge category={cat} />
                  <span className="text-xs text-[var(--text-secondary)]">{counts[cat]}개</span>
                </div>
                <p className="text-sm text-[var(--text-secondary)]">
                  {CATEGORY_LABELS[cat]}로 가기 →
                </p>
              </Link>
            ))}
          </section>
          <section className="space-y-2">
            <h2 className="text-lg font-semibold px-2">최근 글</h2>
            <PostList posts={recent} />
          </section>
        </div>
      }
    />
  );
}
