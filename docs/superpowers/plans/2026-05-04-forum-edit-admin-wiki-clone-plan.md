# Forum Edit/Delete, Admin Page, Wiki Clone Section — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make forum posts/comments editable and deletable by author or admin, add an in-app `/admin` page for promoting/demoting users, and add a wiki-clone section to the About page so users can `git clone` the wiki vault.

**Architecture:** Reuse existing RLS policies (already author-OR-admin gated). Add four new server actions for edit/delete. Add a `requireAdmin` server helper plus two service-role admin actions for role flips. UI gets a `PostActions` button cluster, an edit page route with a refactored `PostFormFields`, an inline-edit `CommentItem`, and an `/admin` table. About is a markdown append; the optional `/wiki` Pill links to the new anchor.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript strict, Supabase (Postgres + RLS), Zod, Vitest + React Testing Library, Playwright. Existing service-role client at `lib/supabase/service.ts`, cookie-bound server client at `lib/supabase/server.ts`.

**Spec:** [`docs/superpowers/specs/2026-05-04-forum-edit-admin-wiki-clone-design.md`](../specs/2026-05-04-forum-edit-admin-wiki-clone-design.md)

---

## File structure overview

**New files:**
- `supabase/migrations/0005_admin_and_metadata.sql`
- `lib/auth/require-admin.ts`
- `lib/auth/require-admin.test.ts`
- `lib/admin/actions.ts`
- `lib/admin/actions.test.ts`
- `lib/admin/queries.ts` (lists profiles for the admin table)
- `components/forum/PostFormFields.tsx` (extracted from NewPostForm)
- `components/forum/EditPostForm.tsx`
- `components/forum/PostActions.tsx`
- `components/forum/PostActions.test.tsx`
- `components/forum/CommentItem.tsx`
- `components/forum/CommentItem.test.tsx`
- `components/admin/AdminTable.tsx`
- `app/forum/post/[id]/edit/page.tsx`
- `app/admin/page.tsx`
- `tests/e2e/admin-guard.spec.ts`
- `tests/e2e/about-wiki-clone.spec.ts`

**Modified files:**
- `lib/forum/schemas.ts` (add update schemas)
- `lib/forum/schemas.test.ts` (add update schema tests)
- `lib/forum/actions.ts` (add four new actions)
- `lib/forum/actions.test.ts` (new — focused on validation paths of new actions)
- `components/forum/NewPostForm.tsx` (delegate fields to PostFormFields)
- `components/layout/SiteHeader.tsx` (admin link)
- `app/forum/post/[id]/page.tsx` (render PostActions, swap CommentItem in)
- `app/wiki/page.tsx` (optional 위키 다운로드 Pill)
- `site-pages/about.md` (wiki-clone section)
- `README.md` (one paragraph on `/admin` + first-admin bootstrap)
- `CLAUDE.md` (one line under Architecture noting `/admin` route)

---

## Task 1: Migration 0005 — `promoted_at`, `promoted_by`, `updated_at` triggers

**Files:**
- Create: `supabase/migrations/0005_admin_and_metadata.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0005_admin_and_metadata.sql`:

```sql
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
```

- [ ] **Step 2: Apply the migration to local Supabase**

If using local Supabase CLI:

```bash
npx supabase db reset
```

Or apply the single migration:

```bash
npx supabase migration up
```

Otherwise, paste the SQL into Supabase Studio's SQL editor against the dev project.

- [ ] **Step 3: Verify schema with a probe query**

Run in Supabase Studio (or `psql`):

```sql
select column_name from information_schema.columns
  where table_name = 'profiles' and column_name in ('promoted_at','promoted_by');
-- expect 2 rows

select tgname from pg_trigger
  where tgname in ('posts_touch_updated','comments_touch_updated');
-- expect 2 rows
```

- [ ] **Step 4: Smoke test the trigger**

Run as service_role (Supabase Studio):

```sql
-- Pick any existing post or insert a test row first.
update public.posts set body_md = body_md where id = '<some-post-id>';
select id, updated_at from public.posts where id = '<some-post-id>';
-- updated_at should be ~now(), not the original timestamp
```

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0005_admin_and_metadata.sql
git commit -m "feat(db): add promoted_at/promoted_by + updated_at triggers"
```

---

## Task 2: `requireAdmin` helper + tests

**Files:**
- Create: `lib/auth/require-admin.ts`
- Create: `lib/auth/require-admin.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/auth/require-admin.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

const getUser = vi.fn();
const profileSelect = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: profileSelect,
        }),
      }),
    }),
  })),
}));

import { requireAdmin } from "./require-admin";

