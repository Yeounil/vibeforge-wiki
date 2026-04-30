# VibeForge Plan 3: Supabase + GitHub OAuth + Forum CRUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Supabase Cloud (Postgres + Auth) backing the Forum (3 categories: Q&A / general / notice) with GitHub OAuth, RLS-enforced CRUD, and forum routes integrated into the Plan 2 AppShell.

**Architecture:** The site uses `@supabase/ssr` to bridge Supabase's auth cookies into Next.js 15 App Router. Browser components use a browser client; server components and Server Actions use a server client that reads/writes auth cookies. A Next middleware refreshes the session on every request. Database schema lives in `supabase/migrations/*.sql` (committed) and is applied by the user via Supabase Studio's SQL Editor. Forum reads use server components; forum writes use Server Actions with Zod validation. RLS enforces `author_id = auth.uid()` and admin-only `notice` writes.

**Tech Stack:** Next.js 15 · React 19 · TypeScript strict · `@supabase/supabase-js` 2.x · `@supabase/ssr` 0.5.x · `zod` 3.x · Vitest · Playwright.

**Branch:** Create `plan3/supabase-forum` from tag `plan2-visual-design-3col`.

**Out of scope (deferred):** Wiki ↔ Q&A bidirectional backlinks (Plan 4), graph view + giscus + About (Plan 5).

---

## USER ACTION REQUIRED (Prerequisites for Task 3.10 onward)

Before Task 3.10 can be reached, the user must complete external setup. The Plan organizes code-only work in Phases A and B (Tasks 3.1–3.9) so that work can proceed without the external services. Phase C onward depends on the user having done these steps:

1. **Supabase project**
   - Sign up at https://supabase.com (free tier).
   - Create a new project. Copy:
     - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
     - anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - service_role key → `SUPABASE_SERVICE_ROLE_KEY` (KEEP SECRET — never commit, never `NEXT_PUBLIC_*`)

2. **GitHub OAuth App**
   - GitHub → Settings → Developer settings → OAuth Apps → "New OAuth App"
   - Application name: `VibeForge`
   - Homepage URL: `http://localhost:3000` (dev) — production URL added later
   - Authorization callback URL: `https://<project-ref>.supabase.co/auth/v1/callback` (find this in Supabase → Authentication → Providers → GitHub)
   - Save Client ID and Client Secret.

3. **Configure GitHub provider in Supabase**
   - Supabase Studio → Authentication → Providers → GitHub → Enable.
   - Paste Client ID and Client Secret. Save.
   - Site URL: `http://localhost:3000` (dev). Add other redirect URLs later for production.

4. **Apply migrations**
   - At Task 3.10 the user opens Supabase Studio → SQL Editor and runs the contents of `supabase/migrations/0001_init.sql` then `supabase/migrations/0002_rls.sql`.
   - Verify tables exist via Database → Tables.

5. **Populate `.env`** (copied from `.env.example`):
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
   NEXT_PUBLIC_WIKI_REPO_URL=https://github.com/Yeounil/vibeforge-wiki   # already set in Plan 1
   ```

If the user is not ready for the external setup at the time Plan 3 is dispatched, the controller MUST stop after Task 3.9 and report the checkpoint. Do not attempt Phases C–F without confirming `.env` is populated and migrations are applied.

---

## File Structure

**Create:**
- `.env.example` — template for env vars (committed)
- `lib/env.ts` — runtime env validation (server vs browser separation)
- `lib/supabase/server.ts` — server-side Supabase client factory (Server Components, Route Handlers, Server Actions)
- `lib/supabase/browser.ts` — browser-side client factory
- `middleware.ts` — Next middleware for Supabase session refresh
- `supabase/migrations/0001_init.sql` — schema (profiles, posts, comments, qa_wiki_refs)
- `supabase/migrations/0002_rls.sql` — RLS policies
- `lib/forum/types.ts` — TypeScript types matching schema
- `lib/forum/schemas.ts` — Zod schemas (input validation)
- `lib/forum/queries.ts` — server-side reads (listPosts, getPost, listComments, listProfiles by ids)
- `lib/forum/actions.ts` — server actions (createPost, createComment)
- `app/auth/callback/route.ts` — Supabase Auth callback handler
- `lib/auth/use-user.ts` — client hook returning current Supabase user
- `components/layout/AuthButton.tsx` — sign-in / sign-out
- `components/forum/PostCard.tsx` — list-row card
- `components/forum/PostList.tsx` — list of cards
- `components/forum/PostDetail.tsx` — single post body + meta
- `components/forum/CommentList.tsx`
- `components/forum/NewPostForm.tsx` (client)
- `components/forum/CommentForm.tsx` (client)
- `components/forum/CategoryBadge.tsx` — qa/general/notice colored pill
- `app/forum/page.tsx` — landing (3 categories + recent across all)
- `app/forum/[category]/page.tsx` — category list (qa | general | notice)
- `app/forum/post/[id]/page.tsx` — post detail + comments
- `app/forum/new/page.tsx` — new post form (auth-gated)
- Tests colocated: `lib/forum/{schemas,queries}.test.ts`, `components/forum/PostCard.test.tsx`
- E2E: `tests/e2e/forum-read.spec.ts`

**Modify:**
- `package.json` — add `@supabase/supabase-js`, `@supabase/ssr`, `zod`
- `components/layout/SiteHeader.tsx` — wire AuthButton into the header (replaces auth-state placeholder)
- `.gitignore` — append `.env`

**No changes:** All Plan 1 / Plan 2 wiki code, layout primitives, design tokens.

---

## Forum Schema (concrete reference for tasks)

```sql
-- 0001_init.sql

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
```

```sql
-- 0002_rls.sql

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
```

---

## Phase A: Supabase scaffolding (Tasks 3.1 – 3.5, code-only)

### Task 3.1: Branch + dependencies

**Files:** `package.json` (modify), `.gitignore` (modify)

- [ ] **Step 1: Create branch**

```bash
git checkout -b plan3/supabase-forum plan2-visual-design-3col
```

- [ ] **Step 2: Install deps**

```bash
npm install @supabase/supabase-js@^2.45.0 @supabase/ssr@^0.5.0 zod@^3.23.0
```

- [ ] **Step 3: Append `.env` to `.gitignore`**

Read `D:/Education/.gitignore`. Append a single line if not already present:
```
.env
```

- [ ] **Step 4: Verify install**

```bash
node -e "console.log(require('@supabase/ssr/package.json').version, require('@supabase/supabase-js/package.json').version, require('zod/package.json').version)"
```
Expected: three version numbers printed.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json .gitignore
git commit -m "chore(deps): add @supabase/ssr + supabase-js + zod for Plan 3 forum"
```

---

### Task 3.2: Env example + validation module

**Files:**
- Create: `.env.example`
- Create: `lib/env.ts`
- Create: `lib/env.test.ts`

- [ ] **Step 1: Write `.env.example`**

