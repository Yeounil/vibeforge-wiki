// lib/forum/queries.ts — server-side reads against Supabase. ALL functions
// take a `supabase` client argument so callers (Server Components, Route
// Handlers, tests) can inject either the real or a mock client.
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ForumCategory,
  Post,
  PostWithAuthor,
  CommentWithAuthor,
} from "./types";

const POST_FIELDS =
  "id, category, title, body_md, author_id, tags, created_at, updated_at";
const POST_WITH_AUTHOR_SELECT = `${POST_FIELDS}, author:profiles!posts_author_id_fkey(github_login, display_name, avatar_url)`;
const COMMENT_WITH_AUTHOR_SELECT =
  "id, post_id, body_md, author_id, created_at, updated_at, author:profiles!comments_author_id_fkey(github_login, display_name, avatar_url)";

export async function listPosts(
  supabase: SupabaseClient,
  opts: { category?: ForumCategory; limit?: number } = {}
): Promise<PostWithAuthor[]> {
  let q = supabase
    .from("posts")
    .select(POST_WITH_AUTHOR_SELECT)
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 50);
  if (opts.category) q = q.eq("category", opts.category);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as PostWithAuthor[];
}

export async function getPost(
  supabase: SupabaseClient,
  id: string
): Promise<PostWithAuthor | null> {
  const { data, error } = await supabase
    .from("posts")
    .select(POST_WITH_AUTHOR_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as PostWithAuthor | null) ?? null;
}

export async function listComments(
  supabase: SupabaseClient,
  postId: string
): Promise<CommentWithAuthor[]> {
  const { data, error } = await supabase
    .from("comments")
    .select(COMMENT_WITH_AUTHOR_SELECT)
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as CommentWithAuthor[];
}

export async function countPostsByCategory(
  supabase: SupabaseClient
): Promise<Record<ForumCategory, number>> {
  const cats: ForumCategory[] = ["qa", "general", "notice"];
  const out: Record<ForumCategory, number> = { qa: 0, general: 0, notice: 0 };
  for (const cat of cats) {
    const { count, error } = await supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("category", cat);
    if (error) throw error;
    out[cat] = count ?? 0;
  }
  return out;
}

// Used by Plan 4 (wiki/qa backlinks) — defined now so the Post type covers it.
export type { Post };
