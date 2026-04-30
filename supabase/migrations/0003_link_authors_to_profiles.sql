-- 0003_link_authors_to_profiles.sql — re-route author FK through profiles
-- so PostgREST can embed profile author info via foreign-table syntax.
--
-- Background: 0001_init.sql declared posts.author_id and comments.author_id
-- as references to auth.users(id). This works for cascade delete (anchor
-- identity stays in auth.users) but PostgREST cannot embed `profiles` data
-- when the FK lands on auth.users instead of public.profiles.
--
-- profiles.id already references auth.users(id) on delete cascade, so
-- routing posts/comments author_id through profiles preserves the cascade
-- chain: auth.users delete → profiles delete → posts/comments delete.

alter table public.posts
  drop constraint posts_author_id_fkey,
  add constraint posts_author_id_fkey
    foreign key (author_id) references public.profiles(id) on delete cascade;

alter table public.comments
  drop constraint comments_author_id_fkey,
  add constraint comments_author_id_fkey
    foreign key (author_id) references public.profiles(id) on delete cascade;
