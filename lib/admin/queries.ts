// lib/admin/queries.ts — server-side reads for the /admin page.
import type { SupabaseClient } from "@supabase/supabase-js";

export interface AdminProfileRow {
  id: string;
  github_login: string | null;
  display_name: string | null;
  role: "user" | "admin";
  created_at: string;
  promoted_at: string | null;
}

const SELECT = "id, github_login, display_name, role, created_at, promoted_at";

export async function listAdminProfiles(
  supabase: SupabaseClient
): Promise<AdminProfileRow[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select(SELECT)
    .order("role", { ascending: false }) // admin first (since 'user' < 'admin' lexicographically with desc → admin top)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AdminProfileRow[];
}
