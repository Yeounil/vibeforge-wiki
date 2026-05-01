-- 0004_lock_role_column.sql — security hardening: prevent self-promotion to admin.
--
-- Background: 0002_rls.sql created `profiles_update_own` which permits a user
-- to update their own profile row (auth.uid() = id). RLS in PostgreSQL operates
-- at the ROW level; it does NOT enforce column-level checks. So an authenticated
-- user could issue:
--
--     update public.profiles set role = 'admin' where id = auth.uid();
--
-- and pass the row-level policy, gaining admin privileges (which then unlocks
-- the `notice` category in posts_insert_authenticated and other admin gates).
--
-- Fix: tighten column-level GRANT for the `authenticated` role. Postgres
-- enforces both RLS and column GRANTs on UPDATE — the user must have
-- privilege on EVERY column they include in the SET clause. By granting only
-- the columns a user legitimately owns (github_login, display_name,
-- avatar_url), `role` and `created_at` become server-only — only service_role
-- (which bypasses RLS and column GRANTs) can change them.
--
-- Bootstrap implication: to mint the first admin, run via Supabase Studio
-- (service_role context):
--
--     update public.profiles set role = 'admin' where github_login = '<your-login>';
--
-- The handle_new_user trigger from 0001_init.sql is unaffected — it runs as
-- security definer and bypasses these GRANTs when creating new profile rows.

revoke update on public.profiles from authenticated;
grant update (github_login, display_name, avatar_url)
  on public.profiles to authenticated;

-- Sanity probes (run as authenticated, expect failure):
--   update public.profiles set role = 'admin' where id = auth.uid();
--     -> ERROR: permission denied for column role
--   update public.profiles set created_at = now() where id = auth.uid();
--     -> ERROR: permission denied for column created_at
--
-- Run as authenticated, expect success:
--   update public.profiles set display_name = 'X' where id = auth.uid();
