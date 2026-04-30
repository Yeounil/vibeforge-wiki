-- 0002_rls.sql — VibeForge Plan 3: row-level security policies.

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.qa_wiki_refs enable row level security;

-- profiles: anyone can read; user can update only own row
create policy "profiles_select_all" on public.profiles for select using (true);
create policy "profiles_update_own" on public.profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);

-- posts: anyone reads; authenticated users can insert (own author_id);
-- update/delete by author or admin; notice insert restricted to admin.
create policy "posts_select_all" on public.posts for select using (true);

create policy "posts_insert_authenticated" on public.posts for insert
  with check (
    auth.uid() = author_id
    and (
      category in ('qa','general')
      or (category = 'notice' and exists (
        select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
      ))
    )
  );

create policy "posts_update_author_or_admin" on public.posts for update
  using (
    auth.uid() = author_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    auth.uid() = author_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "posts_delete_author_or_admin" on public.posts for delete
  using (
    auth.uid() = author_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- comments: same author/admin pattern, insert by any authenticated user
create policy "comments_select_all" on public.comments for select using (true);
create policy "comments_insert_authenticated" on public.comments for insert
  with check (auth.uid() = author_id);
create policy "comments_update_author_or_admin" on public.comments for update
  using (
    auth.uid() = author_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
create policy "comments_delete_author_or_admin" on public.comments for delete
  using (
    auth.uid() = author_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- qa_wiki_refs: read public, write only via service role (no user policy)
create policy "qa_wiki_refs_select_all" on public.qa_wiki_refs for select using (true);
-- (no insert/update/delete policy → only service_role bypass can write)
