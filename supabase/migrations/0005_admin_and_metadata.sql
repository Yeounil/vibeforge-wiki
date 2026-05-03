-- 0005_admin_and_metadata.sql — track admin grants + auto-bump updated_at.
--
-- Adds promoted_at / promoted_by to profiles for audit, and triggers
-- bump posts.updated_at and comments.updated_at on every UPDATE.
-- Triggers (rather than app code) ensure the bump applies to RLS-bypass
-- paths too (Supabase Studio edits, future maintenance scripts).

alter table public.profiles
  add column promoted_at timestamptz,
  add column promoted_by uuid references auth.users(id) on delete set null;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists posts_touch_updated on public.posts;
create trigger posts_touch_updated
  before update on public.posts
  for each row execute function public.touch_updated_at();

drop trigger if exists comments_touch_updated on public.comments;
create trigger comments_touch_updated
  before update on public.comments
  for each row execute function public.touch_updated_at();
