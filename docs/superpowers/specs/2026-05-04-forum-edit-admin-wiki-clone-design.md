# VibeForge — Forum Edit/Delete, Admin Page, Wiki Clone Section

**Date:** 2026-05-04
**Status:** Design approved, awaiting implementation plan
**Branch base:** `plan3/supabase-forum`

## Goals

Three independent capabilities, bundled because they share the same auth/RLS substrate already in place:

1. **Forum posts and comments are editable and deletable** by their author or by an admin. Today the site has only create.
2. **Admin permissions are managed in-app** via an `/admin` page. Today the only path to admin is `update profiles set role='admin' ...` in Supabase Studio.
3. **The wiki vault is discoverable as a standalone repo** — a section in About explains how to `git clone` `vibeforge-wiki` for offline use or LLM ingestion.

## Non-goals (explicit)

These would be reasonable next steps but are intentionally out of scope to keep this single plan focused:

- Edit history / revision log (no `post_revisions` table)
- Soft delete with restore (`deleted_at` columns)
- Moderation queue, ban-user, audit log of edits/deletes
- Moving a post between categories on edit
- Bulk admin tools (bulk delete, bulk demote)
- Email/Slack notifications on promotion or moderation

The schema and RLS designed here do not preclude any of these — they can land later without migration churn.

## Existing infrastructure being reused

A lot of the security work is already done; this design leans on it rather than rebuilding:

- `profiles.role` column exists with `check (role in ('user','admin'))` (`supabase/migrations/0001_init.sql`)
- `posts_update_author_or_admin`, `posts_delete_author_or_admin`, and the parallel comment policies already gate edits/deletes correctly (`supabase/migrations/0002_rls.sql`)
- `0004_lock_role_column.sql` revoked the `role` column from `authenticated`'s GRANT, so users cannot self-promote — only `service_role` (which bypasses RLS and column GRANTs) can change role
- `posts.updated_at` and `comments.updated_at` columns already exist
- `NEXT_PUBLIC_WIKI_REPO_URL` is already in `.env.example` pointing at `https://github.com/Yeounil/vibeforge-wiki`
- The `lib/supabase/service.ts` server-only service-role client exists and is already used for `qa_wiki_refs` writes
- `site-pages/about.md` is the rendered source of `/about` via `loadSitePage` — markdown-only edits are sufficient

## Architecture

### A. Forum edit/delete

**Server actions** (`lib/forum/actions.ts`):

| Action | Auth | RLS gate | Side effects |
|---|---|---|---|
| `updatePostAction(formData)` | cookie session | `posts_update_author_or_admin` | re-run `syncWikiRefs` (best-effort), revalidate `/forum/post/[id]`, `/forum/[category]`, `/forum`, every affected wiki slug (union of pre-edit and post-edit slug sets) |
| `deletePostAction(id)` | cookie session | `posts_delete_author_or_admin` | read `qa_wiki_refs` rows for the post first → delete post → revalidate `/forum/[category]`, `/forum`, those wiki slugs; redirect to `/forum/[category]` |
| `updateCommentAction(formData)` | cookie session | `comments_update_author_or_admin` | revalidate `/forum/post/[post_id]` |
| `deleteCommentAction(id)` | cookie session | `comments_delete_author_or_admin` | revalidate `/forum/post/[post_id]` |

All four use the cookie-bound server client (`lib/supabase/server.ts`), never the service-role client. RLS does the gating; the server action does not re-check ownership in application code.

**Validation** — additions to `lib/forum/schemas.ts`:

```ts
export const updatePostSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  body_md: z.string().trim().min(1).max(20000),
  tags: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
});
export const updateCommentSchema = z.object({
  id: z.string().uuid(),
  body_md: z.string().trim().min(1).max(5000),
});
```

`category` is intentionally not editable — moving a post between categories changes notice/Q&A semantics and is out of scope.

**Wiki-ref resync on edit** — `syncWikiRefs` already does an upsert+delete diff. The new step: before invoking it for an update, fetch the existing slug set from `qa_wiki_refs` so we can revalidate the union of (existing slugs ∪ new slugs). On delete, fetch the slug set before the delete and revalidate it.

**Error handling** — Korean to user, English to logs. RLS denials surface as Postgres errors and collapse to a generic "권한이 없어요." message. Zod errors keep field-level Korean text. `syncWikiRefs` failures on update behave exactly like on create today: `console.error` and continue.

### B. Admin page

**New route** `app/admin/page.tsx` — server component, AppShell layout. On every request:

1. `requireAdmin()` (new helper, see below). Non-admins get `notFound()` — the page does not advertise its existence.
2. Fetch all profiles ordered by role desc, then created_at desc.
3. Render a table: GitHub login, display name, role, promoted_at, action button.
4. Each row's button submits a form that calls `promoteUserAction` or `demoteUserAction`.

