-- 0001_init.sql — VibeForge Plan 3: forum schema (profiles, posts, comments, qa_wiki_refs)

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  github_login text,
  display_name text,
  avatar_url text,
  role text not null default 'user' check (role in ('user','admin')),
  created_at timestamptz not null default now()
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('qa','general','notice')),
  title text not null,
  body_md text not null,
  author_id uuid not null references auth.users on delete cascade,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index posts_category_created_idx on public.posts (category, created_at desc);
create index posts_author_idx on public.posts (author_id);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts on delete cascade,
  body_md text not null,
  author_id uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index comments_post_created_idx on public.comments (post_id, created_at);

create table public.qa_wiki_refs (
  post_id uuid not null references public.posts on delete cascade,
  wiki_slug text not null,
  primary key (post_id, wiki_slug)
);
create index qa_wiki_refs_slug_idx on public.qa_wiki_refs (wiki_slug);

-- Auto-create profile row on first auth signup (uses Supabase auth.users trigger)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, github_login, display_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'user_name',
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'user_name'),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