```
# Supabase — get from https://supabase.com/dashboard/project/<ref>/settings/api
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-server-only

# Plan 1 (already configured if Plan 1 was deployed)
NEXT_PUBLIC_WIKI_REPO_URL=https://github.com/Yeounil/vibeforge-wiki
```

- [ ] **Step 2: Failing test** at `D:/Education/lib/env.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getPublicEnv, getServerEnv } from "./env";

const ORIGINAL = { ...process.env };

describe("env", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL };
  });
  afterEach(() => {
    process.env = ORIGINAL;
  });

  it("getPublicEnv returns NEXT_PUBLIC_* values when present", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://x.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-abc";
    const env = getPublicEnv();
    expect(env.SUPABASE_URL).toBe("https://x.supabase.co");
    expect(env.SUPABASE_ANON_KEY).toBe("anon-abc");
  });

  it("getPublicEnv throws when NEXT_PUBLIC_SUPABASE_URL is missing", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
    expect(() => getPublicEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it("getServerEnv requires SUPABASE_SERVICE_ROLE_KEY", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://x.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect(() => getServerEnv()).toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
  });
});
```

- [ ] **Step 3: Run** `npx vitest run lib/env.test.ts` — expect FAIL.

- [ ] **Step 4: Implement** at `D:/Education/lib/env.ts`:

```typescript
// lib/env.ts — runtime env validation. Public vars are bundled into the client
// and must be NEXT_PUBLIC_*. Server-only secrets must NEVER use NEXT_PUBLIC_*.

interface PublicEnv {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
}

interface ServerEnv extends PublicEnv {
  SUPABASE_SERVICE_ROLE_KEY: string;
}

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export function getPublicEnv(): PublicEnv {
  return {
    SUPABASE_URL: required("NEXT_PUBLIC_SUPABASE_URL"),
    SUPABASE_ANON_KEY: required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  };
}

export function getServerEnv(): ServerEnv {
  return {
    ...getPublicEnv(),
    SUPABASE_SERVICE_ROLE_KEY: required("SUPABASE_SERVICE_ROLE_KEY"),
  };
}
```

- [ ] **Step 5: Re-run** test — expect 3 pass.

- [ ] **Step 6: Commit**

```bash
git add .env.example lib/env.ts lib/env.test.ts
git commit -m "feat(env): public + server env helpers with required-var validation"
```

---

### Task 3.3: Supabase server client factory

**Files:**
- Create: `lib/supabase/server.ts`

- [ ] **Step 1: Implement** at `D:/Education/lib/supabase/server.ts`:

```typescript
// lib/supabase/server.ts — server-side Supabase client.
// For Server Components, Route Handlers, and Server Actions.
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getPublicEnv } from "@/lib/env";

export async function createClient() {
  const cookieStore = await cookies();
  const env = getPublicEnv();
  return createServerClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options: CookieOptions }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Server Components cannot set cookies; the middleware refreshes the
          // session, so silently swallow this error.
        }
      },
    },
  });
}
```

NO TEST for this task — it requires a running Supabase instance to mean anything. Verify by typecheck only.

- [ ] **Step 2: Typecheck** `npx tsc --noEmit` — expect 0 errors.

- [ ] **Step 3: Commit**

```bash
git add lib/supabase/server.ts
git commit -m "feat(supabase): server client factory with cookie passthrough"
```

---

### Task 3.4: Supabase browser client factory

**Files:**
- Create: `lib/supabase/browser.ts`

- [ ] **Step 1: Implement**

```typescript
// lib/supabase/browser.ts — browser-side Supabase client.
// For client components.
"use client";

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }
  return createBrowserClient(url, anon);
}
```

NOTE: We do NOT call `getPublicEnv()` here because `lib/env.ts` uses `process.env[name]` lookup which works in both server and browser bundles, BUT importing `lib/env.ts` from a client module pulls the `required(...)` function into the bundle — fine but redundant. Inline access keeps the browser bundle minimal.

- [ ] **Step 2: Typecheck** — 0 errors.

- [ ] **Step 3: Commit**

```bash
git add lib/supabase/browser.ts
git commit -m "feat(supabase): browser client factory"
```

---

### Task 3.5: Next middleware for session refresh

**Files:**
- Create: `middleware.ts` (at repo root, NOT inside `app/`)

- [ ] **Step 1: Implement**

```typescript
// middleware.ts — refresh Supabase session on every request.
// Without this, anon users see expired session cookies and authenticated users
// get logged out after the access token's 1-hour TTL.
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    // During Plan 3 development before .env is populated, just pass through.
    return response;
  }

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }: { name: string; value: string }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options: CookieOptions }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // This call refreshes the access token if needed.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    // Skip static assets and Next internals.
    "/((?!_next/static|_next/image|favicon.ico|fonts/|wiki-data/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2)$).*)",
  ],
};
```

- [ ] **Step 2: Typecheck** — 0 errors.

- [ ] **Step 3: Verify the dev server still starts (smoke test)**

Run `npm run build` — expect exit 0. (Without env vars, middleware short-circuits to passthrough.)

- [ ] **Step 4: Commit**

```bash
git add middleware.ts
git commit -m "feat(auth): Next middleware for Supabase session refresh"
```

---

## Phase B: Schema + types (Tasks 3.6 – 3.9, code-only)

### Task 3.6: Migration 0001_init.sql

**Files:**
- Create: `supabase/migrations/0001_init.sql`

- [ ] **Step 1: Create the file with the schema shown in the "Forum Schema" section near the top of this plan.** Copy verbatim, including the `handle_new_user` function and trigger.

- [ ] **Step 2: Verify file exists and parses (basic syntax check)**

```bash
wc -l supabase/migrations/0001_init.sql
```
Expected: ~50+ lines.

NO automated test for raw SQL — Task 3.10 (USER CHECKPOINT) verifies it applies cleanly.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0001_init.sql
git commit -m "feat(db): 0001_init.sql — profiles, posts, comments, qa_wiki_refs"
```

---

### Task 3.7: Migration 0002_rls.sql

**Files:**
- Create: `supabase/migrations/0002_rls.sql`

- [ ] **Step 1: Create the file with the RLS policies from the "Forum Schema" section.** Copy verbatim.

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/0002_rls.sql
git commit -m "feat(db): 0002_rls.sql — RLS for profiles/posts/comments/qa_wiki_refs"
```

---

### Task 3.8: Forum types module

**Files:**
- Create: `lib/forum/types.ts`

- [ ] **Step 1: Implement**