**Admin-guard helper** — new file `lib/auth/require-admin.ts`:

```ts
export async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();
  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") notFound();
  return user;
}
```

Used by `/admin/page.tsx` AND inside `promoteUserAction` / `demoteUserAction` as defense-in-depth before the action reaches for the service-role client.

**Admin server actions** — new file `lib/admin/actions.ts`:

```ts
export async function promoteUserAction(targetId: string): Promise<ActionResult>
export async function demoteUserAction(targetId: string): Promise<ActionResult>
```

Each:

1. `requireAdmin()` (gets current admin's user).
2. Validate `targetId` as UUID (Zod).
3. For demote: assert `targetId !== currentAdmin.id` (prevents the last admin from locking themselves out).
4. Open `createServiceClient()` (server-only).
5. Promote: `update profiles set role='admin', promoted_at=now(), promoted_by=<currentAdmin.id> where id=targetId`. Demote: `update profiles set role='user', promoted_at=null, promoted_by=null where id=targetId`.
6. `revalidatePath('/admin')`.

**Nav** — add an "Admin" link to `components/layout/SiteHeader.tsx` that renders only for admins. SiteHeader is a server component already; it will fetch the current user's role itself (via the same pattern as `requireAdmin` but with a non-throwing variant). One extra DB query per page render is acceptable; cache via React's request memoization if the same lookup happens elsewhere on the same request.

**Bootstrap** — the first admin is still minted in Supabase Studio with the SQL already documented in 0004's comment block. Once one admin exists, all subsequent promotions go through `/admin`. README/CLAUDE.md gets one short paragraph clarifying this.

### C. Wiki clone section in About

Edit `site-pages/about.md` to append a new section. No new route, no new component; the existing `loadSitePage` → `renderBody` pipeline handles it.

```markdown
## 위키 로컬로 가져오기

이 위키의 모든 마크다운 파일은 별도 GitHub 저장소에 있어서, 그대로 받아 LLM에 통째로 넣거나 오프라인에서 보기에 좋아요.

​```bash
git clone https://github.com/Yeounil/vibeforge-wiki.git
​```

저장소: <https://github.com/Yeounil/vibeforge-wiki>

받은 후 `data/` 폴더 아래에 카테고리별 `.md` 파일이 들어있어요. 위키 사이트와 동일한 내용이며, 라이선스를 지키는 한 자유롭게 활용·수정해도 좋아요.
```

The repo URL is hardcoded in the markdown (matching `NEXT_PUBLIC_WIKI_REPO_URL` in `.env.example`). If the wiki repo is ever renamed, About is a one-line edit.

**Optional discovery affordance** — add a `<Pill href="/about#<slug>" variant="secondary">위키 다운로드</Pill>` next to the existing pills in `app/wiki/page.tsx`. The fragment id is whatever `rehype-slug` generates from the Korean heading "위키 로컬로 가져오기" — to be verified during implementation by inspecting rendered HTML; if `rehype-slug` produces an unstable or empty id for Korean headings, fall back to inserting an explicit `<h2 id="wiki-clone">` via raw HTML in the markdown.

## Data model

One new migration: `supabase/migrations/0005_admin_and_metadata.sql`.

```sql
-- Track when admin status was granted, for audit + UI.
alter table public.profiles
  add column promoted_at timestamptz,
  add column promoted_by uuid references auth.users(id);

-- Trigger: bump updated_at on UPDATE to posts and comments.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger posts_touch_updated before update on public.posts
  for each row execute function public.touch_updated_at();
create trigger comments_touch_updated before update on public.comments
  for each row execute function public.touch_updated_at();
```

**Why a DB trigger for `updated_at` instead of setting it in the server action:** any RLS-bypass path (admin moderation in Supabase Studio, future scripts) also benefits, and it removes a trust-the-app surface.

**Why nullable `promoted_by`:** the very first admin is minted via Studio without a granting admin recorded. Subsequent promotions always populate it.

**RLS — no new policies needed.** The existing policies in 0002 already gate updates/deletes correctly. Role updates remain locked by 0004's column GRANT.

## UI surfaces

### Post detail page

`app/forum/post/[id]/page.tsx` — server fetches viewer's role alongside `auth.getUser`, passes `{canEdit, canDelete}` props to a new `PostActions` client component rendered next to the post header date. `PostActions` shows two buttons:

- "수정" → `Link` to `/forum/post/[id]/edit`
- "삭제" → calls `deletePostAction(post.id)` after `confirm("정말 삭제하시겠어요?")`

UI gating is convenience only; RLS would deny a forged request anyway.

### Edit page

New route `app/forum/post/[id]/edit/page.tsx`:

1. Server fetches post.
2. Server gates: load viewer's role; if not author and not admin, `notFound()`.
3. Render new `EditPostForm` component.

**Form refactor** — extract the title/body/tags input core out of `components/forum/NewPostForm.tsx` into a shared `PostFormFields` component. `NewPostForm` and `EditPostForm` both render `<PostFormFields>` and differ only in the action target and submit label. The category control is shown read-only on edit.

On submit, `EditPostForm` calls `updatePostAction`; on success, `redirect(`/forum/post/${id}`)`.

### Comments

Refactor each `<li>` in `app/forum/post/[id]/page.tsx`'s comment list into a `CommentItem` client component that owns its edit-mode state. When `canEdit` (author or admin):

- "수정" toggles the rendered `<p>` to a textarea + Save / Cancel buttons. Save calls `updateCommentAction`. Cancel reverts.
- "삭제" runs `confirm("이 댓글을 삭제할까요?")` + `deleteCommentAction`.

`CommentForm` (the new-comment composer) is untouched.

### `/admin` page

Single table, AppShell layout. Approximate render:

```
GitHub login    Display name    Role    Promoted at      Action
@yeounil        연일             admin    2026-05-04       [강등]   ← disabled (self)
@someone        Someone         user     —                [승격]
...
```

Each action is a `<form action={promoteUserAction}>` with a hidden `targetId` input — keeps the page server-rendered with progressive enhancement.

### About page

The markdown change in section C is the entire UI work. `/about` already renders site-pages/about.md through the standard pipeline.

### Wiki index Pill

Optional but recommended: `app/wiki/page.tsx` gains one `<Pill href="/about#<slug>" variant="secondary">위키 다운로드</Pill>` near the existing pills.

## Testing

| What | Where | Type |
|---|---|---|
| `updatePostSchema`, `updateCommentSchema` boundary cases | `lib/forum/schemas.test.ts` | unit |
| `requireAdmin` returns user when admin, `notFound()`s otherwise | `lib/auth/require-admin.test.ts` | unit (mock supabase) |
| `promoteUserAction` blocks non-admins, blocks self-demote, calls service-role on success | `lib/admin/actions.test.ts` | unit (mock both clients) |
| `PostActions` shows buttons only when `canEdit`/`canDelete` | `components/forum/PostActions.test.tsx` | RTL |
| `CommentItem` toggles edit mode and submits | `components/forum/CommentItem.test.tsx` | RTL |
| Author edits own post, sees update; non-author cannot reach edit page (404) | `tests/e2e/forum-edit.spec.ts` | playwright |
| Author deletes post → redirect, post 404s | `tests/e2e/forum-delete.spec.ts` | playwright |
| Non-admin visiting `/admin` gets 404; admin sees table; promote/demote works | `tests/e2e/admin-guard.spec.ts` | playwright |
| About page renders the wiki clone section with the repo URL and `git clone` snippet | `tests/e2e/about-wiki-clone.spec.ts` | playwright |

E2E auth uses the existing stored Supabase session cookie pattern. The admin role for tests is set against the test Supabase project via SQL fixture; if the existing e2e harness already mocks auth, mock the role lookup at the page boundary instead — to be confirmed during implementation.

## Rollout sequence

This is the order tasks will land in the implementation plan:

1. Migration `0005_admin_and_metadata.sql` (`promoted_at`, `promoted_by`, `touch_updated_at` trigger) — apply to local + production Supabase
2. `lib/auth/require-admin.ts` helper + tests
3. Forum edit/delete server actions in `lib/forum/actions.ts` + Zod schema additions + tests
4. `PostActions` client component + edit page route + `EditPostForm` extraction + tests
5. `CommentItem` inline edit/delete refactor + tests
6. `lib/admin/actions.ts` (`promoteUserAction`, `demoteUserAction`) + tests
7. `/admin` page + Admin nav link in `SiteHeader` + e2e test
8. About page wiki-clone section + optional `/wiki` Pill + e2e test
9. README/CLAUDE.md note about `/admin` and the first-admin bootstrap

## Risks and considerations

- **First admin chicken-and-egg:** `/admin` requires an existing admin, but `0004_lock_role_column.sql` already locks role from clients. The bootstrap path (one-time SQL in Supabase Studio) is already documented in 0004's comment block; we just need to surface it once in README/CLAUDE.md.
- **Self-demote lockout:** prevented by an explicit check in `demoteUserAction`. Acceptable trade-off vs. the alternative of allowing it and relying on bootstrap-via-Studio to recover.
- **Edit storms invalidating wiki-ref revalidations:** `syncWikiRefs` is best-effort and already failure-tolerant; the union-of-slugs revalidation strategy adds at most a few extra path revalidations and never fewer than needed.
- **`rehype-slug` and Korean headings:** if it produces a fragile id, the fallback (raw HTML `<h2 id="wiki-clone">`) is trivial.
- **`SiteHeader` becomes async:** it already imports server-only auth; one more `select role` query per render is fine. If it isn't already a server component, the refactor is small.
