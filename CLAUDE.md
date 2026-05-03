# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

VibeForge — a Korean-language CS learning + discussion site (Next.js 15 App Router, React 19, TS strict). Site code lives here; **wiki content (markdown vault) is a git submodule mounted at `content/`** from `Yeounil/vibeforge-wiki`. Master spec Phases Plan 1–6 are complete (see `docs/superpowers/plans/` and `docs/superpowers/specs/`).

## Commands

```bash
# First-time setup must include submodules — content/ is empty otherwise
git clone --recurse-submodules <repo>            # or: git submodule update --init --recursive

npm run dev          # next dev (predev rebuilds wiki indexes first)
npm run build        # build:indexes, then next build
npm run build:indexes  # tsx scripts/build-indexes.ts → public/wiki-data/{backlinks,tags,search,manifest}.json
npm run check:content  # validate vault frontmatter / broken wiki-links

npm test             # vitest run (jsdom, *.test.ts(x), excludes tests/e2e)
npm run test:watch
npx vitest run path/to/file.test.ts          # single file
npx vitest run -t "name of test"             # by test name

npm run test:e2e                             # playwright; webServer auto-starts `npm run dev`
npx playwright test tests/e2e/<file>.spec.ts # single spec

npm run lint         # next lint (flat config; ignores content/, archive/, .next/, build-indexes.ts)
npm run typecheck    # tsc --noEmit (strict)
```

## Architecture

### Two-source content model
- **Wiki pages** (`content/data/**/*.md`, git submodule) — markdown with YAML frontmatter (`title`, `tags`, `updated`, optional `aliases`). Linked via `[[Page Name]]` / `[[Name|display]]` wiki-links and `/wiki/<slug>` URLs. Slug = path under `content/data/` minus `.md`.
- **Forum posts/comments** (Supabase `posts`, `comments` tables) — runtime data. Q&A category posts auto-extract wiki refs into `qa_wiki_refs` for two-way backlinks.

Anything that mentions a wiki page in either direction must round-trip through both:
- Wiki → Q&A: `lib/wiki-qa/queries.ts` reads `qa_wiki_refs` for "Related Q&A" on a wiki page.
- Q&A → Wiki: `lib/wiki-qa/extract.ts` parses post bodies; `lib/wiki-qa/sync.ts` writes the join rows. Called from `lib/forum/actions.ts` after every post create/update — failures are logged but **must not** block the post write.

### Wiki rendering pipeline (`lib/wiki/`)
1. `load.ts` walks `content/data/`, parses frontmatter (`frontmatter.ts`).
2. `backlinks.ts` builds an alias map (title + `aliases[]` → canonical slug, lowercased) and a backlinks adjacency list. **The same alias map is shared with `lib/wiki-qa/extract.ts`** — keep them in sync if you change resolution rules.
3. `render.ts` runs the unified pipeline: `remark-parse → remark-gfm → remarkWikiLink (lib/wiki/wiki-link.ts) → remark-rehype → rehype-slug → rehype-autolink-headings → rehype-stringify`.
4. `page-loader.ts` caches the parsed vault in module memory — relies on Next.js's per-process server lifetime. Indexes (`backlinks/tags/search/manifest.json`) are also baked into `public/wiki-data/` at build time by `scripts/build-indexes.ts` (runs in `predev` and `build`).

### Routes
- `/` — landing page
- `/wiki` — vault index (tag cloud, recent)
- `/wiki/[...slug]` — page render + `Backlinks` + `RelatedQA` + `GiscusEmbed` + `TableOfContents`
- `/wiki/tag/[tag]`, `/wiki/graph` (force-graph), `/api/search` (minisearch)
- `/forum`, `/forum/[category]` (`qa | general | notice`), `/forum/post/[id]`, `/forum/new`
- `/about` (rendered from `site-pages/about.md` via `lib/site-pages/loader.ts`)
- `/admin` — admin-only profile/role management; non-admins 404
- `/auth/callback` — Supabase OAuth (GitHub) callback

### Auth + data layer
- **Three Supabase clients, never cross them:**
  - `lib/supabase/browser.ts` — anon key, client components
  - `lib/supabase/server.ts` — anon key + cookie binding, Server Components / Route Handlers / Server Actions
  - `lib/supabase/service.ts` — `SUPABASE_SERVICE_ROLE_KEY`, **server-only**, used to bypass RLS for the `qa_wiki_refs` join sync. Never import from a client component.
- `middleware.ts` runs on every non-asset request and refreshes the session token; without it sessions silently expire after the 1-hour TTL.
- Env validation in `lib/env.ts` — `getPublicEnv()` for browser-safe vars, `getServerEnv()` for service role. Treat the `NEXT_PUBLIC_` prefix as load-bearing: it determines what is bundled to the client.
- RLS migrations: `supabase/migrations/0001_init.sql` (schema + `handle_new_user` trigger that auto-creates `profiles` on auth signup), `0002_rls.sql`, `0003_link_authors_to_profiles.sql`, `0004_lock_role_column.sql` (locks `profiles.role` against client escalation — see commit 86b0203).

### Forum write flow (`lib/forum/actions.ts`)
Server Actions only. Identity comes from the cookie-bound server client (`auth.getUser()`); RLS enforces `author_id = auth.uid()`. Validation via Zod (`lib/forum/schemas.ts`). After write: best-effort `syncWikiRefs` (service-role) → `revalidatePath` for the post, the category, `/forum`, and every affected wiki slug.

### Layout
`components/layout/AppShell.tsx` is the 3-column shell (header, mobile-collapsible sidebar, main, optional right rail). Most pages compose into this. Design tokens live in `lib/design/tokens.css` and `app/globals.css` (CSS variables like `--bg-gradient`, `--accent-cta`, `vf-card`).

## Conventions

- Path alias `@/*` resolves to repo root (configured in both `tsconfig.json` and `vitest.config.ts`).
- Co-located unit tests (`Foo.tsx` next to `Foo.test.tsx`). E2E specs live under `tests/e2e/` and are excluded from vitest.
- `public/wiki-data/` is gitignored — always regenerated by `build:indexes`. Don't hand-edit.
- Wiki content edits go via PR to the `vibeforge-wiki` submodule repo, not this one. Site changes here.
- `archive/` holds the deprecated Quartz scaffold from Plan 1 — excluded from tsc, vitest, eslint. Don't import from it.
- Strict TS, no `allowJs`. Korean (`lang="ko"`) is the primary UI language; copy/comments are mixed Korean/English — match the surrounding file.

## Environment

`.env.example` is the source of truth. Required:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

Optional (graceful no-op when unset):
- `NEXT_PUBLIC_GISCUS_*` (4 vars) — comment widget hides if any is missing
- `NEXT_PUBLIC_WIKI_REPO_URL`