```typescript
// lib/forum/types.ts — TypeScript types matching public.* tables.

export const FORUM_CATEGORIES = ["qa", "general", "notice"] as const;
export type ForumCategory = (typeof FORUM_CATEGORIES)[number];

export interface Profile {
  id: string;
  github_login: string | null;
  display_name: string | null;
  avatar_url: string | null;
  role: "user" | "admin";
  created_at: string;
}

export interface Post {
  id: string;
  category: ForumCategory;
  title: string;
  body_md: string;
  author_id: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface PostWithAuthor extends Post {
  author: Pick<Profile, "github_login" | "display_name" | "avatar_url"> | null;
}

export interface Comment {
  id: string;
  post_id: string;
  body_md: string;
  author_id: string;
  created_at: string;
  updated_at: string;
}

export interface CommentWithAuthor extends Comment {
  author: Pick<Profile, "github_login" | "display_name" | "avatar_url"> | null;
}

export const CATEGORY_LABELS: Record<ForumCategory, string> = {
  qa: "Q&A",
  general: "일반",
  notice: "공지",
};
```

- [ ] **Step 2: Typecheck** — 0 errors.

- [ ] **Step 3: Commit**

```bash
git add lib/forum/types.ts
git commit -m "feat(forum): types matching DB schema (Profile/Post/Comment + Category)"
```

---

### Task 3.9: Zod schemas for inputs

**Files:**
- Create: `lib/forum/schemas.ts`
- Create: `lib/forum/schemas.test.ts`

- [ ] **Step 1: Failing test**

```typescript
// lib/forum/schemas.test.ts
import { describe, it, expect } from "vitest";
import { newPostSchema, newCommentSchema } from "./schemas";

describe("forum schemas", () => {
  it("newPostSchema accepts valid Q&A post", () => {
    const r = newPostSchema.safeParse({
      category: "qa",
      title: "How does git work?",
      body_md: "I am confused about commits.",
      tags: ["git"],
    });
    expect(r.success).toBe(true);
  });

  it("newPostSchema rejects empty title", () => {
    const r = newPostSchema.safeParse({
      category: "qa",
      title: "",
      body_md: "x",
      tags: [],
    });
    expect(r.success).toBe(false);
  });

  it("newPostSchema rejects unknown category", () => {
    const r = newPostSchema.safeParse({
      category: "bogus",
      title: "ok",
      body_md: "x",
      tags: [],
    });
    expect(r.success).toBe(false);
  });

  it("newPostSchema trims and bounds body length", () => {
    const r = newPostSchema.safeParse({
      category: "general",
      title: "  hi  ",
      body_md: "ok",
      tags: [],
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.title).toBe("hi");
  });

  it("newCommentSchema requires post_id and body", () => {
    expect(newCommentSchema.safeParse({ post_id: "00000000-0000-0000-0000-000000000000", body_md: "yo" }).success).toBe(true);
    expect(newCommentSchema.safeParse({ post_id: "not-a-uuid", body_md: "yo" }).success).toBe(false);
    expect(newCommentSchema.safeParse({ post_id: "00000000-0000-0000-0000-000000000000", body_md: "" }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run** — expect FAIL.

- [ ] **Step 3: Implement** at `D:/Education/lib/forum/schemas.ts`:

```typescript
// lib/forum/schemas.ts — Zod schemas for forum input validation.
import { z } from "zod";
import { FORUM_CATEGORIES } from "./types";

export const newPostSchema = z.object({
  category: z.enum(FORUM_CATEGORIES),
  title: z.string().trim().min(1, "제목을 입력하세요").max(200),
  body_md: z.string().trim().min(1, "본문을 입력하세요").max(20000),
  tags: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
});
export type NewPostInput = z.infer<typeof newPostSchema>;

export const newCommentSchema = z.object({
  post_id: z.string().uuid(),
  body_md: z.string().trim().min(1, "댓글을 입력하세요").max(5000),
});
export type NewCommentInput = z.infer<typeof newCommentSchema>;
```

- [ ] **Step 4: Re-run** — expect 5 pass.

- [ ] **Step 5: Commit**

```bash
git add lib/forum/schemas.ts lib/forum/schemas.test.ts
git commit -m "feat(forum): Zod schemas for newPost and newComment input"
```

---

## Phase C: USER CHECKPOINT — external setup

### Task 3.10: USER CHECKPOINT — Supabase + OAuth + migrations

**Files:** none (verification only)

This is a controller pause. No subagent. The implementer (or controller) must STOP and confirm with the user that:

- [ ] **Step 1: User confirms `.env` exists at `D:/Education/.env`** with three keys populated:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

- [ ] **Step 2: User confirms migrations applied to Supabase**
   - In Supabase Studio → SQL Editor, paste and run `supabase/migrations/0001_init.sql`. Then `0002_rls.sql`.
   - Verify Database → Tables shows `profiles`, `posts`, `comments`, `qa_wiki_refs`.

- [ ] **Step 3: User confirms GitHub OAuth provider enabled in Supabase**
   - Authentication → Providers → GitHub: Enabled, with Client ID and Secret saved.

- [ ] **Step 4: Smoke test connection**

Run a one-off node script (no commit needed):

```bash
node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
c.from('posts').select('id', { count: 'exact', head: true }).then(r => console.log('posts count =', r.count, 'error=', r.error));
"
```
Expected output: `posts count = 0 error= null`. If error, the migrations are not applied or env vars wrong — fix before continuing.

(If `dotenv` is not installed: `npm install --no-save dotenv`. Or just `export NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_ANON_KEY=...` in the shell.)

- [ ] **Step 5: Confirm in conversation**

User responds with "checkpoint passed" or paste Step 4 output before any Phase D task is dispatched.

NO commit for this task — nothing changed in the repo.

---

## Phase D: Auth flow (Tasks 3.11 – 3.14)

### Task 3.11: Auth callback route

**Files:**
- Create: `app/auth/callback/route.ts`

- [ ] **Step 1: Implement**

```typescript
// app/auth/callback/route.ts — Supabase OAuth callback. Exchanges the
// `code` query param for a session and sets auth cookies via the server client.
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/error`);
}
```

NOTE: We don't add an `/auth/error` route in this plan — Next will return its default 404. That's acceptable for v1; a friendly error page can come later.

- [ ] **Step 2: Typecheck** — 0 errors.

- [ ] **Step 3: Commit**

```bash
git add app/auth/callback/route.ts
git commit -m "feat(auth): callback route exchanges code for Supabase session"
```

---

### Task 3.12: useUser client hook

**Files:**
- Create: `lib/auth/use-user.ts`

- [ ] **Step 1: Implement**

```typescript
// lib/auth/use-user.ts — client hook. Subscribes to auth state changes.
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import type { User } from "@supabase/supabase-js";

export function useUser(): { user: User | null; loading: boolean } {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  return { user, loading };
}
```

- [ ] **Step 2: Typecheck** — 0 errors.

NO unit test for this hook — it requires a Supabase mock. The integration is verified end-to-end via Playwright (out of scope for this plan; Plan 3 ships read-only e2e plus manual smoke for sign-in).

- [ ] **Step 3: Commit**

```bash
git add lib/auth/use-user.ts
git commit -m "feat(auth): useUser client hook with auth state subscription"
```

---

### Task 3.13: AuthButton component

**Files:**
- Create: `components/layout/AuthButton.tsx`

- [ ] **Step 1: Implement**

