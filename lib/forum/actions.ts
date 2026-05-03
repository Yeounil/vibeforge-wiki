// lib/forum/actions.ts — Server Actions for forum writes. Auth/identity is
// established by the server-side Supabase client reading the session cookie;
// RLS enforces author_id = auth.uid().
"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { syncWikiRefs } from "@/lib/wiki-qa/sync";
import { newPostSchema, newCommentSchema, updatePostSchema, updateCommentSchema } from "./schemas";

const uuid = z.string().uuid();

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function createPostAction(formData: FormData): Promise<ActionResult> {
  const raw = {
    category: formData.get("category"),
    title: formData.get("title"),
    body_md: formData.get("body_md"),
    tags: formData.getAll("tags").map((t) => String(t)).filter((t) => t.length > 0),
  };
  const parsed = newPostSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data, error } = await supabase
    .from("posts")
    .insert({
      category: parsed.data.category,
      title: parsed.data.title,
      body_md: parsed.data.body_md,
      tags: parsed.data.tags,
      author_id: user.id,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  // Best-effort wiki ↔ Q&A sync. Failures must NOT block the post write.
  try {
    const admin = createServiceClient();
    const slugs = await syncWikiRefs(admin, data.id, parsed.data.body_md);
    for (const slug of slugs) revalidatePath(`/wiki/${slug}`);
  } catch (e) {
    console.error("[wiki-qa sync failed]", e);
  }

  revalidatePath(`/forum/${parsed.data.category}`);
  revalidatePath("/forum");
  redirect(`/forum/post/${data.id}`);
}

export async function createCommentAction(formData: FormData): Promise<ActionResult> {
  const raw = {
    post_id: formData.get("post_id"),
    body_md: formData.get("body_md"),
  };
  const parsed = newCommentSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { error } = await supabase.from("comments").insert({
    post_id: parsed.data.post_id,
    body_md: parsed.data.body_md,
    author_id: user.id,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/forum/post/${parsed.data.post_id}`);
  return { ok: true };
}

export async function updatePostAction(formData: FormData): Promise<ActionResult> {
  const raw = {
    id: formData.get("id"),
    title: formData.get("title"),
    body_md: formData.get("body_md"),
    tags: formData.getAll("tags").map((t) => String(t)).filter((t) => t.length > 0),
  };
  const parsed = updatePostSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  // Read existing post (need pre-edit slugs and category for revalidation).
  const { data: existing, error: readErr } = await supabase
    .from("posts")
    .select("category, body_md")
    .eq("id", parsed.data.id)
    .single();
  if (readErr || !existing) return { ok: false, error: readErr?.message ?? "글을 찾을 수 없어요." };

  const { data: updated, error: updErr } = await supabase
    .from("posts")
    .update({
      title: parsed.data.title,
      body_md: parsed.data.body_md,
      tags: parsed.data.tags,
    })
    .eq("id", parsed.data.id)
    .select("id, category")
    .single();
  if (updErr || !updated) return { ok: false, error: updErr?.message ?? "수정에 실패했어요." };

  // Best-effort wiki ↔ Q&A resync. Compute union of pre/post slugs to revalidate.
  let slugsToRevalidate: string[] = [];
  try {
    const admin = createServiceClient();
    // Capture old slugs from qa_wiki_refs BEFORE we re-sync (sync deletes them).
    const { data: oldRefs } = await admin
      .from("qa_wiki_refs")
      .select("wiki_slug")
      .eq("post_id", parsed.data.id);
    const oldSlugs = (oldRefs ?? []).map((r: { wiki_slug: string }) => r.wiki_slug);
    const newSlugs = await syncWikiRefs(admin, parsed.data.id, parsed.data.body_md);
    slugsToRevalidate = Array.from(new Set([...oldSlugs, ...newSlugs]));
  } catch (e) {
    console.error("[wiki-qa sync failed on update]", e);
  }
  for (const slug of slugsToRevalidate) revalidatePath(`/wiki/${slug}`);

  revalidatePath(`/forum/post/${parsed.data.id}`);
  revalidatePath(`/forum/${updated.category}`);
  revalidatePath("/forum");
  return { ok: true };
}

export async function deletePostAction(id: string): Promise<ActionResult> {
  const idCheck = uuid.safeParse(id);
  if (!idCheck.success) return { ok: false, error: "잘못된 요청입니다." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  // Capture category + slugs before delete (cascade will remove qa_wiki_refs).
  const { data: post } = await supabase
    .from("posts")
    .select("category")
    .eq("id", id)
    .single();

  let slugs: string[] = [];
  try {
    const admin = createServiceClient();
    const { data: refs } = await admin
      .from("qa_wiki_refs")
      .select("wiki_slug")
      .eq("post_id", id);
    slugs = (refs ?? []).map((r: { wiki_slug: string }) => r.wiki_slug);
  } catch (e) {
    console.error("[wiki-qa pre-delete read failed]", e);
  }

  const { error } = await supabase.from("posts").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  for (const slug of slugs) revalidatePath(`/wiki/${slug}`);
  if (post?.category) revalidatePath(`/forum/${post.category}`);
  revalidatePath("/forum");
  return { ok: true };
}

export async function updateCommentAction(formData: FormData): Promise<ActionResult> {
  const raw = {
    id: formData.get("id"),
    body_md: formData.get("body_md"),
  };
  const parsed = updateCommentSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: updated, error } = await supabase
    .from("comments")
    .update({ body_md: parsed.data.body_md })
    .eq("id", parsed.data.id)
    .select("post_id")
    .single();
  if (error || !updated) return { ok: false, error: error?.message ?? "수정에 실패했어요." };

  revalidatePath(`/forum/post/${updated.post_id}`);
  return { ok: true };
}

export async function deleteCommentAction(
  id: string,
  postId: string
): Promise<ActionResult> {
  const ids = z.object({ id: uuid, postId: uuid }).safeParse({ id, postId });
  if (!ids.success) return { ok: false, error: "잘못된 요청입니다." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { error } = await supabase.from("comments").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/forum/post/${postId}`);
  return { ok: true };
}
