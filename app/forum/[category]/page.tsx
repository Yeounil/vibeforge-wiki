import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listPosts } from "@/lib/forum/queries";
import { CATEGORY_LABELS, FORUM_CATEGORIES, type ForumCategory } from "@/lib/forum/types";
import { AppShell } from "@/components/layout/AppShell";
import { Sidebar } from "@/components/layout/Sidebar";
import { SearchBox } from "@/components/wiki/SearchBox";
import { PostList } from "@/components/forum/PostList";
import { getAllPages } from "@/lib/wiki/page-loader";

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  if (!FORUM_CATEGORIES.includes(category as ForumCategory)) return { title: "Not Found" };
  return { title: `${CATEGORY_LABELS[category as ForumCategory]} — VibeForge Forum` };
}

export default async function ForumCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  if (!FORUM_CATEGORIES.includes(category as ForumCategory)) notFound();
  const cat = category as ForumCategory;

  const supabase = await createClient();
  const posts = await listPosts(supabase, { category: cat, limit: 100 });

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
        <div className="space-y-4">
          <header className="bg-[var(--canvas)] border border-[var(--hairline)] rounded-[var(--r-md)] p-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-1">{CATEGORY_LABELS[cat]}</h1>
              <p className="text-sm text-[var(--ink-muted)]">{posts.length}개 글</p>
            </div>
            <Link
              href={`/forum/new?cat=${cat}` as Route}
              className="px-4 py-2 rounded-full text-sm font-semibold text-white shadow-sm hover:opacity-90"
              style={{ background: "var(--brand-gradient)" }}
            >
              새 글
            </Link>
          </header>
          <PostList posts={posts} emptyMessage={`${CATEGORY_LABELS[cat]}에 첫 글을 남겨주세요.`} />
        </div>
      }
    />
  );
}
