// app/forum/post/[id]/edit/page.tsx — author-or-admin-only edit page.
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPost } from "@/lib/forum/queries";
import { AppShell } from "@/components/layout/AppShell";
import { Sidebar } from "@/components/layout/Sidebar";
import { SearchBox } from "@/components/wiki/SearchBox";
import { EditPostForm } from "@/components/forum/EditPostForm";
import { getAllPages } from "@/lib/wiki/page-loader";

export const metadata = { title: "글 수정 — VibeForge Forum" };

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const [post, userResult] = await Promise.all([
    getPost(supabase, id),
    supabase.auth.getUser(),
  ]);
  if (!post) notFound();
  const user = userResult.data.user;
  if (!user) notFound();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isAdmin = profile?.role === "admin";
  const isAuthor = post.author_id === user.id;
  if (!isAuthor && !isAdmin) notFound();

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
          <header className="bg-[var(--canvas)] border border-[var(--hairline)] rounded-[var(--r-md)] p-6">
            <h1 className="text-2xl font-bold">글 수정</h1>
          </header>
          <EditPostForm
            postId={post.id}
            category={post.category}
            title={post.title}
            body={post.body_md}
            tags={post.tags}
          />
        </div>
      }
    />
  );
}