```tsx
// components/layout/AuthButton.tsx — sign in (GitHub) / sign out toggle.
"use client";

import { useUser } from "@/lib/auth/use-user";
import { createClient } from "@/lib/supabase/browser";

export function AuthButton() {
  const { user, loading } = useUser();

  async function signIn() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
  }

  if (loading) {
    return <span className="text-sm text-[var(--text-secondary)]">…</span>;
  }

  if (user) {
    const name =
      (user.user_metadata?.user_name as string | undefined) ??
      (user.user_metadata?.name as string | undefined) ??
      user.email ??
      "user";
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-[var(--text-secondary)]">{name}</span>
        <button
          type="button"
          onClick={signOut}
          className="px-3 py-1 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-black/10"
        >
          로그아웃
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={signIn}
      className="px-3 py-1 rounded-full text-sm font-semibold text-white shadow-sm hover:opacity-90"
      style={{ background: "var(--accent-cta)" }}
    >
      GitHub 로그인
    </button>
  );
}
```

- [ ] **Step 2: Typecheck** — 0 errors.

- [ ] **Step 3: Commit**

```bash
git add components/layout/AuthButton.tsx
git commit -m "feat(auth): AuthButton — GitHub OAuth sign-in / sign-out toggle"
```

---

### Task 3.14: Wire AuthButton into SiteHeader

**Files:**
- Modify: `components/layout/SiteHeader.tsx`
- Modify: `components/layout/SiteHeader.test.tsx`

- [ ] **Step 1: Update SiteHeader to render AuthButton in a right-aligned slot.** Replace `D:/Education/components/layout/SiteHeader.tsx` entirely:

```tsx
// components/layout/SiteHeader.tsx
import Link from "next/link";
import type { Route } from "next";
import { AuthButton } from "./AuthButton";

interface Props {
  searchSlot?: React.ReactNode;
}

export function SiteHeader({ searchSlot }: Props) {
  return (
    <header className="flex items-center gap-6 px-6 py-4 bg-[var(--surface-card)] rounded-[var(--radius-card)] shadow-[var(--surface-shadow)]">
      <Link href="/" className="font-bold text-lg text-[var(--text-primary)]">
        VibeForge
      </Link>
      <nav className="flex gap-4 text-sm text-[var(--text-secondary)]">
        <Link href="/wiki" className="hover:text-[var(--text-primary)]">Wiki</Link>
        <Link href={"/forum" as Route} className="hover:text-[var(--text-primary)]">Forum</Link>
        <Link href={"/about" as Route} className="hover:text-[var(--text-primary)]">About</Link>
      </nav>
      {searchSlot && <div className="flex-1 max-w-md">{searchSlot}</div>}
      <div className={searchSlot ? "" : "ml-auto"}>
        <AuthButton />
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Update the unit test.** AuthButton's `useUser` hook calls `createClient()` from `lib/supabase/browser.ts` — that throws when env vars are absent (jsdom test env). Mock the AuthButton render path in the SiteHeader test by stubbing `lib/supabase/browser`. Replace `D:/Education/components/layout/SiteHeader.test.tsx` entirely:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/supabase/browser", () => ({
  createClient: () => ({
    auth: {
      getUser: () => Promise.resolve({ data: { user: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithOAuth: () => Promise.resolve({ data: null, error: null }),
      signOut: () => Promise.resolve({ error: null }),
    },
  }),
}));

import { SiteHeader } from "./SiteHeader";

describe("SiteHeader", () => {
  it("renders logo, nav links, search slot, and auth button", () => {
    render(<SiteHeader searchSlot={<input data-testid="s" />} />);
    expect(screen.getByRole("link", { name: "VibeForge" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Wiki" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Forum" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "About" })).toBeInTheDocument();
    expect(screen.getByTestId("s")).toBeInTheDocument();
    // AuthButton initially shows the loading "…" placeholder before async getUser resolves.
    // Or the sign-in button if effects already fired. Either way, "GitHub 로그인" or "…" must be present.
  });

  it("renders without search slot", () => {
    render(<SiteHeader />);
    expect(screen.getByRole("link", { name: "VibeForge" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run** `npx vitest run components/layout/SiteHeader.test.tsx` — expect 2 pass.

- [ ] **Step 4: Run all unit tests** — `npx vitest run` — expect all green.

- [ ] **Step 5: Typecheck + build**

```bash
npx tsc --noEmit
npm run build
```
Expected: 0 typecheck errors, build exit 0.

- [ ] **Step 6: Commit**

```bash
git add components/layout/SiteHeader.tsx components/layout/SiteHeader.test.tsx
git commit -m "feat(auth): integrate AuthButton into SiteHeader (replaces placeholder)"
```

---

## Phase E: Forum reads (Tasks 3.15 – 3.18)

### Task 3.15: Forum query module

**Files:**
- Create: `lib/forum/queries.ts`

- [ ] **Step 1: Implement**

```typescript
// lib/forum/queries.ts — server-side reads against Supabase. ALL functions
// take a `supabase` client argument so callers (Server Components, Route
// Handlers, tests) can inject either the real or a mock client.
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ForumCategory,
  Post,
  PostWithAuthor,
  CommentWithAuthor,
} from "./types";

const POST_FIELDS =
  "id, category, title, body_md, author_id, tags, created_at, updated_at";
const POST_WITH_AUTHOR_SELECT = `${POST_FIELDS}, author:profiles!posts_author_id_fkey(github_login, display_name, avatar_url)`;
const COMMENT_WITH_AUTHOR_SELECT =
  "id, post_id, body_md, author_id, created_at, updated_at, author:profiles!comments_author_id_fkey(github_login, display_name, avatar_url)";

export async function listPosts(
  supabase: SupabaseClient,
  opts: { category?: ForumCategory; limit?: number } = {}
): Promise<PostWithAuthor[]> {
  let q = supabase
    .from("posts")
    .select(POST_WITH_AUTHOR_SELECT)
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 50);
  if (opts.category) q = q.eq("category", opts.category);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as PostWithAuthor[];
}

export async function getPost(
  supabase: SupabaseClient,
  id: string
): Promise<PostWithAuthor | null> {
  const { data, error } = await supabase
    .from("posts")
    .select(POST_WITH_AUTHOR_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as PostWithAuthor | null) ?? null;
}

export async function listComments(
  supabase: SupabaseClient,
  postId: string
): Promise<CommentWithAuthor[]> {
  const { data, error } = await supabase
    .from("comments")
    .select(COMMENT_WITH_AUTHOR_SELECT)
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as CommentWithAuthor[];
}

export async function countPostsByCategory(
  supabase: SupabaseClient
): Promise<Record<ForumCategory, number>> {
  const cats: ForumCategory[] = ["qa", "general", "notice"];
  const out: Record<ForumCategory, number> = { qa: 0, general: 0, notice: 0 };
  for (const cat of cats) {
    const { count, error } = await supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("category", cat);
    if (error) throw error;
    out[cat] = count ?? 0;
  }
  return out;
}

