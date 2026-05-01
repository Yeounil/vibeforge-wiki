// lib/wiki-qa/sync.ts — service-role write to qa_wiki_refs.
// Idempotent: delete-then-insert. Caller (createPostAction) wraps in try/catch
// so failures don't block post writes. Returns the slug list so caller can
// revalidatePath('/wiki/<slug>') for each.
import type { SupabaseClient } from "@supabase/supabase-js";
import { extractWikiRefs } from "./extract";
import { getAliasMap } from "@/lib/wiki/page-loader";

export async function syncWikiRefs(
  admin: SupabaseClient,
  postId: string,
  body: string
): Promise<string[]> {
  const aliasMap = await getAliasMap();
  const slugs = extractWikiRefs(body, aliasMap);

  const del = await admin
    .from("qa_wiki_refs")
    .delete()
    .eq("post_id", postId);
  if (del.error) throw del.error;

  if (slugs.length === 0) return [];

  const rows = slugs.map((s) => ({ post_id: postId, wiki_slug: s }));
  const ins = await admin.from("qa_wiki_refs").insert(rows);
  if (ins.error) throw ins.error;

  return slugs;
}
