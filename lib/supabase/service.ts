// lib/supabase/service.ts — service-role Supabase client. Used ONLY server-side
// to bypass RLS for tables that have no user-facing write policy
// (currently: qa_wiki_refs).
import { createClient } from "@supabase/supabase-js";
import { getServerEnv } from "@/lib/env";

export function createServiceClient() {
  const env = getServerEnv();
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
