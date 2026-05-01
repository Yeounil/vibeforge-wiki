// lib/wiki-qa/queries.ts — read-side helpers for qa_wiki_refs.
// Public read RLS allows anon access; use any client (anon or user-bound).
import type { SupabaseClient } from "@supabase/supabase-js";

export interface RelatedPost {
  id: string;
  category: "qa" | "general" | "notice";
  title: string;
  created_at: string;
  author: {
    display_name: string | null;
    github_login: string | null;
    avatar_url: string | null;
  } | null;
}

const POST_EMBED =
  "post:posts!inner(id, category, title, created_at, author:profiles!posts_author_id_fkey(display_name, github_login, avatar_url))";

export async function listPostsByWikiSlug(
  supabase: SupabaseClient,
  slug: string,
  limit = 20
): Promise<RelatedPost[]> {
  const { data, error } = await supabase
    .from("qa_wiki_refs")
    .select(POST_EMBED)
    .eq("wiki_slug", slug)
    .order("created_at", { referencedTable: "posts", ascending: false })
    .limit(limit);
  if (error) throw error;
  if (!data) return [];
  return (data as unknown as { post: RelatedPost }[]).map((r) => r.post);
}

export async function listWikiRefsByPost(
  supabase: SupabaseClient,
  postId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from("qa_wiki_refs")
    .select("wiki_slug")
    .eq("post_id", postId)
    .order("wiki_slug", { ascending: true });
  if (error) throw error;
  if (!data) return [];
  return (data as { wiki_slug: string }[]).map((r) => r.wiki_slug);
}
