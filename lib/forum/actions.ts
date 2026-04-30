// lib/forum/actions.ts — Server Actions for forum writes. Auth/identity is
// established by the server-side Supabase client reading the session cookie;
// RLS enforces author_id = auth.uid().
"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { newPostSchema, newCommentSchema } from "./schemas";

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
