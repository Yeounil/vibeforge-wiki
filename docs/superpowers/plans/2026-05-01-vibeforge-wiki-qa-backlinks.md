# VibeForge Plan 4 — Wiki ↔ Q&A 양방향 백링크 (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Q&A 글 본문이 인용한 wiki 페이지와, wiki 페이지를 인용한 Q&A 글들을 양쪽 페이지 RightPanel에 surface한다. Server Action이 작성 시점에 `qa_wiki_refs`에 sync한다.

**Architecture:** 새 `lib/wiki-qa/` 모듈에 (1) 순수 추출기 `extract.ts`, (2) service-role write 함수 `sync.ts`, (3) read 쿼리 `queries.ts` 분리. `createPostAction`은 post insert 후 best-effort sync. wiki 페이지 RightPanel에 `<RelatedQA>`, Q&A 페이지에 `<RelatedWiki>` 추가.

**Tech Stack:** Next.js 15 App Router, React 19 Server Components, Supabase (anon + service-role), Vitest, Playwright. 기존 `buildAliasMap` (`lib/wiki/backlinks.ts`)와 `WIKI_LINK_RE` regex 재사용.

**Spec:** `docs/superpowers/specs/2026-05-01-vibeforge-wiki-qa-backlinks-design.md`

**Branch:** continue on `plan3/supabase-forum` (final commit will be tagged `plan4-wiki-qa-backlinks`).

---

## File Map

**Created:**
- `lib/supabase/service.ts` — `createServiceClient()` (uses `SUPABASE_SERVICE_ROLE_KEY`)
- `lib/wiki-qa/extract.ts` — `extractWikiRefs(body, aliasMap)` pure
- `lib/wiki-qa/extract.test.ts` — extractor unit tests
- `lib/wiki-qa/sync.ts` — `syncWikiRefs(admin, postId, body)`
- `lib/wiki-qa/sync.test.ts` — sync unit tests with stubbed admin
- `lib/wiki-qa/queries.ts` — `listPostsByWikiSlug`, `listWikiRefsByPost`
- `lib/wiki-qa/queries.test.ts` — query unit tests with stubbed client
- `components/wiki/RelatedQA.tsx`
- `components/forum/RelatedWiki.tsx`
- `tests/e2e/wiki-qa-backlinks.spec.ts` — fixture-based read-only e2e

**Modified:**
- `lib/wiki/page-loader.ts` — add `export async function getAliasMap()`
- `lib/forum/actions.ts` — `createPostAction` calls `syncWikiRefs` + revalidate
- `app/wiki/[...slug]/page.tsx` — add `<RelatedQA>` to RightPanel + `export const revalidate = 60`
- `app/forum/post/[id]/page.tsx` — add `right={<RightPanel><RelatedWiki/></RightPanel>}` (or null when empty)

---

## Task 1: Service-role Supabase client

**Files:**
- Create: `lib/supabase/service.ts`

- [ ] **Step 1: Implement `createServiceClient()`**

```ts
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
```

> Note: `getServerEnv()` already throws if `SUPABASE_SERVICE_ROLE_KEY` is missing — no extra validation needed here.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: passes (no new errors).

- [ ] **Step 3: Commit**

```bash
git add lib/supabase/service.ts
git commit -m "feat(supabase): service-role client for RLS-bypass writes"
```

---

## Task 2: Pure wiki-ref extractor — tests first

**Files:**
- Create: `lib/wiki-qa/extract.test.ts`
- Create: `lib/wiki-qa/extract.ts` (placeholder for now to make import resolvable)

- [ ] **Step 1: Write the failing tests**