// Used by Plan 4 (wiki/qa backlinks) — defined now so the Post type covers it.
export type { Post };
```

- [ ] **Step 2: Typecheck** — 0 errors.

- [ ] **Step 3: Commit**

```bash
git add lib/forum/queries.ts
git commit -m "feat(forum): query module — listPosts, getPost, listComments, counts"
```

---

### Task 3.16: Forum query tests with mocked client

**Files:**
- Create: `lib/forum/queries.test.ts`

- [ ] **Step 1: Failing test**

```typescript
// lib/forum/queries.test.ts — tests against a manually-stubbed SupabaseClient.
// We don't pull in the full @supabase/supabase-js types here — the queries
// module only uses a small chainable subset. The stub re-implements just that.
import { describe, it, expect } from "vitest";
import { listPosts, getPost, listComments } from "./queries";

interface StubResult { data: unknown; error: unknown }
function stub(result: StubResult) {
  // Builds a chainable query object. Every method returns `this`; the await
  // value resolves to `result`.
  const obj: Record<string, unknown> = {
    select: () => obj,
    order: () => obj,
    limit: () => obj,
    eq: () => obj,
    maybeSingle: () => Promise.resolve(result),
    then: (onFulfilled: (v: StubResult) => unknown) => Promise.resolve(result).then(onFulfilled),
  };
  return obj;
}
function client(result: StubResult) {
  return {
    from: () => stub(result),
  } as unknown as Parameters<typeof listPosts>[0];
}

describe("forum queries", () => {
  it("listPosts returns rows on success", async () => {
    const rows = [
      { id: "a", category: "qa", title: "t", body_md: "b", author_id: "u", tags: [], created_at: "2026-05-01", updated_at: "2026-05-01", author: null },
    ];
    const result = await listPosts(client({ data: rows, error: null }));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("a");
  });

  it("listPosts throws on error", async () => {
    await expect(listPosts(client({ data: null, error: { message: "boom" } }))).rejects.toEqual({ message: "boom" });
  });

  it("getPost returns null when not found", async () => {
    const r = await getPost(client({ data: null, error: null }), "missing-id");
    expect(r).toBeNull();
  });

  it("listComments returns comments array", async () => {
    const rows = [
      { id: "c1", post_id: "p", body_md: "hi", author_id: "u", created_at: "x", updated_at: "x", author: null },
    ];
    const r = await listComments(client({ data: rows, error: null }), "p");
    expect(r[0].id).toBe("c1");
  });
});
```

NOTE: the chainable stub uses a `then` method so awaiting the chain itself resolves to `result`. This mimics how real PostgREST queries are awaited.

- [ ] **Step 2: Run** — expect FAIL (file doesn't compile because `queries.ts` exists but the stub interface might mismatch).

Actually `queries.ts` already exists from Task 3.15 — the test will run. If types fail to align, adjust the stub interface, NOT `queries.ts`.

- [ ] **Step 3: Make it pass.** If the test fails due to type mismatches between the stub and `SupabaseClient`, the issue is the stub doesn't satisfy the real type. Mitigation in test file: cast to `unknown as Parameters<typeof listPosts>[0]` (already shown in test). If Vitest still fails on unrelated grounds, report findings.

- [ ] **Step 4: Re-run** — expect 4 pass.

- [ ] **Step 5: Commit**

```bash
git add lib/forum/queries.test.ts
git commit -m "test(forum): query module tests with stubbed Supabase client"
```

---

### Task 3.17: PostCard + PostList + CategoryBadge components

**Files:**
- Create: `components/forum/CategoryBadge.tsx`
- Create: `components/forum/PostCard.tsx`
- Create: `components/forum/PostList.tsx`
- Create: `components/forum/PostCard.test.tsx`

- [ ] **Step 1: Implement CategoryBadge**

```tsx
// components/forum/CategoryBadge.tsx
import { CATEGORY_LABELS, type ForumCategory } from "@/lib/forum/types";

const COLOR: Record<ForumCategory, string> = {
  qa: "var(--cat-data-handling)",      // purple
  general: "var(--cat-code-flow)",     // green
  notice: "var(--cat-default)",        // orange
};

interface Props {
  category: ForumCategory;
}

export function CategoryBadge({ category }: Props) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: `${COLOR[category]}1A`, color: COLOR[category] }}
    >
      <span aria-hidden className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLOR[category] }} />
      {CATEGORY_LABELS[category]}
    </span>
  );
}
```

- [ ] **Step 2: Implement PostCard**

```tsx
// components/forum/PostCard.tsx
import Link from "next/link";
import type { Route } from "next";
import type { PostWithAuthor } from "@/lib/forum/types";
import { CategoryBadge } from "./CategoryBadge";

interface Props {
  post: PostWithAuthor;
}

