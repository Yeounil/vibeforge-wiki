// app/forum/new/page.tsx
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { FORUM_CATEGORIES, type ForumCategory } from "@/lib/forum/types";
import { AppShell } from "@/components/layout/AppShell";
import { Sidebar } from "@/components/layout/Sidebar";
import { SearchBox } from "@/components/wiki/SearchBox";
import { NewPostForm } from "@/components/forum/NewPostForm";
import { getAllPages } from "@/lib/wiki/page-loader";

export const metadata = { title: "새 글 — VibeForge Forum" };

export default async function NewPostPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const { cat } = await searchParams;
  const defaultCat: ForumCategory =
    cat && FORUM_CATEGORIES.includes(cat as ForumCategory)
      ? (cat as ForumCategory)
      : "qa";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
          <header className="vf-card p-6">
            <h1 className="text-2xl font-bold">새 글 작성</h1>
          </header>
          {user ? (
            <NewPostForm defaultCategory={defaultCat} />
          ) : (
            <div className="vf-card p-6 text-center">
              <p className="text-[var(--text-secondary)] mb-4">
                글을 쓰려면 GitHub 로그인이 필요해요.
              </p>
              <Link
                href="/forum"
                className="text-sm underline hover:text-[var(--text-primary)]"
              >
                ← Forum으로 돌아가기
              </Link>
            </div>
          )}
        </div>
      }
    />
  );
}