describe("requireAdmin", () => {
  beforeEach(() => {
    getUser.mockReset();
    profileSelect.mockReset();
  });

  it("calls notFound when no user is logged in", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    await expect(requireAdmin()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("calls notFound when logged-in user is not admin", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    profileSelect.mockResolvedValue({ data: { role: "user" }, error: null });
    await expect(requireAdmin()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("returns user when they are admin", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "admin-1" } } });
    profileSelect.mockResolvedValue({ data: { role: "admin" }, error: null });
    const user = await requireAdmin();
    expect(user.id).toBe("admin-1");
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

```bash
npx vitest run lib/auth/require-admin.test.ts
```

Expected: FAIL with module resolution error for `./require-admin`.

- [ ] **Step 3: Implement `requireAdmin`**

Create `lib/auth/require-admin.ts`:

```ts
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
```

- [ ] **Step 4: Run the test, verify it passes**

```bash
npx vitest run lib/auth/require-admin.test.ts
```

Expected: 3 PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/auth/require-admin.ts lib/auth/require-admin.test.ts
git commit -m "feat(auth): add requireAdmin server-side guard"
```

---

## Task 3: Add `updatePostSchema` + `updateCommentSchema` (TDD)

**Files:**
- Modify: `lib/forum/schemas.ts`
- Modify: `lib/forum/schemas.test.ts`

- [ ] **Step 1: Add failing tests for the new schemas**

Append to `lib/forum/schemas.test.ts`:

```ts
import { updatePostSchema, updateCommentSchema } from "./schemas";

describe("updatePostSchema", () => {
  const valid = {
    id: "00000000-0000-0000-0000-000000000001",
    title: "edited title",
    body_md: "edited body",
    tags: ["git"],
  };

  it("accepts valid update", () => {
    expect(updatePostSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects non-uuid id", () => {
    expect(updatePostSchema.safeParse({ ...valid, id: "nope" }).success).toBe(false);
  });

  it("rejects empty title", () => {
    expect(updatePostSchema.safeParse({ ...valid, title: "" }).success).toBe(false);
  });

  it("rejects body over 20000 chars", () => {
    expect(
      updatePostSchema.safeParse({ ...valid, body_md: "a".repeat(20001) }).success
    ).toBe(false);
  });

  it("trims title", () => {
    const r = updatePostSchema.safeParse({ ...valid, title: "  hi  " });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.title).toBe("hi");
  });
});

describe("updateCommentSchema", () => {
  const valid = {
    id: "00000000-0000-0000-0000-000000000002",
    body_md: "edited",
  };
  it("accepts valid update", () => {
    expect(updateCommentSchema.safeParse(valid).success).toBe(true);
  });
  it("rejects non-uuid id", () => {
    expect(updateCommentSchema.safeParse({ ...valid, id: "nope" }).success).toBe(false);
  });
  it("rejects empty body", () => {
    expect(updateCommentSchema.safeParse({ ...valid, body_md: "" }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests, verify failing**

```bash
npx vitest run lib/forum/schemas.test.ts
```

Expected: FAIL (no `updatePostSchema` export).

- [ ] **Step 3: Add the schemas**

Append to `lib/forum/schemas.ts`:

```ts
export const updatePostSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1, "제목을 입력하세요").max(200),
  body_md: z.string().trim().min(1, "본문을 입력하세요").max(20000),
  tags: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
});
export type UpdatePostInput = z.infer<typeof updatePostSchema>;

export const updateCommentSchema = z.object({
  id: z.string().uuid(),
  body_md: z.string().trim().min(1, "댓글을 입력하세요").max(5000),
});
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
```

- [ ] **Step 4: Run tests, verify passing**

```bash
npx vitest run lib/forum/schemas.test.ts
```

Expected: PASS (existing 5 + new 8 = 13).

- [ ] **Step 5: Commit**

```bash
git add lib/forum/schemas.ts lib/forum/schemas.test.ts
git commit -m "feat(forum): add update schemas for posts and comments"
```

---

## Task 4: Forum edit/delete server actions

**Files:**
- Modify: `lib/forum/actions.ts`
- Create: `lib/forum/actions.test.ts`

This task adds four actions: `updatePostAction`, `deletePostAction`, `updateCommentAction`, `deleteCommentAction`. Tests cover the validation/auth paths; the RLS gate is exercised by Postgres at runtime and not unit-testable here.

- [ ] **Step 1: Write failing tests for the new actions**

Create `lib/forum/actions.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const revalidatePath = vi.fn();
const redirect = vi.fn((path: string) => {
  throw new Error(`REDIRECT:${path}`);
});

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("next/navigation", () => ({ redirect }));

const getUser = vi.fn();
const fromMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser },
    from: fromMock,
  })),
}));
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(() => ({ from: fromMock })),
}));
vi.mock("@/lib/wiki-qa/sync", () => ({
  syncWikiRefs: vi.fn(async () => []),
}));

import {
  updatePostAction,
  deletePostAction,
  updateCommentAction,
  deleteCommentAction,
} from "./actions";

function makeFormData(entries: Record<string, string | string[]>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) {
    if (Array.isArray(v)) {
      for (const item of v) fd.append(k, item);
    } else {
      fd.append(k, v);
    }
  }
  return fd;
}

beforeEach(() => {
  revalidatePath.mockReset();
  redirect.mockReset();
  getUser.mockReset();
  fromMock.mockReset();
});

describe("updatePostAction", () => {
  it("rejects when not logged in", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const r = await updatePostAction(
      makeFormData({
        id: "00000000-0000-0000-0000-000000000001",
        title: "t",
        body_md: "b",
      })
    );
    expect(r.ok).toBe(false);
    expect(r.error).toContain("로그인");
  });

  it("rejects invalid input", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const r = await updatePostAction(
      makeFormData({ id: "not-a-uuid", title: "t", body_md: "b" })
    );
    expect(r.ok).toBe(false);
  });

  it("returns supabase error on update failure", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    fromMock.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          single: vi.fn().mockResolvedValue({
            data: { id: "p1", body_md: "old" },
            error: null,
          }),
        }),
      }),
    });
    fromMock.mockReturnValueOnce({
      update: () => ({
        eq: () => ({
          select: () => ({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: "denied" },
            }),
          }),
        }),
      }),
    });
    const r = await updatePostAction(
      makeFormData({
        id: "00000000-0000-0000-0000-000000000001",
        title: "t",
        body_md: "b",
      })
    );
    expect(r.ok).toBe(false);
    expect(r.error).toBe("denied");
  });
});

describe("deletePostAction", () => {
  it("rejects when not logged in", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const r = await deletePostAction("00000000-0000-0000-0000-000000000001");
    expect(r.ok).toBe(false);
  });

  it("rejects non-uuid id", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const r = await deletePostAction("not-a-uuid");
    expect(r.ok).toBe(false);
  });
});

describe("updateCommentAction", () => {
  it("rejects when not logged in", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const r = await updateCommentAction(
      makeFormData({
        id: "00000000-0000-0000-0000-000000000002",
        body_md: "x",
      })
    );
    expect(r.ok).toBe(false);
  });

  it("rejects empty body", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const r = await updateCommentAction(
      makeFormData({
        id: "00000000-0000-0000-0000-000000000002",
        body_md: "",
      })
    );
    expect(r.ok).toBe(false);
  });
});

describe("deleteCommentAction", () => {
  it("rejects when not logged in", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const r = await deleteCommentAction(
      "00000000-0000-0000-0000-000000000002",
      "00000000-0000-0000-0000-000000000003"
    );
    expect(r.ok).toBe(false);
  });

  it("rejects non-uuid", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const r = await deleteCommentAction("nope", "also-nope");
    expect(r.ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests, verify failing**

```bash
npx vitest run lib/forum/actions.test.ts
```

Expected: FAIL (new exports don't exist).

- [ ] **Step 3: Add the four new actions**

Append to `lib/forum/actions.ts` (do NOT remove existing `createPostAction` or `createCommentAction`):

```ts
import { z } from "zod";
import {
  updatePostSchema,
  updateCommentSchema,
} from "./schemas";

const uuid = z.string().uuid();

export async function updatePostAction(formData: FormData): Promise<ActionResult> {
  const raw = {
    id: formData.get("id"),
    title: formData.get("title"),
    body_md: formData.get("body_md"),
    tags: formData.getAll("tags").map((t) => String(t)).filter((t) => t.length > 0),
  };
  const parsed = updatePostSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  // Read existing post (need pre-edit slugs and category for revalidation).
  const { data: existing, error: readErr } = await supabase
    .from("posts")
    .select("category, body_md")
    .eq("id", parsed.data.id)
    .single();
  if (readErr || !existing) return { ok: false, error: readErr?.message ?? "글을 찾을 수 없어요." };

  const { data: updated, error: updErr } = await supabase
    .from("posts")
    .update({
      title: parsed.data.title,
      body_md: parsed.data.body_md,
      tags: parsed.data.tags,
    })
    .eq("id", parsed.data.id)
    .select("id, category")
    .single();
  if (updErr || !updated) return { ok: false, error: updErr?.message ?? "수정에 실패했어요." };

  // Best-effort wiki ↔ Q&A resync. Compute union of pre/post slugs to revalidate.
  let slugsToRevalidate: string[] = [];
  try {
    const admin = createServiceClient();
    // Capture old slugs from qa_wiki_refs BEFORE we re-sync (sync deletes them).
    const { data: oldRefs } = await admin
      .from("qa_wiki_refs")
      .select("wiki_slug")
      .eq("post_id", parsed.data.id);
    const oldSlugs = (oldRefs ?? []).map((r: { wiki_slug: string }) => r.wiki_slug);
    const newSlugs = await syncWikiRefs(admin, parsed.data.id, parsed.data.body_md);
    slugsToRevalidate = Array.from(new Set([...oldSlugs, ...newSlugs]));
  } catch (e) {
    console.error("[wiki-qa sync failed on update]", e);
  }
  for (const slug of slugsToRevalidate) revalidatePath(`/wiki/${slug}`);

  revalidatePath(`/forum/post/${parsed.data.id}`);
  revalidatePath(`/forum/${updated.category}`);
  revalidatePath("/forum");
  return { ok: true };
}

export async function deletePostAction(id: string): Promise<ActionResult> {
  const idCheck = uuid.safeParse(id);
  if (!idCheck.success) return { ok: false, error: "잘못된 요청입니다." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  // Capture category + slugs before delete (cascade will remove qa_wiki_refs).
  const { data: post } = await supabase
    .from("posts")
    .select("category")
    .eq("id", id)
    .single();

  let slugs: string[] = [];
  try {
    const admin = createServiceClient();
    const { data: refs } = await admin
      .from("qa_wiki_refs")
      .select("wiki_slug")
      .eq("post_id", id);
    slugs = (refs ?? []).map((r: { wiki_slug: string }) => r.wiki_slug);
  } catch (e) {
    console.error("[wiki-qa pre-delete read failed]", e);
  }

  const { error } = await supabase.from("posts").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  for (const slug of slugs) revalidatePath(`/wiki/${slug}`);
  if (post?.category) revalidatePath(`/forum/${post.category}`);
  revalidatePath("/forum");
  return { ok: true };
}

export async function updateCommentAction(formData: FormData): Promise<ActionResult> {
  const raw = {
    id: formData.get("id"),
    body_md: formData.get("body_md"),
  };
  const parsed = updateCommentSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: updated, error } = await supabase
    .from("comments")
    .update({ body_md: parsed.data.body_md })
    .eq("id", parsed.data.id)
    .select("post_id")
    .single();
  if (error || !updated) return { ok: false, error: error?.message ?? "수정에 실패했어요." };

  revalidatePath(`/forum/post/${updated.post_id}`);
  return { ok: true };
}

export async function deleteCommentAction(
  id: string,
  postId: string
): Promise<ActionResult> {
  const ids = z.object({ id: uuid, postId: uuid }).safeParse({ id, postId });
  if (!ids.success) return { ok: false, error: "잘못된 요청입니다." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { error } = await supabase.from("comments").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/forum/post/${postId}`);
  return { ok: true };
}
```

- [ ] **Step 4: Run tests, verify passing**

```bash
npx vitest run lib/forum/actions.test.ts
```

Expected: 9 PASS.

- [ ] **Step 5: Run typecheck**

```bash
npm run typecheck
```

Expected: zero errors.

- [ ] **Step 6: Commit**

```bash
git add lib/forum/actions.ts lib/forum/actions.test.ts
git commit -m "feat(forum): add update/delete server actions for posts and comments"
```

---

## Task 5: Extract `PostFormFields` (refactor only)

Pure refactor so `EditPostForm` can reuse the same fields. No behavior change for `NewPostForm`.

**Files:**
- Create: `components/forum/PostFormFields.tsx`
- Modify: `components/forum/NewPostForm.tsx`

- [ ] **Step 1: Create `PostFormFields` with shared fields**

Create `components/forum/PostFormFields.tsx`:

```tsx
"use client";

import { TextInput } from "@/components/ui";
import { CATEGORY_LABELS, FORUM_CATEGORIES, type ForumCategory } from "@/lib/forum/types";

interface Props {
  defaultCategory: ForumCategory;
  defaultTitle?: string;
  defaultBody?: string;
  defaultTags?: string[];
  /** When true, the category select is disabled (edit mode). */
  lockedCategory?: boolean;
}

export function PostFormFields({
  defaultCategory,
  defaultTitle = "",
  defaultBody = "",
  defaultTags = [],
  lockedCategory = false,
}: Props) {
  const tagsCsv = defaultTags.join(", ");
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="category">카테고리</label>
        <select
          id="category"
          name="category"
          defaultValue={defaultCategory}
          disabled={lockedCategory}
          className="w-full rounded-[var(--r-md)] border border-[var(--hairline)] px-[var(--s-sm)] py-[var(--s-xs)] text-sm bg-[var(--canvas)] text-[var(--ink)] disabled:opacity-60"
        >
          {FORUM_CATEGORIES.map((c) => (
            <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="title">제목</label>
        <TextInput
          id="title"
          name="title"
          type="text"
          required
          maxLength={200}
          defaultValue={defaultTitle}
          className="w-full text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="body_md">본문</label>
        <textarea
          id="body_md"
          name="body_md"
          required
          rows={10}
          maxLength={20000}
          defaultValue={defaultBody}
          className="w-full font-mono text-sm bg-[var(--canvas)] text-[var(--ink)] border border-[var(--hairline)] rounded-[var(--r-md)] px-[var(--s-sm)] py-[var(--s-xs)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-from)] focus:border-transparent"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="tags-input">태그 (쉼표 구분)</label>
        <TextInput
          id="tags-input"
          type="text"
          placeholder="git, basics"
          defaultValue={tagsCsv}
          className="w-full text-sm"
          onChange={(e) => {
            const form = e.currentTarget.form;
            if (!form) return;
            form.querySelectorAll('input[name="tags"]').forEach((n) => n.remove());
            const parts = e.currentTarget.value
              .split(",")
              .map((s) => s.trim())
              .filter((s) => s.length > 0);
            for (const tag of parts) {
              const hi = document.createElement("input");
              hi.type = "hidden";
              hi.name = "tags";
              hi.value = tag;
              form.appendChild(hi);
            }
          }}
        />
        {defaultTags.map((t) => (
          <input key={t} type="hidden" name="tags" value={t} />
        ))}
      </div>
    </div>
  );
}
```

Note the trailing `defaultTags.map(...)` hidden inputs: when the page first renders (before any keystroke fires `onChange`), the form must already carry the initial tag list — otherwise saving with no tag-input edits would clear all tags. The `onChange` handler still removes-and-rewrites all `input[name="tags"]` on every keystroke; both branches converge to the same shape.

- [ ] **Step 2: Update `NewPostForm` to use `PostFormFields`**

Replace `components/forum/NewPostForm.tsx` body with:

```tsx
"use client";

import { useState, useTransition } from "react";
import { createPostAction } from "@/lib/forum/actions";
import { Pill, Card } from "@/components/ui";
import { PostFormFields } from "./PostFormFields";
import type { ForumCategory } from "@/lib/forum/types";

interface Props {
  defaultCategory?: ForumCategory;
}

export function NewPostForm({ defaultCategory = "qa" }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const result = await createPostAction(formData);
          if (!result.ok && result.error) setError(result.error);
        });
      }}
    >
      <Card className="space-y-4">
        <PostFormFields defaultCategory={defaultCategory} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Pill type="submit" variant="primary" size="sm" disabled={isPending} className="disabled:opacity-50">
          {isPending ? "올리는 중…" : "올리기"}
        </Pill>
      </Card>
    </form>
  );
}
```

- [ ] **Step 3: Run existing tests + typecheck**

```bash
npx vitest run
npm run typecheck
```

Expected: all PASS, zero errors.

- [ ] **Step 4: Smoke test in dev**

```bash
npm run dev
```

Open `http://localhost:3000/forum/new`, log in if needed, fill in a title/body/tags, submit. Verify the post appears in `/forum/qa`.

- [ ] **Step 5: Commit**

```bash
git add components/forum/PostFormFields.tsx components/forum/NewPostForm.tsx
git commit -m "refactor(forum): extract PostFormFields from NewPostForm"
```

---

## Task 6: `EditPostForm` component + `/forum/post/[id]/edit` route

**Files:**
- Create: `components/forum/EditPostForm.tsx`
- Create: `app/forum/post/[id]/edit/page.tsx`

- [ ] **Step 1: Create `EditPostForm`**

Create `components/forum/EditPostForm.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updatePostAction } from "@/lib/forum/actions";
import { Pill, Card } from "@/components/ui";
import { PostFormFields } from "./PostFormFields";
import type { ForumCategory } from "@/lib/forum/types";

interface Props {
  postId: string;
  category: ForumCategory;
  title: string;
  body: string;
  tags: string[];
}

export function EditPostForm({ postId, category, title, body, tags }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const result = await updatePostAction(formData);
          if (!result.ok && result.error) {
            setError(result.error);
            return;
          }
          router.push(`/forum/post/${postId}`);
          router.refresh();
        });
      }}
    >
      <input type="hidden" name="id" value={postId} />
      <Card className="space-y-4">
        <PostFormFields
          defaultCategory={category}
          defaultTitle={title}
          defaultBody={body}
          defaultTags={tags}
          lockedCategory
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <Pill type="submit" variant="primary" size="sm" disabled={isPending} className="disabled:opacity-50">
            {isPending ? "저장 중…" : "저장"}
          </Pill>
          <Pill href={`/forum/post/${postId}`} variant="secondary" size="sm">
            취소
          </Pill>
        </div>
      </Card>
    </form>
  );
}
```

- [ ] **Step 2: Create the edit route page**

Create `app/forum/post/[id]/edit/page.tsx`:

```tsx
// app/forum/post/[id]/edit/page.tsx — author-or-admin-only edit page.
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPost } from "@/lib/forum/queries";
import { AppShell } from "@/components/layout/AppShell";
import { Sidebar } from "@/components/layout/Sidebar";
import { SearchBox } from "@/components/wiki/SearchBox";
import { EditPostForm } from "@/components/forum/EditPostForm";
import { getAllPages } from "@/lib/wiki/page-loader";

export const metadata = { title: "글 수정 — VibeForge Forum" };

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const [post, userResult] = await Promise.all([
    getPost(supabase, id),
    supabase.auth.getUser(),
  ]);
  if (!post) notFound();
  const user = userResult.data.user;
  if (!user) notFound();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isAdmin = profile?.role === "admin";
  const isAuthor = post.author_id === user.id;
  if (!isAuthor && !isAdmin) notFound();

  const all = await getAllPages();
  const sidebarPages = all.map((p) => ({
    slug: p.slug,
    title: p.frontmatter.title,
    category: p.slug.split("/")[0],
  }));

  return (
    <AppShell
      headerSearch={<SearchBox />}
      sidebar={<Sidebar pages={sidebarPages} currentSlug={null} />}
      main={
        <div className="space-y-4">
          <header className="bg-[var(--canvas)] border border-[var(--hairline)] rounded-[var(--r-md)] p-6">
            <h1 className="text-2xl font-bold">글 수정</h1>
          </header>
          <EditPostForm
            postId={post.id}
            category={post.category}
            title={post.title}
            body={post.body_md}
            tags={post.tags}
          />
        </div>
      }
    />
  );
}
```

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

Expected: zero errors.

- [ ] **Step 4: Smoke test in dev**

```bash
npm run dev
```

1. Log in.
2. Visit a Q&A post you authored.
3. Append `/edit` to the URL: `http://localhost:3000/forum/post/<id>/edit`.
4. Edit the title and body, click 저장.
5. Verify redirect back to the post and the changes are visible.
6. Log out (or open an incognito tab) and visit the same `/edit` URL → should 404.

- [ ] **Step 5: Commit**

```bash
git add components/forum/EditPostForm.tsx app/forum/post/[id]/edit/page.tsx
git commit -m "feat(forum): add edit page route and EditPostForm"
```

---

## Task 7: `PostActions` button cluster + tests + integrate on post detail

**Files:**
- Create: `components/forum/PostActions.tsx`
- Create: `components/forum/PostActions.test.tsx`
- Modify: `app/forum/post/[id]/page.tsx`

- [ ] **Step 1: Write the failing test**

Create `components/forum/PostActions.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/forum/actions", () => ({
  deletePostAction: vi.fn(async () => ({ ok: true })),
}));

import { PostActions } from "./PostActions";

describe("PostActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when neither canEdit nor canDelete", () => {
    const { container } = render(
      <PostActions postId="p1" canEdit={false} canDelete={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("shows edit link when canEdit", () => {
    render(<PostActions postId="p1" canEdit canDelete={false} />);
    expect(screen.getByRole("link", { name: "수정" })).toHaveAttribute(
      "href",
      "/forum/post/p1/edit"
    );
    expect(screen.queryByRole("button", { name: "삭제" })).toBeNull();
  });

  it("shows delete button when canDelete", () => {
    render(<PostActions postId="p1" canEdit={false} canDelete />);
    expect(screen.getByRole("button", { name: "삭제" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "수정" })).toBeNull();
  });

  it("shows both when canEdit and canDelete", () => {
    render(<PostActions postId="p1" canEdit canDelete />);
    expect(screen.getByRole("link", { name: "수정" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "삭제" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test, verify failing**

```bash
npx vitest run components/forum/PostActions.test.tsx
```

Expected: FAIL (no `PostActions` module).

- [ ] **Step 3: Implement `PostActions`**

Create `components/forum/PostActions.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deletePostAction } from "@/lib/forum/actions";

interface Props {
  postId: string;
  canEdit: boolean;
  canDelete: boolean;
}

export function PostActions({ postId, canEdit, canDelete }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  if (!canEdit && !canDelete) return null;

  return (
    <div className="flex gap-2 text-sm">
      {canEdit && (
        <Link
          href={`/forum/post/${postId}/edit`}
          className="text-[var(--ink-muted)] hover:text-[var(--ink)] underline"
        >
          수정
        </Link>
      )}
      {canDelete && (
        <button
          type="button"
          disabled={isPending}
          className="text-[var(--ink-muted)] hover:text-red-600 underline disabled:opacity-50"
          onClick={() => {
            if (!window.confirm("정말 삭제하시겠어요? 댓글까지 함께 사라져요.")) return;
            startTransition(async () => {
              const r = await deletePostAction(postId);
              if (!r.ok) {
                window.alert(r.error ?? "삭제에 실패했어요.");
                return;
              }
              router.push("/forum");
              router.refresh();
            });
          }}
        >
          {isPending ? "삭제 중…" : "삭제"}
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test, verify passing**

```bash
npx vitest run components/forum/PostActions.test.tsx
```

Expected: 4 PASS.

- [ ] **Step 5: Wire `PostActions` into the post detail page**

Modify `app/forum/post/[id]/page.tsx`. Add the import and read role + render the component near the post header.

After the existing imports add:

```tsx
import { PostActions } from "@/components/forum/PostActions";
```

In the data-fetch block, after `userResult` is destructured, add a profile lookup. Replace the existing block:

```tsx
  const user = userResult.data.user;
  const sidebarPages = all.map((p) => ({
```

with:

```tsx
  const user = userResult.data.user;
  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    isAdmin = profile?.role === "admin";
  }
  const isAuthor = !!user && post.author_id === user.id;
  const canEdit = isAuthor || isAdmin;
  const canDelete = isAuthor || isAdmin;
  const sidebarPages = all.map((p) => ({
```

In the JSX, replace the existing post header block:

```tsx
            <div className="flex items-center gap-2 mb-3">
              <CategoryBadge category={post.category} />
              <span className="text-sm text-[var(--ink-muted)]">{authorName}</span>
              <span className="text-sm text-[var(--ink-muted)] ml-auto">
                {post.created_at.slice(0, 10)}
              </span>
            </div>
```

with:

```tsx
            <div className="flex items-center gap-2 mb-3">
              <CategoryBadge category={post.category} />
              <span className="text-sm text-[var(--ink-muted)]">{authorName}</span>
              <span className="text-sm text-[var(--ink-muted)] ml-auto">
                {post.created_at.slice(0, 10)}
              </span>
            </div>
            {(canEdit || canDelete) && (
              <div className="mb-3">
                <PostActions postId={post.id} canEdit={canEdit} canDelete={canDelete} />
              </div>
            )}
```

- [ ] **Step 6: Typecheck + smoke test**

```bash
npm run typecheck
npm run dev
```

Visit one of your own posts; you should see 수정/삭제 links. Visit someone else's; no buttons. Click 삭제 on a throwaway post and confirm — should redirect to `/forum` and the post should 404.

- [ ] **Step 7: Commit**

```bash
git add components/forum/PostActions.tsx components/forum/PostActions.test.tsx app/forum/post/[id]/page.tsx
git commit -m "feat(forum): show edit/delete actions on post detail for author or admin"
```

---

## Task 8: `CommentItem` with inline edit/delete + tests

**Files:**
- Create: `components/forum/CommentItem.tsx`
- Create: `components/forum/CommentItem.test.tsx`
- Modify: `app/forum/post/[id]/page.tsx` (swap inline `<li>` for `<CommentItem>`)

- [ ] **Step 1: Write the failing test**

Create `components/forum/CommentItem.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@/lib/forum/actions", () => ({
  updateCommentAction: vi.fn(async () => ({ ok: true })),
  deleteCommentAction: vi.fn(async () => ({ ok: true })),
}));

import { CommentItem } from "./CommentItem";

const baseComment = {
  id: "c1",
  postId: "p1",
  authorName: "Alice",
  bodyMd: "hello world",
  createdAt: "2026-05-04T00:00:00Z",
};

describe("CommentItem", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders body and author when not editable", () => {
    render(<CommentItem {...baseComment} canEdit={false} canDelete={false} />);
    expect(screen.getByText("hello world")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "수정" })).toBeNull();
    expect(screen.queryByRole("button", { name: "삭제" })).toBeNull();
  });

  it("shows edit and delete buttons when editable", () => {
    render(<CommentItem {...baseComment} canEdit canDelete />);
    expect(screen.getByRole("button", { name: "수정" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "삭제" })).toBeInTheDocument();
  });

  it("toggles to edit mode and back", () => {
    render(<CommentItem {...baseComment} canEdit canDelete={false} />);
    fireEvent.click(screen.getByRole("button", { name: "수정" }));
    expect(screen.getByRole("textbox")).toHaveValue("hello world");
    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    expect(screen.getByText("hello world")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test, verify failing**

```bash
npx vitest run components/forum/CommentItem.test.tsx
```

Expected: FAIL (no `CommentItem` module).

- [ ] **Step 3: Implement `CommentItem`**

Create `components/forum/CommentItem.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateCommentAction, deleteCommentAction } from "@/lib/forum/actions";

interface Props {
  id: string;
  postId: string;
  authorName: string;
  bodyMd: string;
  createdAt: string;
  canEdit: boolean;
  canDelete: boolean;
}

export function CommentItem({
  id,
  postId,
  authorName,
  bodyMd,
  createdAt,
  canEdit,
  canDelete,
}: Props) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(bodyMd);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <li className="border-t border-black/5 pt-3 first:border-0 first:pt-0">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm font-medium">{authorName}</span>
        <span className="text-xs text-[var(--ink-muted)]">{createdAt.slice(0, 10)}</span>
        {(canEdit || canDelete) && !isEditing && (
          <span className="ml-auto flex gap-2 text-xs">
            {canEdit && (
              <button
                type="button"
                className="text-[var(--ink-muted)] hover:text-[var(--ink)] underline"
                onClick={() => {
                  setError(null);
                  setDraft(bodyMd);
                  setIsEditing(true);
                }}
              >
                수정
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                disabled={isPending}
                className="text-[var(--ink-muted)] hover:text-red-600 underline disabled:opacity-50"
                onClick={() => {
                  if (!window.confirm("이 댓글을 삭제할까요?")) return;
                  startTransition(async () => {
                    const r = await deleteCommentAction(id, postId);
                    if (!r.ok) {
                      window.alert(r.error ?? "삭제에 실패했어요.");
                      return;
                    }
                    router.refresh();
                  });
                }}
              >
                삭제
              </button>
            )}
          </span>
        )}
      </div>
      {!isEditing ? (
        <p className="text-sm whitespace-pre-wrap">{bodyMd}</p>
      ) : (
        <form
          className="space-y-2"
          action={(formData) => {
            setError(null);
            startTransition(async () => {
              const r = await updateCommentAction(formData);
              if (!r.ok) {
                setError(r.error ?? "수정에 실패했어요.");
                return;
              }
              setIsEditing(false);
              router.refresh();
            });
          }}
        >
          <input type="hidden" name="id" value={id} />
          <textarea
            name="body_md"
            required
            rows={3}
            maxLength={5000}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full bg-[var(--canvas)] text-[var(--ink)] border border-[var(--hairline)] rounded-[var(--r-md)] px-[var(--s-sm)] py-[var(--s-xs)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-from)] focus:border-transparent text-sm"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="text-xs px-2 py-1 rounded-[var(--r-sm)] bg-[var(--brand-from)] text-white disabled:opacity-50"
            >
              {isPending ? "저장 중…" : "저장"}
            </button>
            <button
              type="button"
              className="text-xs px-2 py-1 rounded-[var(--r-sm)] border border-[var(--hairline)]"
              onClick={() => {
                setIsEditing(false);
                setError(null);
              }}
            >
              취소
            </button>
          </div>
        </form>
      )}
    </li>
  );
}
```

- [ ] **Step 4: Run test, verify passing**

```bash
npx vitest run components/forum/CommentItem.test.tsx
```

Expected: 3 PASS.

- [ ] **Step 5: Wire `CommentItem` into the post detail page**

In `app/forum/post/[id]/page.tsx`, add to imports:

```tsx
import { CommentItem } from "@/components/forum/CommentItem";
```

Replace the inline `<li>` block in the comments map. Find:

```tsx
              <ul className="space-y-3 mb-4">
                {comments.map((c) => {
                  const cAuthor = c.author?.display_name ?? c.author?.github_login ?? "익명";
                  return (
                    <li key={c.id} className="border-t border-black/5 pt-3 first:border-0 first:pt-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{cAuthor}</span>
                        <span className="text-xs text-[var(--ink-muted)]">{c.created_at.slice(0, 10)}</span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{c.body_md}</p>
                    </li>
                  );
                })}
              </ul>
```

Replace with:

```tsx
              <ul className="space-y-3 mb-4">
                {comments.map((c) => {
                  const cAuthor = c.author?.display_name ?? c.author?.github_login ?? "익명";
                  const cIsAuthor = !!user && c.author_id === user.id;
                  return (
                    <CommentItem
                      key={c.id}
                      id={c.id}
                      postId={post.id}
                      authorName={cAuthor}
                      bodyMd={c.body_md}
                      createdAt={c.created_at}
                      canEdit={cIsAuthor || isAdmin}
                      canDelete={cIsAuthor || isAdmin}
                    />
                  );
                })}
              </ul>
```

- [ ] **Step 6: Typecheck + smoke test**

```bash
npm run typecheck
npm run dev
```

Open a post you commented on. Click 수정 on your own comment, edit the text, click 저장 — comment should refresh with new text. Click 삭제, confirm — comment disappears.

- [ ] **Step 7: Commit**

```bash
git add components/forum/CommentItem.tsx components/forum/CommentItem.test.tsx app/forum/post/[id]/page.tsx
git commit -m "feat(forum): inline edit/delete on comments"
```

---

## Task 9: Admin server actions + tests

**Files:**
- Create: `lib/admin/actions.ts`
- Create: `lib/admin/actions.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/admin/actions.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const revalidatePath = vi.fn();
const requireAdmin = vi.fn();
const serviceUpdate = vi.fn();

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/lib/auth/require-admin", () => ({ requireAdmin }));
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(() => ({
    from: () => ({
      update: serviceUpdate,
    }),
  })),
}));

import { promoteUserAction, demoteUserAction } from "./actions";

beforeEach(() => {
  revalidatePath.mockReset();
  requireAdmin.mockReset();
  serviceUpdate.mockReset();
});

describe("promoteUserAction", () => {
  it("rejects non-uuid target", async () => {
    requireAdmin.mockResolvedValue({ id: "a1" });
    const r = await promoteUserAction("not-a-uuid");
    expect(r.ok).toBe(false);
  });

  it("propagates requireAdmin throw", async () => {
    requireAdmin.mockRejectedValue(new Error("NEXT_NOT_FOUND"));
    await expect(
      promoteUserAction("00000000-0000-0000-0000-000000000001")
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("calls service-role update on success", async () => {
    requireAdmin.mockResolvedValue({ id: "a1" });
    serviceUpdate.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
    const r = await promoteUserAction("00000000-0000-0000-0000-000000000001");
    expect(r.ok).toBe(true);
    expect(serviceUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ role: "admin", promoted_by: "a1" })
    );
    expect(revalidatePath).toHaveBeenCalledWith("/admin");
  });

  it("returns error when supabase fails", async () => {
    requireAdmin.mockResolvedValue({ id: "a1" });
    serviceUpdate.mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: { message: "boom" } }),
    });
    const r = await promoteUserAction("00000000-0000-0000-0000-000000000001");
    expect(r.ok).toBe(false);
    expect(r.error).toContain("권한 변경");
  });
});

describe("demoteUserAction", () => {
  it("blocks self-demote", async () => {
    requireAdmin.mockResolvedValue({ id: "a1" });
    const r = await demoteUserAction("a1");
    expect(r.ok).toBe(false);
    expect(r.error).toContain("본인");
  });

  it("calls service-role update on success", async () => {
    requireAdmin.mockResolvedValue({ id: "a1" });
    serviceUpdate.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
    const r = await demoteUserAction("00000000-0000-0000-0000-000000000002");
    expect(r.ok).toBe(true);
    expect(serviceUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ role: "user", promoted_at: null, promoted_by: null })
    );
  });
});
```

Note: the `demoteUserAction` self-demote test passes `"a1"` (not a UUID) as target. The action's self-check fires before UUID validation in our implementation; if the order is reversed, swap to use a valid UUID for `targetId` AND for `requireAdmin`'s mocked id.

- [ ] **Step 2: Run test, verify failing**

```bash
npx vitest run lib/admin/actions.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement the actions**

Create `lib/admin/actions.ts`:

```ts
// lib/admin/actions.ts — server actions for promoting/demoting admins.
// Defense-in-depth: requireAdmin() runs before reaching for service-role.
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServiceClient } from "@/lib/supabase/service";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

const uuid = z.string().uuid();

export async function promoteUserAction(targetId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!uuid.safeParse(targetId).success) {
    return { ok: false, error: "잘못된 요청입니다." };
  }
  const service = createServiceClient();
  const { error } = await service
    .from("profiles")
    .update({ role: "admin", promoted_at: new Date().toISOString(), promoted_by: admin.id })
    .eq("id", targetId);
  if (error) return { ok: false, error: `권한 변경에 실패했어요: ${error.message}` };
  revalidatePath("/admin");
  return { ok: true };
}

export async function demoteUserAction(targetId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (targetId === admin.id) {
    return { ok: false, error: "본인은 강등할 수 없어요." };
  }
  if (!uuid.safeParse(targetId).success) {
    return { ok: false, error: "잘못된 요청입니다." };
  }
  const service = createServiceClient();
  const { error } = await service
    .from("profiles")
    .update({ role: "user", promoted_at: null, promoted_by: null })
    .eq("id", targetId);
  if (error) return { ok: false, error: `권한 변경에 실패했어요: ${error.message}` };
  revalidatePath("/admin");
  return { ok: true };
}
```

- [ ] **Step 4: Run test, verify passing**

```bash
npx vitest run lib/admin/actions.test.ts
```

Expected: 6 PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/admin/actions.ts lib/admin/actions.test.ts
git commit -m "feat(admin): add promoteUserAction and demoteUserAction"
```

---

## Task 10: Admin queries (list profiles for the table)

**Files:**
- Create: `lib/admin/queries.ts`

- [ ] **Step 1: Implement the query**

Create `lib/admin/queries.ts`:

```ts
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
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add lib/admin/queries.ts
git commit -m "feat(admin): add listAdminProfiles query"
```

---

## Task 11: `AdminTable` component + `/admin` page

**Files:**
- Create: `components/admin/AdminTable.tsx`
- Create: `app/admin/page.tsx`

- [ ] **Step 1: Create the table component**

Create `components/admin/AdminTable.tsx`:

```tsx
"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { promoteUserAction, demoteUserAction } from "@/lib/admin/actions";
import type { AdminProfileRow } from "@/lib/admin/queries";

interface Props {
  rows: AdminProfileRow[];
  currentAdminId: string;
}

export function AdminTable({ rows, currentAdminId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleAction(targetId: string, kind: "promote" | "demote") {
    startTransition(async () => {
      const r =
        kind === "promote"
          ? await promoteUserAction(targetId)
          : await demoteUserAction(targetId);
      if (!r.ok) {
        window.alert(r.error ?? "변경에 실패했어요.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[var(--ink-muted)] border-b border-[var(--hairline)]">
            <th className="py-2 pr-4">GitHub</th>
            <th className="py-2 pr-4">표시 이름</th>
            <th className="py-2 pr-4">역할</th>
            <th className="py-2 pr-4">승격 시각</th>
            <th className="py-2 pr-4">동작</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const isSelf = r.id === currentAdminId;
            const isAdmin = r.role === "admin";
            return (
              <tr key={r.id} className="border-b border-black/5">
                <td className="py-2 pr-4">{r.github_login ? `@${r.github_login}` : "—"}</td>
                <td className="py-2 pr-4">{r.display_name ?? "—"}</td>
                <td className="py-2 pr-4">
                  <span
                    className={
                      isAdmin
                        ? "inline-block px-2 py-0.5 rounded-[var(--r-sm)] bg-[var(--accent-cta)] text-white text-xs"
                        : "text-[var(--ink-muted)] text-xs"
                    }
                  >
                    {r.role}
                  </span>
                </td>
                <td className="py-2 pr-4 text-xs text-[var(--ink-muted)]">
                  {r.promoted_at ? r.promoted_at.slice(0, 10) : "—"}
                </td>
                <td className="py-2 pr-4">
                  <button
                    type="button"
                    disabled={isPending || (isAdmin && isSelf)}
                    onClick={() => handleAction(r.id, isAdmin ? "demote" : "promote")}
                    className="text-xs px-2 py-1 rounded-[var(--r-sm)] border border-[var(--hairline)] hover:bg-[var(--canvas-soft,rgba(0,0,0,0.03))] disabled:opacity-40"
                  >
                    {isAdmin ? (isSelf ? "본인" : "강등") : "승격"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Create the `/admin` page**

Create `app/admin/page.tsx`:

```tsx
// app/admin/page.tsx — admin-only profile management.
// Non-admins (anon or user) get notFound() so the route does not advertise itself.
import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";
import { listAdminProfiles } from "@/lib/admin/queries";
import { AppShell } from "@/components/layout/AppShell";
import { Sidebar } from "@/components/layout/Sidebar";
import { SearchBox } from "@/components/wiki/SearchBox";
import { AdminTable } from "@/components/admin/AdminTable";
import { getAllPages } from "@/lib/wiki/page-loader";

export const metadata = { title: "Admin — VibeForge" };

export default async function AdminPage() {
  const adminUser = await requireAdmin();
  const supabase = await createClient();
  const [rows, all] = await Promise.all([
    listAdminProfiles(supabase),
    getAllPages(),
  ]);
  const sidebarPages = all.map((p) => ({
    slug: p.slug,
    title: p.frontmatter.title,
    category: p.slug.split("/")[0],
  }));

  return (
    <AppShell
      headerSearch={<SearchBox />}
      sidebar={<Sidebar pages={sidebarPages} currentSlug={null} />}
      main={
        <div className="space-y-4">
          <header className="bg-[var(--canvas)] border border-[var(--hairline)] rounded-[var(--r-md)] p-6">
            <h1 className="text-2xl font-bold">관리자</h1>
            <p className="text-sm text-[var(--ink-muted)] mt-2">
              사용자 권한을 관리합니다. 본인은 강등할 수 없어요.
            </p>
          </header>
          <section className="bg-[var(--canvas)] border border-[var(--hairline)] rounded-[var(--r-md)] p-6">
            <AdminTable rows={rows} currentAdminId={adminUser.id} />
          </section>
        </div>
      }
    />
  );
}
```

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

Expected: zero errors.

- [ ] **Step 4: Manual smoke test**

Bootstrap: in Supabase Studio against the dev project, run:

```sql
update public.profiles set role = 'admin' where github_login = '<your-github-login>';
```

Then:

```bash
npm run dev
```

1. While logged out, visit `http://localhost:3000/admin` → 404.
2. Log in as a non-admin → visit `/admin` → 404.
3. Log in as the bootstrapped admin → visit `/admin` → table appears.
4. Click 승격 on another row → row updates to admin badge.
5. Click 강등 on that row → row reverts.
6. Try 강등 on your own row → button is disabled and shows "본인".

- [ ] **Step 5: Commit**

```bash
git add components/admin/AdminTable.tsx app/admin/page.tsx
git commit -m "feat(admin): add /admin page with promote/demote table"
```

---

## Task 12: Admin link in `SiteHeader`

**Files:**
- Modify: `components/layout/SiteHeader.tsx`

The current `SiteHeader` is a synchronous server component. To conditionally show "Admin", it needs to fetch the current user's role.

- [ ] **Step 1: Make `SiteHeader` async and conditionally render the link**

Replace the body of `components/layout/SiteHeader.tsx` with:

```tsx
// components/layout/SiteHeader.tsx
import Link from "next/link";
import type { Route } from "next";
import { AuthButton } from "./AuthButton";
import { Card } from "@/components/ui";
import { Wordmark } from "@/components/brand/Wordmark";
import { createClient } from "@/lib/supabase/server";

interface Props { searchSlot?: React.ReactNode; }

async function getIsAdmin(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    return profile?.role === "admin";
  } catch {
    return false;
  }
}

export async function SiteHeader({ searchSlot }: Props) {
  const isAdmin = await getIsAdmin();
  return (
    <Card className="px-6 md:px-8 py-3 md:py-4 flex items-center gap-5 md:gap-7">
      <div className="flex items-center gap-3">
        <Link
          href="/"
          aria-label="VibeForge"
          className="text-[var(--ink)] hover:opacity-90 transition-opacity"
        >
          <Wordmark size="header" />
        </Link>
        <span
          aria-hidden="true"
          className="hidden lg:inline font-mono uppercase text-[12px] tracking-[0.22em] text-[var(--ink-muted)]"
        >
          CS · 위키 · 포럼
        </span>
      </div>

      <span
        aria-hidden="true"
        className="hidden md:block h-6 w-px bg-[var(--hairline)]"
      />

      <nav
        aria-label="Primary"
        className="flex gap-5 text-[15px] text-[var(--ink-muted)]"
      >
        <Link href="/wiki" className="hover:text-[var(--ink)] transition-colors">
          Wiki
        </Link>
        <Link
          href={"/forum" as Route}
          className="hover:text-[var(--ink)] transition-colors"
        >
          Forum
        </Link>
        <Link
          href={"/about" as Route}
          className="hover:text-[var(--ink)] transition-colors"
        >
          About
        </Link>
        {isAdmin && (
          <Link
            href={"/admin" as Route}
            className="hover:text-[var(--ink)] transition-colors"
          >
            Admin
          </Link>
        )}
      </nav>

      {searchSlot && <div className="flex-1 max-w-md">{searchSlot}</div>}
      <div className={searchSlot ? "" : "ml-auto"}>
        <AuthButton />
      </div>
    </Card>
  );
}
```

- [ ] **Step 2: Verify all callers handle the async component**

Search for `SiteHeader` usages (use any tool that searches text — ripgrep, your editor's search, etc.):

```
search pattern: <SiteHeader
file glob: **/*.tsx
```

In React Server Components, `<SiteHeader />` rendered from another async component "just works" — Next.js awaits the rendered tree. The change is binary-compatible with existing call sites; no caller updates needed. If any caller is a client component (`"use client"` at the top), that file would now type-error — at the time of writing, all `SiteHeader` usages are in server components or layouts.

- [ ] **Step 3: Run all unit tests + typecheck**

```bash
npx vitest run
npm run typecheck
```

Expected: PASS / zero errors.

- [ ] **Step 4: Smoke test**

```bash
npm run dev
```

- Logged out: header shows Wiki / Forum / About only.
- Logged in as user: same.
- Logged in as admin: Admin link appears as the fourth nav item.

- [ ] **Step 5: Commit**

```bash
git add components/layout/SiteHeader.tsx
git commit -m "feat(layout): show Admin nav link to admins"
```

---

## Task 13: `/admin` guard e2e test

**Files:**
- Create: `tests/e2e/admin-guard.spec.ts`

This test verifies the simplest gating path: anonymous visitors get 404. The authenticated admin path requires a logged-in Playwright session, which this repo's e2e harness does not currently set up (existing specs in `tests/e2e/` are all anonymous read-only checks). Authenticated flows for both `/admin` and forum edit/delete are covered by:

- Unit tests on `requireAdmin` (Task 2) for the gating logic
- Unit tests on the four forum actions (Task 4) for validation/auth-rejection paths
- Unit tests on the admin actions (Task 9) for the service-role path and self-demote block
- RTL tests on `PostActions` (Task 7) and `CommentItem` (Task 8) for UI gating
- Manual smoke steps in Task 6, Task 7, Task 8, Task 11 for end-to-end happy-path verification

Adding a logged-in Playwright fixture would be a separate, larger piece of work (set up a test Supabase project, seed users with bypass-OAuth tokens or storage-state cookies). Out of scope for this plan; flagged for a future testing-infrastructure task.

- [ ] **Step 1: Write the e2e test**

Create `tests/e2e/admin-guard.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test.describe("admin guard", () => {
  test("/admin returns 404 to anonymous visitors", async ({ page }) => {
    const resp = await page.goto("/admin");
    expect(resp?.status()).toBe(404);
  });

  test("/admin does not appear in the public nav for anonymous visitors", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Admin" })).toHaveCount(0);
  });
});
```

- [ ] **Step 2: Run the e2e test**

```bash
npx playwright test tests/e2e/admin-guard.spec.ts
```

Expected: 2 PASS.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/admin-guard.spec.ts
git commit -m "test(e2e): admin guard hides /admin from anon visitors"
```

---

## Task 14: Wiki clone section in About + optional `/wiki` Pill + e2e

**Files:**
- Modify: `site-pages/about.md`
- Modify: `app/wiki/page.tsx`
- Create: `tests/e2e/about-wiki-clone.spec.ts`

- [ ] **Step 1: Append the wiki clone section to About**

Open `site-pages/about.md` and append the following markdown after the existing "## 기여" section:

```markdown

## 위키 로컬로 가져오기

이 위키의 모든 마크다운 파일은 별도 GitHub 저장소에 있어서, 그대로 받아 LLM에 통째로 넣거나 오프라인에서 보기에 좋아요.

​```bash
git clone https://github.com/Yeounil/vibeforge-wiki.git
​```

저장소: <https://github.com/Yeounil/vibeforge-wiki>

받은 후 `data/` 폴더 아래에 카테고리별 `.md` 파일이 들어있어요. 위키 사이트와 동일한 내용이며, 라이선스를 지키는 한 자유롭게 활용·수정해도 좋아요.
```

(Note: the two `​```bash` lines above use a leading zero-width space to escape the inner code fence inside this plan document. When you actually edit `site-pages/about.md`, write a regular `\`\`\`bash` fence — no zero-width space.)

- [ ] **Step 2: Verify the heading slug at runtime**

Start the dev server:

```bash
npm run dev
```

Visit `http://localhost:3000/about`. Open DevTools and inspect the rendered `## 위키 로컬로 가져오기` heading element. Note its `id` attribute — `rehype-slug` (via `github-slugger`) preserves Unicode and produces something like `위키-로컬로-가져오기`. Record this value for the next step.

- [ ] **Step 3: Add an optional Pill on the wiki index pointing to that anchor**

Open `app/wiki/page.tsx` and locate the Pills already rendered (search for `Pill` imports + usages). Add a new Pill alongside them:

```tsx
<Pill href={"/about#위키-로컬로-가져오기" as Route} variant="secondary">
  위키 다운로드
</Pill>
```

Replace the `위키-로컬로-가져오기` portion of the href with the actual id observed in Step 2. If the existing Pills in `app/wiki/page.tsx` don't use `Route` casts, drop the cast. The exact placement should mirror the existing nearby pills — keep them grouped in the same flex container.

- [ ] **Step 4: Write the e2e test**

Create `tests/e2e/about-wiki-clone.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test.describe("about wiki clone", () => {
  test("about page shows the git clone command and repo link", async ({ page }) => {
    await page.goto("/about");
    await expect(page.getByRole("heading", { name: "위키 로컬로 가져오기" })).toBeVisible();
    await expect(page.getByText("git clone https://github.com/Yeounil/vibeforge-wiki.git")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "https://github.com/Yeounil/vibeforge-wiki" })
    ).toBeVisible();
  });

  test("wiki index has a 위키 다운로드 link to the about anchor", async ({ page }) => {
    await page.goto("/wiki");
    const link = page.getByRole("link", { name: "위키 다운로드" });
    await expect(link).toBeVisible();
    const href = await link.getAttribute("href");
    expect(href).toMatch(/^\/about#/);
  });
});
```

- [ ] **Step 5: Run the e2e test**

```bash
npx playwright test tests/e2e/about-wiki-clone.spec.ts
```

Expected: 2 PASS.

- [ ] **Step 6: Commit**

```bash
git add site-pages/about.md app/wiki/page.tsx tests/e2e/about-wiki-clone.spec.ts
git commit -m "feat(about): add wiki clone instructions and discovery Pill"
```

---

## Task 15: Update README and CLAUDE.md

**Files:**
- Modify: `README.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add an admin paragraph to README**

Open `README.md`. Add a new section near the existing "Environment" or "Setup" area (whatever fits the existing structure):

```markdown
## Admin promotion

The first admin must be minted manually in Supabase Studio (the SQL editor against your project) — once, with:

\`\`\`sql
update public.profiles set role = 'admin' where github_login = '<your-github-login>';
\`\`\`

After that, all admin promotion/demotion happens at `/admin` in-app. Non-admins (including anonymous visitors) are 404'd from that route — it does not appear in the public nav.

The `role` column is locked from `authenticated` GRANTs (see `supabase/migrations/0004_lock_role_column.sql`), so no client can self-promote even by crafting a raw Supabase request.
```

(Use real backticks in the actual file — the escaped backticks above are because this plan is itself markdown.)

- [ ] **Step 2: Add a one-line route note to CLAUDE.md**

Open `CLAUDE.md`. Find the "### Routes" section and add `/admin` to the list:

```
- `/admin` — admin-only profile/role management; non-admins 404
```

Place it after `/about` and before `/auth/callback`.

- [ ] **Step 3: Run check:content to ensure no markdown was broken**

```bash
npm run check:content
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add README.md CLAUDE.md
git commit -m "docs: document /admin route and first-admin bootstrap"
```

---

## Final verification

- [ ] **Step 1: Full test suite**

```bash
npx vitest run
npm run typecheck
npm run lint
```

All three must be clean.

- [ ] **Step 2: Full e2e suite**

```bash
npm run test:e2e
```

All specs must pass.

- [ ] **Step 3: Manual end-to-end pass against dev server**

Run `npm run dev` and verify:

1. Anonymous user can read posts but sees no edit/delete buttons.
2. Logged-in non-author sees no edit/delete on someone else's post.
3. Author sees edit/delete on own post and own comment.
4. Author can edit a post and the body, title, tags update; if the post was Q&A and the body changed wiki refs, `/wiki/<affected>` shows updated Related Q&A on next visit.
5. Author can delete a post → redirect to `/forum` → post URL 404s → comments disappeared.
6. Anonymous visitor to `/admin` → 404.
7. Logged-in non-admin visitor to `/admin` → 404, and Admin link is absent from header.
8. Admin sees Admin link in header, can visit `/admin`, sees the table, can promote a user (badge changes), can demote (badge reverts), cannot demote self.
9. `/about` shows the wiki clone section with `git clone https://github.com/Yeounil/vibeforge-wiki.git` snippet and a clickable repo link.
10. `/wiki` has a "위키 다운로드" Pill that scrolls to the wiki clone section in About.