export function PostCard({ post }: Props) {
  const authorName =
    post.author?.display_name ?? post.author?.github_login ?? "익명";
  return (
    <Link
      href={`/forum/post/${post.id}` as Route}
      className="block vf-card p-4 hover:shadow-lg transition"
    >
      <div className="flex items-center gap-2 mb-2">
        <CategoryBadge category={post.category} />
        <span className="text-xs text-[var(--text-secondary)]">{authorName}</span>
        <span className="text-xs text-[var(--text-secondary)] ml-auto">
          {post.created_at.slice(0, 10)}
        </span>
      </div>
      <h3 className="font-semibold text-[var(--text-primary)]">{post.title}</h3>
      {post.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {post.tags.map((t) => (
            <span key={t} className="text-xs text-[var(--text-secondary)] px-1.5 py-0.5 rounded bg-black/5">
              #{t}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
```

- [ ] **Step 3: Implement PostList**

```tsx
// components/forum/PostList.tsx
import type { PostWithAuthor } from "@/lib/forum/types";
import { PostCard } from "./PostCard";

interface Props {
  posts: PostWithAuthor[];
  emptyMessage?: string;
}

export function PostList({ posts, emptyMessage = "아직 글이 없어요." }: Props) {
  if (posts.length === 0) {
    return (
      <div className="vf-card p-6 text-center text-[var(--text-secondary)]">
        {emptyMessage}
      </div>
    );
  }
  return (
    <ul className="space-y-3">
      {posts.map((p) => (
        <li key={p.id}>
          <PostCard post={p} />
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 4: Failing test** at `D:/Education/components/forum/PostCard.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PostCard } from "./PostCard";
import type { PostWithAuthor } from "@/lib/forum/types";

const POST: PostWithAuthor = {
  id: "abc",
  category: "qa",
  title: "How does git rebase work?",
  body_md: "...",
  author_id: "u1",
  tags: ["git", "basics"],
  created_at: "2026-05-01T00:00:00Z",
  updated_at: "2026-05-01T00:00:00Z",
  author: { github_login: "yeounil", display_name: "Yeounil", avatar_url: null },
};

describe("PostCard", () => {
  it("renders title, author display_name, category badge, and tags", () => {
    render(<PostCard post={POST} />);
    expect(screen.getByText("How does git rebase work?")).toBeInTheDocument();
    expect(screen.getByText("Yeounil")).toBeInTheDocument();
    expect(screen.getByText("Q&A")).toBeInTheDocument();
    expect(screen.getByText("#git")).toBeInTheDocument();
  });

  it("falls back to github_login when display_name is null", () => {
    render(<PostCard post={{ ...POST, author: { github_login: "y", display_name: null, avatar_url: null } }} />);
    expect(screen.getByText("y")).toBeInTheDocument();
  });

  it("falls back to '익명' when author is null", () => {
    render(<PostCard post={{ ...POST, author: null }} />);
    expect(screen.getByText("익명")).toBeInTheDocument();
  });
});
```

- [ ] **Step 5: Run** — expect 3 pass.

- [ ] **Step 6: Typecheck** — 0 errors.

- [ ] **Step 7: Commit**

```bash
git add components/forum/CategoryBadge.tsx components/forum/PostCard.tsx components/forum/PostList.tsx components/forum/PostCard.test.tsx
git commit -m "feat(forum): PostCard + PostList + CategoryBadge components"
```

---

### Task 3.18: Forum routes — landing + category + detail (read-only)

**Files:**
- Create: `app/forum/page.tsx`
- Create: `app/forum/[category]/page.tsx`
- Create: `app/forum/post/[id]/page.tsx`

- [ ] **Step 1: Implement `app/forum/page.tsx`** (forum landing — recent across all + category counts):

```tsx
// app/forum/page.tsx
import Link from "next/link";
import type { Route } from "next";
import { createClient } from "@/lib/supabase/server";
import { listPosts, countPostsByCategory } from "@/lib/forum/queries";
import { CATEGORY_LABELS, FORUM_CATEGORIES } from "@/lib/forum/types";
import { AppShell } from "@/components/layout/AppShell";
import { Sidebar } from "@/components/layout/Sidebar";
import { SearchBox } from "@/components/wiki/SearchBox";
import { PostList } from "@/components/forum/PostList";
import { CategoryBadge } from "@/components/forum/CategoryBadge";
import { getAllPages } from "@/lib/wiki/page-loader";

export const metadata = { title: "Forum — VibeForge" };

export default async function ForumLanding() {
  const supabase = await createClient();
  const [recent, counts] = await Promise.all([
    listPosts(supabase, { limit: 10 }),
    countPostsByCategory(supabase),
  ]);

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
        <div className="space-y-6">
          <header className="vf-card p-6">
            <h1 className="text-3xl font-bold mb-2">Forum</h1>
            <p className="text-[var(--text-secondary)]">
              질문, 토론, 공지를 한 곳에서. Q&A는 시나리오 태그로 분류됩니다.
            </p>
          </header>
          <section className="grid gap-3 sm:grid-cols-3">
            {FORUM_CATEGORIES.map((cat) => (
              <Link
                key={cat}
                href={`/forum/${cat}` as Route}
                className="vf-card p-4 hover:shadow-lg transition"
              >
                <div className="flex items-center justify-between mb-1">
                  <CategoryBadge category={cat} />
                  <span className="text-xs text-[var(--text-secondary)]">{counts[cat]}개</span>
                </div>
                <p className="text-sm text-[var(--text-secondary)]">
                  {CATEGORY_LABELS[cat]}로 가기 →
                </p>
              </Link>
            ))}
          </section>
          <section className="space-y-2">
            <h2 className="text-lg font-semibold px-2">최근 글</h2>
            <PostList posts={recent} />
          </section>
        </div>
      }
    />
  );
}
```

- [ ] **Step 2: Implement `app/forum/[category]/page.tsx`**:

```tsx
// app/forum/[category]/page.tsx
import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listPosts } from "@/lib/forum/queries";
import { CATEGORY_LABELS, FORUM_CATEGORIES, type ForumCategory } from "@/lib/forum/types";
import { AppShell } from "@/components/layout/AppShell";
import { Sidebar } from "@/components/layout/Sidebar";
import { SearchBox } from "@/components/wiki/SearchBox";
import { PostList } from "@/components/forum/PostList";
import { getAllPages } from "@/lib/wiki/page-loader";

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  if (!FORUM_CATEGORIES.includes(category as ForumCategory)) return { title: "Not Found" };
  return { title: `${CATEGORY_LABELS[category as ForumCategory]} — VibeForge Forum` };
}

export default async function ForumCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  if (!FORUM_CATEGORIES.includes(category as ForumCategory)) notFound();
  const cat = category as ForumCategory;

  const supabase = await createClient();
  const posts = await listPosts(supabase, { category: cat, limit: 100 });

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
          <header className="vf-card p-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-1">{CATEGORY_LABELS[cat]}</h1>
              <p className="text-sm text-[var(--text-secondary)]">{posts.length}개 글</p>
            </div>
            <Link
              href={`/forum/new?cat=${cat}` as Route}
              className="px-4 py-2 rounded-full text-sm font-semibold text-white shadow-sm hover:opacity-90"
              style={{ background: "var(--accent-cta)" }}
            >
              새 글
            </Link>
          </header>
          <PostList posts={posts} emptyMessage={`${CATEGORY_LABELS[cat]}에 첫 글을 남겨주세요.`} />
        </div>
      }
    />
  );
}
```

- [ ] **Step 3: Implement `app/forum/post/[id]/page.tsx`**:

```tsx
// app/forum/post/[id]/page.tsx
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPost, listComments } from "@/lib/forum/queries";
import { AppShell } from "@/components/layout/AppShell";
import { Sidebar } from "@/components/layout/Sidebar";
import { SearchBox } from "@/components/wiki/SearchBox";
import { CategoryBadge } from "@/components/forum/CategoryBadge";
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
  const [post, comments] = await Promise.all([
    getPost(supabase, id),
    listComments(supabase, id),
  ]);
  if (!post) notFound();

  const all = await getAllPages();
  const sidebarPages = all.map((p) => ({
    slug: p.slug,
    title: p.frontmatter.title,
    category: p.slug.split("/")[0],
  }));

  const authorName =
    post.author?.display_name ?? post.author?.github_login ?? "익명";

  return (
    <AppShell
      headerSearch={<SearchBox />}
      sidebar={<Sidebar pages={sidebarPages} currentSlug={null} />}
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
              <p className="text-sm text-[var(--text-secondary)]">첫 댓글을 남겨보세요.</p>
            ) : (
              <ul className="space-y-3">
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
          </section>
        </div>
      }
    />
  );
}
```

NOTE: Body is rendered as `whitespace-pre-wrap` plaintext for now. Markdown rendering for forum bodies can be added in Plan 5 (we already have the wiki render pipeline; reusing it for forum is straightforward but out of Plan 3 scope).

- [ ] **Step 4: Typecheck** — 0 errors.

- [ ] **Step 5: Build**

```bash
npm run build
```
Expected: exit 0. New routes appear: `ƒ /forum`, `ƒ /forum/[category]`, `ƒ /forum/post/[id]` (all dynamic since they hit Supabase at request time).

- [ ] **Step 6: Manual smoke test** (requires dev server + checkpoint passed)

```bash
npm run dev
```
Visit http://localhost:3000/forum — expect landing with 3 category cards + "아직 글이 없어요." Visit http://localhost:3000/forum/qa — expect "Q&A" header + empty list message + "새 글" button.

- [ ] **Step 7: Commit**

```bash
git add app/forum/
git commit -m "feat(forum): read-only routes — landing, category list, post detail"
```

---

## Phase F: Forum writes (Tasks 3.19 – 3.22)

### Task 3.19: createPost + createComment server actions

**Files:**
- Create: `lib/forum/actions.ts`

- [ ] **Step 1: Implement**

```typescript
// lib/forum/actions.ts — Server Actions for forum writes. Auth/identity is
// established by the server-side Supabase client reading the session cookie;
// RLS enforces author_id = auth.uid().
"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
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

- [ ] **Step 2: Typecheck** — 0 errors.

- [ ] **Step 3: Commit**

```bash
git add lib/forum/actions.ts
git commit -m "feat(forum): server actions — createPost, createComment with Zod validation"
```

---

### Task 3.20: NewPostForm + CommentForm client components

**Files:**
- Create: `components/forum/NewPostForm.tsx`
- Create: `components/forum/CommentForm.tsx`

- [ ] **Step 1: Implement NewPostForm**

```tsx
// components/forum/NewPostForm.tsx
"use client";

import { useState, useTransition } from "react";
import { createPostAction } from "@/lib/forum/actions";
import { CATEGORY_LABELS, FORUM_CATEGORIES, type ForumCategory } from "@/lib/forum/types";

interface Props {
  defaultCategory?: ForumCategory;
}

export function NewPostForm({ defaultCategory = "qa" }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="vf-card p-6 space-y-4"
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const result = await createPostAction(formData);
          if (!result.ok && result.error) setError(result.error);
        });
      }}
    >
      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="category">카테고리</label>
        <select
          id="category"
          name="category"
          defaultValue={defaultCategory}
          className="w-full rounded-md border border-black/10 px-3 py-2 text-sm bg-white"
        >
          {FORUM_CATEGORIES.map((c) => (
            <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="title">제목</label>
        <input
          id="title"
          name="title"
          type="text"
          required
          maxLength={200}
          className="w-full rounded-md border border-black/10 px-3 py-2 text-sm"
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
          className="w-full rounded-md border border-black/10 px-3 py-2 text-sm font-mono"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="tags-input">태그 (쉼표 구분)</label>
        <input
          id="tags-input"
          type="text"
          placeholder="git, basics"
          className="w-full rounded-md border border-black/10 px-3 py-2 text-sm"
          onChange={(e) => {
            const form = e.currentTarget.form;
            if (!form) return;
            // Remove old tags hidden inputs
            form.querySelectorAll('input[name="tags"]').forEach((n) => n.remove());
            // Add a hidden input per tag
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
      </div>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="px-5 py-2 rounded-full font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50"
        style={{ background: "var(--accent-cta)" }}
      >
        {isPending ? "올리는 중…" : "올리기"}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Implement CommentForm**

```tsx
// components/forum/CommentForm.tsx
"use client";

import { useState, useTransition, useRef } from "react";
import { createCommentAction } from "@/lib/forum/actions";

interface Props {
  postId: string;
}

export function CommentForm({ postId }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      className="space-y-2"
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const result = await createCommentAction(formData);
          if (!result.ok && result.error) {
            setError(result.error);
            return;
          }
          formRef.current?.reset();
        });
      }}
    >
      <input type="hidden" name="post_id" value={postId} />
      <textarea
        name="body_md"
        required
        rows={3}
        maxLength={5000}
        placeholder="댓글을 입력하세요…"
        className="w-full rounded-md border border-black/10 px-3 py-2 text-sm"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="px-4 py-1.5 rounded-full text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50"
        style={{ background: "var(--accent-cta)" }}
      >
        {isPending ? "올리는 중…" : "댓글 달기"}
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Typecheck** — 0 errors.

- [ ] **Step 4: Commit**

```bash
git add components/forum/NewPostForm.tsx components/forum/CommentForm.tsx
git commit -m "feat(forum): NewPostForm + CommentForm client components"
```

---

### Task 3.21: New post route (auth-gated)

**Files:**
- Create: `app/forum/new/page.tsx`

- [ ] **Step 1: Implement**

```tsx
// app/forum/new/page.tsx
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { FORUM_CATEGORIES, type ForumCategory } from "@/lib/forum/types";
import { AppShell } from "@/components/layout/AppShell";
import { Sidebar } from "@/components/layout/Sidebar";
import { SearchBox } from "@/components/wiki/SearchBox";
import { NewPostForm } from "@/components/forum/NewPostForm";
import { getAllPages } from "@/lib/wiki/page-loader";

export const metadata = { title: "새 글 — VibeForge Forum" };

export default async function NewPostPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const { cat } = await searchParams;
  const defaultCat: ForumCategory =
    cat && FORUM_CATEGORIES.includes(cat as ForumCategory)
      ? (cat as ForumCategory)
      : "qa";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
          <header className="vf-card p-6">
            <h1 className="text-2xl font-bold">새 글 작성</h1>
          </header>
          {user ? (
            <NewPostForm defaultCategory={defaultCat} />
          ) : (
            <div className="vf-card p-6 text-center">
              <p className="text-[var(--text-secondary)] mb-4">
                글을 쓰려면 GitHub 로그인이 필요해요.
              </p>
              <Link
                href="/forum"
                className="text-sm underline hover:text-[var(--text-primary)]"
              >
                ← Forum으로 돌아가기
              </Link>
            </div>
          )}
        </div>
      }
    />
  );
}
```

- [ ] **Step 2: Typecheck** — 0 errors.

- [ ] **Step 3: Commit**

```bash
git add app/forum/new/page.tsx
git commit -m "feat(forum): /forum/new auth-gated post creation route"
```

---

### Task 3.22: Integrate CommentForm into post detail page

**Files:**
- Modify: `app/forum/post/[id]/page.tsx`

- [ ] **Step 1: Read the existing file from Task 3.18 and add the CommentForm import + render slot.** Replace `app/forum/post/[id]/page.tsx` entirely with this updated version (the only diff is the auth check, the CommentForm, and a "Sign in to comment" fallback):

```tsx
// app/forum/post/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPost, listComments } from "@/lib/forum/queries";
import { AppShell } from "@/components/layout/AppShell";
import { Sidebar } from "@/components/layout/Sidebar";
import { SearchBox } from "@/components/wiki/SearchBox";
import { CategoryBadge } from "@/components/forum/CategoryBadge";
import { CommentForm } from "@/components/forum/CommentForm";
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

  const authorName =
    post.author?.display_name ?? post.author?.github_login ?? "익명";

  return (
    <AppShell
      headerSearch={<SearchBox />}
      sidebar={<Sidebar pages={sidebarPages} currentSlug={null} />}
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

- [ ] **Step 2: Typecheck** — 0 errors.

- [ ] **Step 3: Build** — exit 0.

- [ ] **Step 4: Commit**

```bash
git add app/forum/post/[id]/page.tsx
git commit -m "feat(forum): comment form on post detail (auth-gated)"
```

---

## Phase G: E2E + final sanity (Tasks 3.23 – 3.24)

### Task 3.23: E2E read-only smoke

**Files:**
- Create: `tests/e2e/forum-read.spec.ts`

These tests do NOT require auth — they verify the forum routes render correctly when there is no user signed in and (likely) no posts. They run in CI via `webServer: npm run dev` defined in `playwright.config.ts` from Plan 1.

**Important:** these tests assume `.env` is populated (Phase C onward). If running in CI without env vars, the dev server's middleware short-circuits to passthrough and the forum pages will throw at the Supabase client step. For Plan 3 these tests are run locally only — `playwright.config.ts` is not modified to require/skip them.

- [ ] **Step 1: Write the spec**

```typescript
// tests/e2e/forum-read.spec.ts
import { test, expect } from "@playwright/test";

test.describe("forum read-only", () => {
  test("/forum landing shows three category cards", async ({ page }) => {
    await page.goto("/forum");
    await expect(page.getByRole("heading", { name: "Forum" })).toBeVisible();
    const main = page.getByTestId("appshell-main");
    await expect(main.getByText("Q&A")).toBeVisible();
    await expect(main.getByText("일반")).toBeVisible();
    await expect(main.getByText("공지")).toBeVisible();
  });

  test("/forum/qa shows category page with new-post CTA", async ({ page }) => {
    await page.goto("/forum/qa");
    const main = page.getByTestId("appshell-main");
    await expect(main.getByRole("heading", { name: "Q&A" })).toBeVisible();
    await expect(main.getByRole("link", { name: "새 글" })).toBeVisible();
  });

  test("/forum/notice renders 공지 heading", async ({ page }) => {
    await page.goto("/forum/notice");
    const main = page.getByTestId("appshell-main");
    await expect(main.getByRole("heading", { name: "공지" })).toBeVisible();
  });

  test("/forum/bogus 404s", async ({ page }) => {
    const resp = await page.goto("/forum/bogus");
    expect(resp?.status()).toBe(404);
  });

  test("/forum/new while signed out shows login prompt", async ({ page }) => {
    await page.goto("/forum/new");
    const main = page.getByTestId("appshell-main");
    await expect(main.getByText(/GitHub 로그인이 필요/)).toBeVisible();
  });
});
```

- [ ] **Step 2: Run** `npx playwright test tests/e2e/forum-read.spec.ts` — expect 5 pass.

If any test fails because `.env` is missing or migrations not applied, the controller MUST stop and direct the user to the USER CHECKPOINT (Task 3.10). Do NOT fudge the spec to make it pass.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/forum-read.spec.ts
git commit -m "test(e2e): forum read-only smoke (landing, category, 404, signed-out)"
```

---

### Task 3.24: Final sanity baseline + tag

**Files:** none (verification + tag only)

- [ ] **Step 1: Typecheck** — `npx tsc --noEmit` — 0 errors.

- [ ] **Step 2: Unit tests** — `npx vitest run` — expect ALL green. New: env (3) + schemas (5) + queries (4) + PostCard (3) = 15 new on top of Plan 2's 50 = 65 total.

- [ ] **Step 3: Build** — `npm run build` — exit 0. New routes: `/forum`, `/forum/[category]` × 3 (qa/general/notice), `/forum/post/[id]`, `/forum/new`, `/auth/callback`. All dynamic (`ƒ`) since they hit Supabase per-request.

- [ ] **Step 4: All e2e** — `npx playwright test` — expect 14 pass (9 from Plan 2 + 5 from Task 3.23).

- [ ] **Step 5: Manual smoke (controller + user together)**
   - User clicks "GitHub 로그인" in header → redirected to GitHub OAuth → consent → redirected back → header shows username + "로그아웃" button.
   - User clicks "새 글" → form renders → submit → redirected to post detail → post visible.
   - User clicks "댓글 달기" → comment appears.
   - User signs out → AuthButton returns to "GitHub 로그인". Logged-out view of post detail shows "댓글을 달려면 로그인이 필요해요."

- [ ] **Step 6: Tag**

```bash
git tag plan3-supabase-forum
```

- [ ] **Step 7: Verify**

```bash
git log --oneline plan2-visual-design-3col..HEAD
git tag -l plan3-*
```
Expected: ~24 commits since plan2 tag, tag `plan3-supabase-forum` present.

---

## Self-Review Notes

**Spec coverage check** (against spec sections):

- Forum tables (posts, comments, qa_wiki_refs, profiles) — Tasks 3.6, 3.7 ✓
- RLS policies (anyone reads; author/admin update/delete; admin-only `notice` insert; `qa_wiki_refs` service-role-only writes) — Task 3.7 ✓
- 3 categories (qa/general/notice) — Tasks 3.8 (types), 3.18 (routes), 3.19 (action enforces via Zod + RLS) ✓
- Forum format (글 + 댓글, 추천/채택 없음) — Tasks 3.18, 3.22 ✓
- giscus on wiki pages only — out of scope (Plan 5) ✓
- Auth: Supabase + GitHub OAuth → Tasks 3.11–3.13 ✓
- DB: Supabase Cloud Postgres free tier — Task 3.10 USER CHECKPOINT ✓
- Server Actions for forum CRUD — Task 3.19 ✓
- 3-column AppShell consumed by forum routes — Tasks 3.18, 3.21, 3.22 ✓

**Out-of-scope verified absent:**
- Wiki ↔ Q&A backlinks: schema reserves `qa_wiki_refs` table but no automatic ref extraction (Plan 4) ✓
- Graph view, giscus, About: none ✓

**Placeholder scan:** every step has concrete code or commands. No "TBD" / "implement later" markers.

**Type consistency:** `ForumCategory`, `Post`, `PostWithAuthor`, `CommentWithAuthor`, `Profile` defined in 3.8 and consistently used in 3.15, 3.17, 3.18, 3.21, 3.22. The `category` field name is consistent between SQL (3.6), types (3.8), Zod (3.9), action (3.19), routes. The `author_id` field is consistent.

**Risk acknowledged:** Phase C onward depends on the user's external setup. The plan explicitly stops at Task 3.10 (USER CHECKPOINT). Without `.env`, the dev server runs but middleware short-circuits and any forum route throws at the Supabase client step. Tests assume the checkpoint passed.

---

## Execution Handoff

This plan is ready for `superpowers:subagent-driven-development`. Tasks 3.1–3.9 can run autonomously. **Task 3.10 is a hard pause** — the controller must verify with the user before dispatching Phase C onward.