```ts
// lib/wiki-qa/extract.test.ts
import { describe, it, expect } from "vitest";
import { extractWikiRefs } from "./extract";

// Minimal alias map — covers slug, title, alias forms.
const aliasMap = new Map<string, string>([
  ["data-handling/what-is-an-index", "data-handling/what-is-an-index"],
  ["what-is-an-index", "data-handling/what-is-an-index"],
  ["인덱스란", "data-handling/what-is-an-index"],
  ["code-flow/async", "code-flow/async"],
  ["async", "code-flow/async"],
]);

describe("extractWikiRefs", () => {
  it("returns empty array for empty body", () => {
    expect(extractWikiRefs("", aliasMap)).toEqual([]);
  });

  it("extracts /wiki/<slug> from markdown link target", () => {
    const body = "참고: [인덱스 글](/wiki/data-handling/what-is-an-index) 보세요.";
    expect(extractWikiRefs(body, aliasMap)).toEqual([
      "data-handling/what-is-an-index",
    ]);
  });

  it("extracts /wiki/<slug> from bare URL", () => {
    const body = "더 보기: /wiki/code-flow/async";
    expect(extractWikiRefs(body, aliasMap)).toEqual(["code-flow/async"]);
  });

  it("extracts [[Page Name]] wikilink", () => {
    const body = "[[What Is An Index]]를 먼저 보세요.";
    // The buildAliasMap pattern lowercases keys; "what is an index" isn't in
    // our minimal map. Use the slug-leaf form instead.
    const body2 = "[[what-is-an-index]] 보세요.";
    expect(extractWikiRefs(body2, aliasMap)).toEqual([
      "data-handling/what-is-an-index",
    ]);
  });

  it("extracts [[Target|Display]] wikilink (uses target, not display)", () => {
    const body = "[[async|비동기]]에 대해 ...";
    expect(extractWikiRefs(body, aliasMap)).toEqual(["code-flow/async"]);
  });

  it("resolves alias forms via aliasMap", () => {
    const body = "[[인덱스란]]은 ...";
    expect(extractWikiRefs(body, aliasMap)).toEqual([
      "data-handling/what-is-an-index",
    ]);
  });

  it("drops unresolved /wiki/ paths", () => {
    const body = "broken: /wiki/non/existent and good: /wiki/code-flow/async";
    expect(extractWikiRefs(body, aliasMap)).toEqual(["code-flow/async"]);
  });

  it("drops unresolved [[wikilinks]]", () => {
    const body = "[[Unknown Page]] vs [[async]]";
    expect(extractWikiRefs(body, aliasMap)).toEqual(["code-flow/async"]);
  });

  it("dedupes same slug appearing multiple times across both formats", () => {
    const body =
      "[[async]] / /wiki/code-flow/async / [[async|aka 비동기]]";
    expect(extractWikiRefs(body, aliasMap)).toEqual(["code-flow/async"]);
  });

  it("returns deterministic sorted output", () => {
    const body = "/wiki/code-flow/async /wiki/data-handling/what-is-an-index";
    const result = extractWikiRefs(body, aliasMap);
    expect(result).toEqual([
      "code-flow/async",
      "data-handling/what-is-an-index",
    ]);
  });

  it("handles markdown link target stripped of trailing punctuation", () => {
    const body = "see [foo](/wiki/code-flow/async).";
    expect(extractWikiRefs(body, aliasMap)).toEqual(["code-flow/async"]);
  });
});
```

- [ ] **Step 2: Stub the module so the test file compiles**

```ts
// lib/wiki-qa/extract.ts
export function extractWikiRefs(_body: string, _aliasMap: Map<string, string>): string[] {
  throw new Error("not implemented");
}
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm run test -- lib/wiki-qa/extract.test`
Expected: FAIL — `not implemented` (or similar).

- [ ] **Step 4: Implement the extractor**

```ts
// lib/wiki-qa/extract.ts — pure: extract wiki slugs from Q&A body markdown.
// Two recognized forms:
//   1. /wiki/<path>  (absolute URL paths, both as markdown link targets and bare)
//   2. [[Page Name]] / [[Page Name|display]]  (wikilink syntax — alias-resolved)
// The aliasMap is the same buildAliasMap output used by lib/wiki/backlinks.ts:
// keys are lowercased, values are canonical slugs.

// Stops at whitespace, ), ], ", ', >, or end of string. Captures path chars
// (word chars, slashes, hyphens). Non-greedy so trailing punctuation in
// markdown like ").“ doesn't get sucked in.
const WIKI_PATH_RE = /\B\/wiki\/([\w/-]+?)(?=[\s)\]"'>.,!?]|$)/g;

// Matches lib/wiki/backlinks.ts:WIKI_LINK_RE and lib/wiki/wiki-link.ts:WIKI_LINK_RE.
const WIKI_LINK_RE = /(?<!\[)\[\[([^\[\]|]+?)(?:\|[^\[\]]+?)?\]\](?!\])/g;

export function extractWikiRefs(
  body: string,
  aliasMap: Map<string, string>
): string[] {
  const found = new Set<string>();

  for (const m of body.matchAll(WIKI_PATH_RE)) {
    const raw = m[1].trim().replace(/\/+$/, ""); // trailing slash off
    if (!raw) continue;
    const resolved = aliasMap.get(raw.toLowerCase());
    if (resolved) found.add(resolved);
  }

  for (const m of body.matchAll(WIKI_LINK_RE)) {
    const target = m[1].trim();
    if (!target) continue;
    const resolved = aliasMap.get(target.toLowerCase());
    if (resolved) found.add(resolved);
  }

  return Array.from(found).sort();
}
```

- [ ] **Step 5: Run tests, verify pass**

