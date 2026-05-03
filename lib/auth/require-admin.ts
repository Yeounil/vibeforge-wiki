// lib/auth/require-admin.ts — server-only guard that returns the current
// authenticated user IF they are an admin. Otherwise calls notFound() so
// pages don't reveal their existence to non-admins.
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") notFound();
  return user;
}
