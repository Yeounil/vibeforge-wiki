// app/forum/post/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPost, listComments } from "@/lib/forum/queries";
import { listWikiRefsByPost } from "@/lib/wiki-qa/queries";
import { AppShell } from "@/components/layout/AppShell";
import { Sidebar } from "@/components/layout/Sidebar";
import { RightPanel } from "@/components/layout/RightPanel";
import { SearchBox } from "@/components/wiki/SearchBox";
import { CategoryBadge } from "@/components/forum/CategoryBadge";
import { CommentForm } from "@/components/forum/CommentForm";
import { RelatedWiki } from "@/components/forum/RelatedWiki";
import { getAllPages, getAliasMap } from "@/lib/wiki/page-loader";
import { renderBody } from "@/lib/wiki/render";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const post = await getPost(supabase, id);
  if (!post) return { title: "Not Found" };
  return { title: `${post.title} — VibeForge Forum` };
}

export default async function ForumPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const [post, comments, userResult, all, aliasMap] = await Promise.all([
    getPost(supabase, id),
    listComments(supabase, id),
    supabase.auth.getUser(),
    getAllPages(),
    getAliasMap(),
  ]);
  if (!post) notFound();
  const user = userResult.data.user;
  const sidebarPages = all.map((p) => ({
    slug: p.slug,
    title: p.frontmatter.title,
    category: p.slug.split("/")[0],
  }));
  const titleMap: Record<string, string> = Object.fromEntries(
    all.map((p) => [p.slug, p.frontmatter.title])
  );
  const bodyHtml = await renderBody(post.body_md, aliasMap);

  // Related wiki refs — best-effort.
  let wikiSlugs: string[] = [];
  try {
    wikiSlugs = await listWikiRefsByPost(supabase, post.id);
  } catch (e) {
    console.error("[RelatedWiki load failed]", e);
  }

  const authorName =
    post.author?.display_name ?? post.author?.github_login ?? "익명";

  return (
    <AppShell
      headerSearch={<SearchBox />}
      sidebar={<Sidebar pages={sidebarPages} currentSlug={null} />}
      right={
        wikiSlugs.length > 0 ? (
          <RightPanel>
            <RelatedWiki slugs={wikiSlugs} titleMap={titleMap} />
          </RightPanel>
        ) : undefined
      }
      main={
        <div className="space-y-4">
          <article className="vf-card p-6 md:p-8">
            <div className="flex items-center gap-2 mb-3">
              <CategoryBadge category={post.category} />
              <span className="text-sm text-[var(--text-secondary)]">{authorName}</span>
              <span className="text-sm text-[var(--text-secondary)] ml-auto">
                {post.created_at.slice(0, 10)}
              </span>
            </div>
            <h1 className="text-2xl font-bold mb-4">{post.title}</h1>
            <div
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />
          </article>
          <section className="vf-card p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-3">
              댓글 {comments.length}
            </h2>
            {comments.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)] mb-4">첫 댓글을 남겨보세요.</p>
            ) : (
              <ul className="space-y-3 mb-4">
                {comments.map((c) => {
                  const cAuthor = c.author?.display_name ?? c.author?.github_login ?? "익명";
                  return (
                    <li key={c.id} className="border-t border-black/5 pt-3 first:border-0 first:pt-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{cAuthor}</span>
                        <span className="text-xs text-[var(--text-secondary)]">{c.created_at.slice(0, 10)}</span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{c.body_md}</p>
                    </li>
                  );
                })}
              </ul>
            )}
            {user ? (
              <CommentForm postId={post.id} />
            ) : (
              <p className="text-sm text-[var(--text-secondary)]">
                댓글을 달려면 <Link href="/forum" className="underline">로그인</Link>이 필요해요.
              </p>
            )}
          </section>
        </div>
      }
    />
  );
}