Run: `npm run test -- lib/wiki-qa/extract.test`
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add lib/wiki-qa/extract.ts lib/wiki-qa/extract.test.ts
git commit -m "feat(wiki-qa): pure wiki-ref extractor with tests"
```

---

## Task 3: Export `getAliasMap` from page-loader

**Files:**
- Modify: `lib/wiki/page-loader.ts`

- [ ] **Step 1: Add export**

Append to `lib/wiki/page-loader.ts`:

```ts
export async function getAliasMap(): Promise<Map<string, string>> {
  const { aliasMap } = await ensureCache();
  return aliasMap;
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add lib/wiki/page-loader.ts
git commit -m "feat(wiki): export getAliasMap from page-loader for cross-module use"
```

---

## Task 4: Sync module — tests first

**Files:**
- Create: `lib/wiki-qa/sync.test.ts`
- Create: `lib/wiki-qa/sync.ts`

The sync module performs delete-then-insert under service-role. We stub the
admin client (same chainable pattern as `lib/forum/queries.test.ts`) so the
test runs without DB.

- [ ] **Step 1: Write the failing tests**

```ts
// lib/wiki-qa/sync.test.ts
import { describe, it, expect, vi } from "vitest";
import { syncWikiRefs } from "./sync";

// Hoisted mock for getAliasMap
vi.mock("@/lib/wiki/page-loader", () => ({
  getAliasMap: vi.fn(async () =>
    new Map([
      ["code-flow/async", "code-flow/async"],
      ["async", "code-flow/async"],
    ])
  ),
}));

interface Recorded {
  table: string;
  op: "delete" | "insert";
  filter?: { col: string; val: unknown };
  rows?: unknown[];
}

function makeAdmin() {
  const recorded: Recorded[] = [];
  const fromImpl = (table: string) => {
    return {
      delete() {
        const filter: Recorded["filter"] = undefined;
        const rec: Recorded = { table, op: "delete", filter };
        return {
          eq(col: string, val: unknown) {
            rec.filter = { col, val };
            recorded.push(rec);
            return Promise.resolve({ error: null });
          },
        };
      },
      insert(rows: unknown[]) {
        recorded.push({ table, op: "insert", rows });
        return Promise.resolve({ error: null });
      },
    };
  };
  const admin = { from: fromImpl } as unknown as Parameters<typeof syncWikiRefs>[0];
  return { admin, recorded };
}

describe("syncWikiRefs", () => {
  it("deletes existing refs for the post even when extracted is empty", async () => {
    const { admin, recorded } = makeAdmin();
    const slugs = await syncWikiRefs(admin, "post-1", "no wiki link here");
    expect(slugs).toEqual([]);
    expect(recorded).toEqual([
      { table: "qa_wiki_refs", op: "delete", filter: { col: "post_id", val: "post-1" } },
    ]);
  });

  it("inserts extracted slugs after deleting", async () => {
    const { admin, recorded } = makeAdmin();
    const slugs = await syncWikiRefs(admin, "post-2", "see [[async]] and /wiki/code-flow/async");
    expect(slugs).toEqual(["code-flow/async"]);
    expect(recorded).toHaveLength(2);
    expect(recorded[0]).toEqual({
      table: "qa_wiki_refs",
      op: "delete",
      filter: { col: "post_id", val: "post-2" },
    });
    expect(recorded[1]).toEqual({
      table: "qa_wiki_refs",
      op: "insert",
      rows: [{ post_id: "post-2", wiki_slug: "code-flow/async" }],
    });
  });

  it("returns extracted slug list (so caller can revalidatePath)", async () => {
    const { admin } = makeAdmin();
    const slugs = await syncWikiRefs(admin, "post-3", "[[async]]");
    expect(slugs).toEqual(["code-flow/async"]);
  });
});
```

- [ ] **Step 2: Stub `sync.ts` so the test file compiles**

```ts
// lib/wiki-qa/sync.ts
import type { SupabaseClient } from "@supabase/supabase-js";

export async function syncWikiRefs(
  _admin: SupabaseClient,
  _postId: string,
  _body: string
): Promise<string[]> {
  throw new Error("not implemented");
}
```

- [ ] **Step 3: Run tests, verify they fail**

Run: `npm run test -- lib/wiki-qa/sync.test`
Expected: FAIL.

- [ ] **Step 4: Implement sync**

```ts
// lib/wiki-qa/sync.ts — service-role write to qa_wiki_refs.
// Idempotent: delete-then-insert. Caller (createPostAction) wraps in try/catch
// so failures don't block post writes. Returns the slug list so caller can
// revalidatePath('/wiki/<slug>') for each.
import type { SupabaseClient } from "@supabase/supabase-js";
import { extractWikiRefs } from "./extract";
import { getAliasMap } from "@/lib/wiki/page-loader";

export async function syncWikiRefs(
  admin: SupabaseClient,
  postId: string,
  body: string
): Promise<string[]> {
  const aliasMap = await getAliasMap();
  const slugs = extractWikiRefs(body, aliasMap);

  const del = await admin
    .from("qa_wiki_refs")
    .delete()
    .eq("post_id", postId);
  if (del.error) throw del.error;

  if (slugs.length === 0) return [];

  const rows = slugs.map((s) => ({ post_id: postId, wiki_slug: s }));
  const ins = await admin.from("qa_wiki_refs").insert(rows);
  if (ins.error) throw ins.error;

  return slugs;
}
```

- [ ] **Step 5: Run tests, verify pass**

Run: `npm run test -- lib/wiki-qa/sync.test`
Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add lib/wiki-qa/sync.ts lib/wiki-qa/sync.test.ts
git commit -m "feat(wiki-qa): syncWikiRefs delete-then-insert with stubbed tests"
```

---

## Task 5: Read queries module — tests first

**Files:**
- Create: `lib/wiki-qa/queries.test.ts`
- Create: `lib/wiki-qa/queries.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// lib/wiki-qa/queries.test.ts
import { describe, it, expect } from "vitest";
import { listPostsByWikiSlug, listWikiRefsByPost } from "./queries";

interface StubResult { data: unknown; error: unknown }

function stub(result: StubResult) {
  const obj: Record<string, unknown> = {
    select: () => obj,
    eq: () => obj,
    order: () => obj,
    limit: () => obj,
    then: (onF: (v: StubResult) => unknown) => Promise.resolve(result).then(onF),
  };
  return obj;
}

function client(result: StubResult) {
  return { from: () => stub(result) } as unknown as Parameters<
    typeof listPostsByWikiSlug
  >[0];
}

describe("wiki-qa queries", () => {
  it("listPostsByWikiSlug returns mapped posts", async () => {
    const rows = [
      {
        post: {
          id: "p1",
          category: "qa",
          title: "How does it work?",
          created_at: "2026-05-01",
          author: { display_name: "alice", github_login: "a", avatar_url: null },
        },
      },
    ];
    const result = await listPostsByWikiSlug(
      client({ data: rows, error: null }),
      "data-handling/what-is-an-index"
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: "p1", category: "qa", title: "How does it work?" });
  });

  it("listPostsByWikiSlug returns [] on null data", async () => {
    const r = await listPostsByWikiSlug(
      client({ data: null, error: null }),
      "any/slug"
    );
    expect(r).toEqual([]);
  });

  it("listPostsByWikiSlug throws on error", async () => {
    await expect(
      listPostsByWikiSlug(
        client({ data: null, error: { message: "boom" } }),
        "x"
      )
    ).rejects.toEqual({ message: "boom" });
  });

  it("listWikiRefsByPost returns slug array", async () => {
    const rows = [
      { wiki_slug: "code-flow/async" },
      { wiki_slug: "data-handling/what-is-an-index" },
    ];
    const r = await listWikiRefsByPost(
      client({ data: rows, error: null }),
      "post-1"
    );
    expect(r).toEqual([
      "code-flow/async",
      "data-handling/what-is-an-index",
    ]);
  });

  it("listWikiRefsByPost returns [] on null data", async () => {
    const r = await listWikiRefsByPost(
      client({ data: null, error: null }),
      "post-1"
    );
    expect(r).toEqual([]);
  });
});
```

- [ ] **Step 2: Stub `queries.ts` so test compiles**

```ts
// lib/wiki-qa/queries.ts
import type { SupabaseClient } from "@supabase/supabase-js";

export interface RelatedPost {
  id: string;
  category: "qa" | "general" | "notice";
  title: string;
  created_at: string;
  author: { display_name: string | null; github_login: string | null; avatar_url: string | null } | null;
}

export async function listPostsByWikiSlug(
  _supabase: SupabaseClient,
  _slug: string,
  _limit?: number
): Promise<RelatedPost[]> {
  throw new Error("not implemented");
}

export async function listWikiRefsByPost(
  _supabase: SupabaseClient,
  _postId: string
): Promise<string[]> {
  throw new Error("not implemented");
}
```

- [ ] **Step 3: Run tests, verify failure**

Run: `npm run test -- lib/wiki-qa/queries.test`
Expected: FAIL.

- [ ] **Step 4: Implement queries**

```ts
// lib/wiki-qa/queries.ts — read-side helpers for qa_wiki_refs.
// Public read RLS allows anon access; use any client (anon or user-bound).
import type { SupabaseClient } from "@supabase/supabase-js";

export interface RelatedPost {
  id: string;
  category: "qa" | "general" | "notice";
  title: string;
  created_at: string;
  author: {
    display_name: string | null;
    github_login: string | null;
    avatar_url: string | null;
  } | null;
}

const POST_EMBED =
  "post:posts!inner(id, category, title, created_at, author:profiles!posts_author_id_fkey(display_name, github_login, avatar_url))";

export async function listPostsByWikiSlug(
  supabase: SupabaseClient,
  slug: string,
  limit = 20
): Promise<RelatedPost[]> {
  const { data, error } = await supabase
    .from("qa_wiki_refs")
    .select(POST_EMBED)
    .eq("wiki_slug", slug)
    .order("created_at", { foreignTable: "posts", ascending: false })
    .limit(limit);
  if (error) throw error;
  if (!data) return [];
  return (data as unknown as { post: RelatedPost }[]).map((r) => r.post);
}

export async function listWikiRefsByPost(
  supabase: SupabaseClient,
  postId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from("qa_wiki_refs")
    .select("wiki_slug")
    .eq("post_id", postId)
    .order("wiki_slug", { ascending: true });
  if (error) throw error;
  if (!data) return [];
  return (data as { wiki_slug: string }[]).map((r) => r.wiki_slug);
}
```

- [ ] **Step 5: Run tests, verify pass**

Run: `npm run test -- lib/wiki-qa/queries.test`
Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add lib/wiki-qa/queries.ts lib/wiki-qa/queries.test.ts
git commit -m "feat(wiki-qa): read queries listPostsByWikiSlug, listWikiRefsByPost"
```

---

## Task 6: Wire `createPostAction` to `syncWikiRefs`

**Files:**
- Modify: `lib/forum/actions.ts`

- [ ] **Step 1: Edit `createPostAction`**

Replace the existing `createPostAction` body with the version below. The
key changes: after a successful insert, call `syncWikiRefs` under
service-role, then `revalidatePath` for each wiki slug. Sync failure is
swallowed (logged) — post stays committed, redirect still happens.

```ts
// lib/forum/actions.ts
"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { syncWikiRefs } from "@/lib/wiki-qa/sync";
import { newPostSchema, newCommentSchema } from "./schemas";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function createPostAction(formData: FormData): Promise<ActionResult> {
  const raw = {
    category: formData.get("category"),
    title: formData.get("title"),
    body_md: formData.get("body_md"),
    tags: formData.getAll("tags").map((t) => String(t)).filter((t) => t.length > 0),
  };
  const parsed = newPostSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data, error } = await supabase
    .from("posts")
    .insert({
      category: parsed.data.category,
      title: parsed.data.title,
      body_md: parsed.data.body_md,
      tags: parsed.data.tags,
      author_id: user.id,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  // Best-effort wiki ↔ Q&A sync. Failures must NOT block the post write.
  try {
    const admin = createServiceClient();
    const slugs = await syncWikiRefs(admin, data.id, parsed.data.body_md);
    for (const slug of slugs) revalidatePath(`/wiki/${slug}`);
  } catch (e) {
    console.error("[wiki-qa sync failed]", e);
  }

  revalidatePath(`/forum/${parsed.data.category}`);
  revalidatePath("/forum");
  redirect(`/forum/post/${data.id}`);
}

export async function createCommentAction(formData: FormData): Promise<ActionResult> {
  const raw = {
    post_id: formData.get("post_id"),
    body_md: formData.get("body_md"),
  };
  const parsed = newCommentSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { error } = await supabase.from("comments").insert({
    post_id: parsed.data.post_id,
    body_md: parsed.data.body_md,
    author_id: user.id,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/forum/post/${parsed.data.post_id}`);
  return { ok: true };
}
```

- [ ] **Step 2: Typecheck + tests**

Run: `npm run typecheck && npm run test`
Expected: passes (no broken tests; existing forum tests still green).

- [ ] **Step 3: Commit**

```bash
git add lib/forum/actions.ts
git commit -m "feat(forum): createPostAction syncs qa_wiki_refs (best-effort)"
```

---

## Task 7: `<RelatedQA>` component

**Files:**
- Create: `components/wiki/RelatedQA.tsx`

- [ ] **Step 1: Write the component**

```tsx
// components/wiki/RelatedQA.tsx — surfaces forum posts that reference this
// wiki page. Server-rendered card following the Backlinks pattern.
import Link from "next/link";
import { CategoryBadge } from "@/components/forum/CategoryBadge";
import type { RelatedPost } from "@/lib/wiki-qa/queries";

interface Props {
  posts: RelatedPost[];
}

export function RelatedQA({ posts }: Props) {
  return (
    <section aria-label="Related discussions" className="text-sm">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-2">
        관련 토론
      </h2>
      {posts.length === 0 ? (
        <p className="text-[var(--text-secondary)]">
          이 페이지를 인용한 토론이 아직 없어요.{" "}
          <Link href="/forum/qa" className="underline">
            Q&A에 묻기
          </Link>
        </p>
      ) : (
        <ul className="space-y-2">
          {posts.map((p) => {
            const author =
              p.author?.display_name ?? p.author?.github_login ?? "익명";
            return (
              <li key={p.id} className="space-y-1">
                <div className="flex items-center gap-2">
                  <CategoryBadge category={p.category} />
                  <Link
                    href={`/forum/post/${p.id}`}
                    className="text-[var(--text-primary)] hover:underline"
                  >
                    {p.title}
                  </Link>
                </div>
                <div className="text-xs text-[var(--text-secondary)]">
                  {author} · {p.created_at.slice(0, 10)}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add components/wiki/RelatedQA.tsx
git commit -m "feat(wiki): RelatedQA card for wiki page right panel"
```

---

## Task 8: `<RelatedWiki>` component

**Files:**
- Create: `components/forum/RelatedWiki.tsx`

- [ ] **Step 1: Write the component**

```tsx
// components/forum/RelatedWiki.tsx — surfaces wiki pages this Q&A post
// references. Caller should pass non-empty slugs (parent renders nothing
// for empty case so RightPanel itself is hidden).
import Link from "next/link";
import type { Route } from "next";

interface Props {
  slugs: string[];
  titleMap: Record<string, string>;
}

export function RelatedWiki({ slugs, titleMap }: Props) {
  return (
    <section aria-label="Referenced wiki pages" className="text-sm">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-2">
        이 글이 인용한 위키
      </h2>
      <ul className="space-y-1">
        {slugs.map((slug) => (
          <li key={slug} className="flex items-center gap-2">
            <span
              aria-hidden
              className="inline-block w-1.5 h-1.5 rounded-full bg-[#7c3aed]"
            />
            <Link
              href={`/wiki/${slug}` as Route}
              className="text-[var(--text-primary)] hover:underline"
            >
              {titleMap[slug] ?? slug}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add components/forum/RelatedWiki.tsx
git commit -m "feat(forum): RelatedWiki card for forum post right panel"
```

---

## Task 9: Wire wiki page — `<RelatedQA>` + ISR revalidate

**Files:**
- Modify: `app/wiki/[...slug]/page.tsx`

- [ ] **Step 1: Update wiki slug page**

Replace the file content with:

```tsx
// app/wiki/[...slug]/page.tsx
import { notFound } from "next/navigation";
import { loadOnePage, getAllSlugs, getAllPages } from "@/lib/wiki/page-loader";
import { WikiPage } from "@/components/wiki/WikiPage";
import { AppShell } from "@/components/layout/AppShell";
import { Sidebar } from "@/components/layout/Sidebar";
import { RightPanel } from "@/components/layout/RightPanel";
import { TableOfContents } from "@/components/wiki/TableOfContents";
import { Backlinks } from "@/components/wiki/Backlinks";
import { RelatedQA } from "@/components/wiki/RelatedQA";
import { SearchBox } from "@/components/wiki/SearchBox";
import { createClient } from "@/lib/supabase/server";
import { listPostsByWikiSlug } from "@/lib/wiki-qa/queries";

const EDIT_BASE_URL = process.env.NEXT_PUBLIC_WIKI_REPO_URL ?? null;

export const dynamicParams = true;
export const revalidate = 60;

export async function generateStaticParams() {
  const slugs = await getAllSlugs();
  return slugs.map((slug) => ({ slug: slug.split("/") }));
}

export default async function WikiSlugPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const fullSlug = slug.join("/");
  const bundle = await loadOnePage(fullSlug);
  if (!bundle) notFound();

  const all = await getAllPages();
  const sidebarPages = all.map((p) => ({
    slug: p.slug,
    title: p.frontmatter.title,
    category: p.slug.split("/")[0],
  }));

  // Related Q&A: best-effort. If Supabase is down, render empty section.
  let relatedQA: Awaited<ReturnType<typeof listPostsByWikiSlug>> = [];
  try {
    const supabase = await createClient();
    relatedQA = await listPostsByWikiSlug(supabase, fullSlug, 20);
  } catch (e) {
    console.error("[RelatedQA load failed]", e);
  }

  return (
    <AppShell
      headerSearch={<SearchBox />}
      sidebar={<Sidebar pages={sidebarPages} currentSlug={fullSlug} />}
      main={
        <WikiPage
          slug={fullSlug}
          frontmatter={bundle.page.frontmatter}
          bodyHtml={bundle.bodyHtml}
          editBaseUrl={EDIT_BASE_URL}
          filePath={bundle.page.filePath}
        />
      }
      right={
        <RightPanel>
          <TableOfContents bodyHtml={bundle.bodyHtml} />
          <Backlinks slugs={bundle.backlinks} titleMap={bundle.titleMap} />
          <RelatedQA posts={relatedQA} />
        </RightPanel>
      }
    />
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const bundle = await loadOnePage(slug.join("/"));
  if (!bundle) return { title: "Not Found" };
  return { title: `${bundle.page.frontmatter.title} — VibeForge` };
}
```

- [ ] **Step 2: Typecheck + test (existing wiki e2e shouldn't regress)**

Run: `npm run typecheck && npm run test`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add app/wiki/[...slug]/page.tsx
git commit -m "feat(wiki): RelatedQA in right panel + revalidate=60 ISR"
```

---

## Task 10: Wire forum post page — `<RelatedWiki>` right panel

**Files:**
- Modify: `app/forum/post/[id]/page.tsx`

- [ ] **Step 1: Update forum post page**

Replace the file content with:

```tsx
// app/forum/post/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPost, listComments } from "@/lib/forum/queries";
import { listWikiRefsByPost } from "@/lib/wiki-qa/queries";
import { AppShell } from "@/components/layout/AppShell";
import { Sidebar } from "@/components/layout/Sidebar";
import { RightPanel } from "@/components/layout/RightPanel";
import { SearchBox } from "@/components/wiki/SearchBox";
import { CategoryBadge } from "@/components/forum/CategoryBadge";
import { CommentForm } from "@/components/forum/CommentForm";
import { RelatedWiki } from "@/components/forum/RelatedWiki";
import { getAllPages } from "@/lib/wiki/page-loader";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const post = await getPost(supabase, id);
  if (!post) return { title: "Not Found" };
  return { title: `${post.title} — VibeForge Forum` };
}

export default async function ForumPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const [post, comments, userResult] = await Promise.all([
    getPost(supabase, id),
    listComments(supabase, id),
    supabase.auth.getUser(),
  ]);
  if (!post) notFound();
  const user = userResult.data.user;

  const all = await getAllPages();
  const sidebarPages = all.map((p) => ({
    slug: p.slug,
    title: p.frontmatter.title,
    category: p.slug.split("/")[0],
  }));
  const titleMap: Record<string, string> = Object.fromEntries(
    all.map((p) => [p.slug, p.frontmatter.title])
  );

  // Related wiki refs — best-effort.
  let wikiSlugs: string[] = [];
  try {
    wikiSlugs = await listWikiRefsByPost(supabase, post.id);
  } catch (e) {
    console.error("[RelatedWiki load failed]", e);
  }

  const authorName =
    post.author?.display_name ?? post.author?.github_login ?? "익명";

  return (
    <AppShell
      headerSearch={<SearchBox />}
      sidebar={<Sidebar pages={sidebarPages} currentSlug={null} />}
      right={
        wikiSlugs.length > 0 ? (
          <RightPanel>
            <RelatedWiki slugs={wikiSlugs} titleMap={titleMap} />
          </RightPanel>
        ) : undefined
      }
      main={
        <div className="space-y-4">
          <article className="vf-card p-6 md:p-8">
            <div className="flex items-center gap-2 mb-3">
              <CategoryBadge category={post.category} />
              <span className="text-sm text-[var(--text-secondary)]">{authorName}</span>
              <span className="text-sm text-[var(--text-secondary)] ml-auto">
                {post.created_at.slice(0, 10)}
              </span>
            </div>
            <h1 className="text-2xl font-bold mb-4">{post.title}</h1>
            <div className="prose max-w-none whitespace-pre-wrap">{post.body_md}</div>
          </article>
          <section className="vf-card p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-3">
              댓글 {comments.length}
            </h2>
            {comments.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)] mb-4">첫 댓글을 남겨보세요.</p>
            ) : (
              <ul className="space-y-3 mb-4">
                {comments.map((c) => {
                  const cAuthor = c.author?.display_name ?? c.author?.github_login ?? "익명";
                  return (
                    <li key={c.id} className="border-t border-black/5 pt-3 first:border-0 first:pt-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{cAuthor}</span>
                        <span className="text-xs text-[var(--text-secondary)]">{c.created_at.slice(0, 10)}</span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{c.body_md}</p>
                    </li>
                  );
                })}
              </ul>
            )}
            {user ? (
              <CommentForm postId={post.id} />
            ) : (
              <p className="text-sm text-[var(--text-secondary)]">
                댓글을 달려면 <Link href="/forum" className="underline">로그인</Link>이 필요해요.
              </p>
            )}
          </section>
        </div>
      }
    />
  );
}
```

- [ ] **Step 2: Typecheck + test**

Run: `npm run typecheck && npm run test`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add app/forum/post/[id]/page.tsx
git commit -m "feat(forum): RelatedWiki in right panel of post detail"
```

---

## Task 11: E2E — fixture-based read-only backlinks smoke

The plan-3 e2e suite is read-only smoke (no auth fixture). Follow the same
posture: insert fixtures via service-role, verify both surfaces, clean up.
This skips the OAuth flow but validates the read paths and component wiring.

**Files:**
- Create: `tests/e2e/wiki-qa-backlinks.spec.ts`

**Pre-condition:** `content/data/data-handling/what-is-an-index.md` exists
(verified — a real seeded vault page). The frontmatter title from that
file is the canonical wiki title; the slug is `data-handling/what-is-an-index`.

- [ ] **Step 1: Write the spec**

```ts
// tests/e2e/wiki-qa-backlinks.spec.ts
// Read-only verification of wiki ↔ Q&A backlink surfaces. We seed a profile,
// a post, and a qa_wiki_refs row directly via service-role, then verify both
// pages render the relationship. Auth/OAuth flow is out of scope for plan 3
// e2e, so the create-action path is covered by unit tests + manual QA.
import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const SEED_SLUG = "data-handling/what-is-an-index";

let admin: ReturnType<typeof createClient>;
let userId: string;
let postId: string;

test.beforeAll(async () => {
  test.skip(!SUPABASE_URL || !SERVICE_KEY, "Supabase env not configured");
  admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Create a fixture auth user so author_id satisfies the FK.
  const email = `plan4-fixture-${Date.now()}@example.com`;
  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { user_name: "plan4-fixture", name: "Plan4 Fixture" },
  });
  if (cErr) throw cErr;
  userId = created.user!.id;

  const { data: post, error: pErr } = await admin
    .from("posts")
    .insert({
      category: "qa",
      title: "PLAN4 FIXTURE: Wiki backlink smoke",
      body_md: `Refers to /wiki/${SEED_SLUG} and [[what-is-an-index]].`,
      author_id: userId,
      tags: [],
    })
    .select("id")
    .single();
  if (pErr) throw pErr;
  postId = post.id as string;

  const { error: rErr } = await admin
    .from("qa_wiki_refs")
    .insert({ post_id: postId, wiki_slug: SEED_SLUG });
  if (rErr) throw rErr;
});

test.afterAll(async () => {
  if (postId) await admin.from("posts").delete().eq("id", postId);
  if (userId) await admin.auth.admin.deleteUser(userId);
});

test.describe("wiki ↔ Q&A backlinks", () => {
  test("wiki page lists the seeded Q&A post under 관련 토론", async ({ page }) => {
    await page.goto(`/wiki/${SEED_SLUG}`);
    const right = page.getByTestId("appshell-right");
    await expect(right.getByText("관련 토론")).toBeVisible();
    await expect(
      right.getByRole("link", { name: "PLAN4 FIXTURE: Wiki backlink smoke" })
    ).toBeVisible();
  });

  test("Q&A post page lists the wiki page under 이 글이 인용한 위키", async ({ page }) => {
    await page.goto(`/forum/post/${postId}`);
    const right = page.getByTestId("appshell-right");
    await expect(right.getByText("이 글이 인용한 위키")).toBeVisible();
    // The seed page's frontmatter title is "인덱스가 뭐예요?" — RelatedWiki
    // renders titleMap[slug] which is that title.
    await expect(
      right.getByRole("link", { name: "인덱스가 뭐예요?" })
    ).toBeVisible();
  });
});
```

- [ ] **Step 2: Run e2e to confirm passing**

Run: `npm run test:e2e -- wiki-qa-backlinks`
Expected: 2 tests pass. (If Supabase env not configured locally, tests are
auto-skipped; CI must have the secrets.)

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/wiki-qa-backlinks.spec.ts
git commit -m "test(e2e): fixture-based wiki ↔ Q&A backlinks smoke"
```

---

## Task 12: Final verification + tag

- [ ] **Step 1: Full typecheck, lint, unit tests**

Run: `npm run typecheck && npm run lint && npm run test`
Expected: all green.

- [ ] **Step 2: Manual smoke (dev server)**

Run: `npm run dev` then in browser:
1. Sign in with GitHub.
2. Go to `/forum/new?cat=qa`. Submit a post with body
   `테스트 [[what-is-an-index]] 와 /wiki/data-handling/what-is-an-index 보세요.`.
3. After redirect to `/forum/post/<id>`, confirm right panel shows
   "이 글이 인용한 위키" with the wiki page linked.
4. Visit `/wiki/data-handling/what-is-an-index`. Confirm right panel
   "관련 토론" lists the post.
5. Wait briefly (or trigger revalidate) — already covered by
   `revalidatePath` in the action, so should appear immediately.
6. Delete the post (manually via Supabase Studio or a DELETE; out of UI
   scope) and verify the wiki page's "관련 토론" empties.

- [ ] **Step 3: Update memory + tag**

Edit `C:\Users\seth0\.claude\projects\D--Education\memory\MEMORY.md` to add a
new line referencing a new `plan4_complete.md` memory file (write that file
in the same edit, mirroring `plan3_complete.md`'s shape):

```
- [Plan 4 complete](plan4_complete.md) — VibeForge Wiki ↔ Q&A backlinks done; tag `plan4-wiki-qa-backlinks`; Plan 5 (그래프뷰/giscus/About) next
```

`plan4_complete.md` body should briefly summarize: spec path, plan path,
modules created, integration points, follow-ups (orphan ref cleanup,
update-action sync, codeblock false-positive fix).

- [ ] **Step 4: Tag**

```bash
git tag plan4-wiki-qa-backlinks
git log --oneline plan3-supabase-forum..HEAD
```

Expected: clean linear history of plan 4 commits.

---

## Verification Summary (success criteria from spec)

| Spec criterion | Verified by |
|---|---|
| Q&A 작성 시 `/wiki/<slug>` / `[[Page]]` → `qa_wiki_refs` row 생성 | extract.test, sync.test, manual smoke |
| wiki 페이지 RightPanel "관련 토론" surface | RelatedQA component, e2e fixture test |
| Q&A 페이지 RightPanel "이 글이 인용한 위키" surface | RelatedWiki component, e2e fixture test |
| 깨진 wiki 참조는 `qa_wiki_refs`에 안 들어감 | extract.test (drop unresolved) |
| post 삭제 → ON DELETE CASCADE | already in 0001_init.sql; manual smoke |
| sync 실패가 post 저장을 막지 않음 | actions.ts try/catch; reviewable in code |
| 모든 단위 테스트 통과 | Task 12 step 1 |
| e2e 양측 surface 검증 | Task 11 |
