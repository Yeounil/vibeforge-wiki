# VibeForge Plan 5 — Graph view + giscus + About/Contribute Design

**Date:** 2026-05-01
**Phase:** 5 of 6 (master spec `2026-04-30-vibeforge-design.md` Phase Plan)
**Predecessor:** Plan 4 (Wiki ↔ Q&A backlinks) — branch `plan3/supabase-forum`, tag `plan4-wiki-qa-backlinks`

## 1. Goal

Close out the IA defined in the master spec by adding the three remaining surfaces:

- `/wiki/graph` — full-bleed force-directed graph of the wiki
- `/wiki/[...slug]` — page-comment thread via giscus (modify, not create)
- `/about` and `/about/contribute` — operator bio + contribution guide mirror

Each surface is independent. They share two small library modules and follow the
**best-effort** pattern established in Plan 4: missing data / failed network /
unset env never breaks the page body.

## 2. Architecture

### Surfaces

```
/wiki/graph                — Server Component, revalidate=3600, full-bleed (no AppShell)
/wiki/[...slug]            — (modify) <GiscusEmbed> appended below WikiPage
/about                     — Server Component, AppShell-less single-column prose
/about/contribute          — Server Component, AppShell-less single-column prose
```

### Shared modules

```
lib/wiki/graph.ts                  buildGraphData(pages, backlinks) → GraphData (pure)
lib/site-pages/loader.ts           loadSitePage(name) → site-pages/<name>.md (gray-matter)
components/wiki/GraphView.tsx      'use client', dynamic import('react-force-graph-2d')
components/wiki/GiscusEmbed.tsx    'use client', script injection guarded by env
```

### Reused from prior plans

- `lib/wiki/render.ts` `renderBody(body, aliasMap)` — markdown → HTML pipeline
- `lib/wiki/page-loader.ts` `getAllPages()`, `getAliasMap()` — vault cache
- `lib/design/categories.ts` — color tokens for graph node `group`

## 3. Module Layout

### New files

```
app/wiki/graph/page.tsx
app/about/page.tsx
app/about/contribute/page.tsx
lib/wiki/graph.ts
lib/wiki/graph.test.ts
lib/site-pages/loader.ts
lib/site-pages/loader.test.ts
components/wiki/GraphView.tsx
components/wiki/GiscusEmbed.tsx
components/wiki/GiscusEmbed.test.tsx
site-pages/about.md           — seed placeholder, operator edits later
tests/e2e/plan5-surfaces.spec.ts
```

### Modified files

```
app/wiki/[...slug]/page.tsx      — append <GiscusEmbed pathname={...}/> below <WikiPage>
app/wiki/page.tsx                — add CTA link to /wiki/graph
lib/wiki/page-loader.ts          — export getBacklinkMap() (graph data needs it)
.env.example                     — NEXT_PUBLIC_GISCUS_REPO|REPO_ID|CATEGORY|CATEGORY_ID
```

### Content layout

- **`site-pages/`** is a NEW directory in the **site repo** (not the vault submodule).
  Holds operator-authored pages that ship with the site (about, future legal pages, etc.).
- **`content/CONTRIBUTING.md`** is in the **vault submodule** (already present).
  Used as the source for `/about/contribute`.

## 4. Data Flow

### A. Graph view — `/wiki/graph`

```
Server Component:
  pages       = await getAllPages()
  backlinks   = await getBacklinkMap()     // new export from page-loader
  data        = buildGraphData(pages, backlinks)   // pure
  → render full-bleed shell with <GraphView data={data}/>

Client (<GraphView data>):
  dynamic(() => import('react-force-graph-2d'), { ssr: false })
  nodeColor   = lookup(node.group → categories.ts colorVar)
  nodeLabel   = page title (hover tooltip)
  onNodeClick = router.push(`/wiki/${node.id}`)
```

`buildGraphData` semantics:
- Every page becomes a node, including isolated pages (no backlinks).
- Edges flatten the backlinks map: for each `target ← [sources...]`, emit
  `{ source, target }` per source. Single direction per edge, no duplicate
  reverse edge.
- `group = slug.split('/')[0]` (top-level category, matches existing
  `categories.ts` keys).
- Output is sorted: nodes by id, edges by `source` then `target`. Deterministic
  for snapshot tests.

ISR: `export const revalidate = 3600` (1h). Vault is build-time content; rare
churn means a cheap cache.

Empty/tiny vault: `nodes.length < 2` → page renders an info card instead of an
empty canvas ("페이지가 더 쌓이면 그래프가 풍성해져요").

### B. giscus — wiki slug pages

```
WikiSlugPage (Server, modified):
  ...existing...
  + <GiscusEmbed pathname={`/wiki/${fullSlug}`}/>   // appended below WikiPage main
```

`<GiscusEmbed>` (client):
1. Read `NEXT_PUBLIC_GISCUS_REPO`, `_REPO_ID`, `_CATEGORY`, `_CATEGORY_ID` from
   `process.env` (Next.js inlines at build).
2. If any is missing → `return null` (silent skip, no UI noise).
3. `useEffect` injects a `<script src="https://giscus.app/client.js" data-*={env} async>`
   into a `ref` container. Ref-guard prevents duplicate injection on re-render.
4. Above the embed: a single-line CTA — "더 본격적인 질문은 [Q&A](/forum/qa)에서".

Script attrs:
```
data-repo, data-repo-id, data-category, data-category-id   ← from env
data-mapping="pathname"
data-strict="1"
data-input-position="bottom"
data-theme="light"
data-lang="ko"
data-loading="lazy"
crossorigin="anonymous"
async
```

### C. About / Contribute

```
/about (Server):
  page = await loadSitePage('about')
  html = await renderBody(page.body, new Map())   // no wikilink resolution for site pages
  → <SiteHeader/><article className="prose">{html}</article>

/about/contribute (Server):
  body     = fs.readFile('content/CONTRIBUTING.md', 'utf-8')
  aliasMap = await getAliasMap()           // vault aliases active
  html     = await renderBody(body, aliasMap)
  → <SiteHeader/><article className="prose">{html}</article>
```

`loadSitePage(name)`:
- Reads `site-pages/<name>.md`.
- Parses with `gray-matter`. Requires `frontmatter.title`. Throws on missing
  file or missing title (caller decides notFound).

Both pages render with **no Sidebar / no RightPanel** — they are marketing
surfaces, not wiki/forum content. Single-column prose with the existing
`SiteHeader` for nav consistency.

## 5. Component Contracts

### `lib/wiki/graph.ts`
```ts
export interface GraphNode { id: string; label: string; group: string }
export interface GraphEdge { source: string; target: string }
export interface GraphData { nodes: GraphNode[]; edges: GraphEdge[] }
export function buildGraphData(pages: Page[], backlinks: BacklinkMap): GraphData
```

### `lib/site-pages/loader.ts`
```ts
export interface SitePage {
  name: string
  frontmatter: { title: string }
  body: string
}
export async function loadSitePage(name: string): Promise<SitePage>
```

### `components/wiki/GraphView.tsx` (client)
```ts
interface Props { data: GraphData }
```

### `components/wiki/GiscusEmbed.tsx` (client)
```ts
interface Props { pathname: string }
```

### `lib/wiki/page-loader.ts` (added export)
```ts
export async function getBacklinkMap(): Promise<BacklinkMap>
```

## 6. Error Handling

| Failure | Behavior |
|---|---|
| Graph data build throws | Server catch → render empty data + error log. Page 200. |
| Graph nodes < 2 | Info card instead of canvas |
| giscus env missing | Component returns null. Wiki body unaffected. |
| giscus script load fail | giscus iframe handles internally. Body unaffected. |
| `content/CONTRIBUTING.md` missing | `/about/contribute` → notFound() (signals broken submodule) |
| `site-pages/about.md` missing | `/about` → notFound() |
| Wikilinks in CONTRIBUTING.md | Resolved via vault aliasMap; broken ones gray-strikethrough (existing render behavior) |

## 7. Testing Strategy

**Unit:** 8 new tests (5 graph, 3 site-pages loader). All pure-function or
fs-mockable. Use existing Vitest setup.

**Component:** 3 new tests for GiscusEmbed (env-missing null, env-present
script attrs, double-mount no-dup). React Testing Library, no real network.
GraphView covered only by E2E because canvas/dynamic-import combo doesn't
unit-test cleanly.

**E2E (Playwright):** 4 new tests in one file:
1. `/wiki/graph` returns 200, canvas-bearing element present
2. `/about` returns 200, h1 visible
3. `/about/contribute` returns 200, expected CONTRIBUTING.md token visible
4. giscus iframe presence on a slug page — `test.skip(!env)`

**Manual smoke (operator):**
- Click a node in `/wiki/graph` → arrives at `/wiki/<slug>`
- Fill `.env` giscus vars → comment round-trip on a wiki slug page

## 8. Out of Scope (v2)

- Graph search / filter / zoom controls (library default zoom only)
- Graph node hover preview cards (label tooltip only)
- giscus dark-mode toggle (fixed `light`)
- giscus + Supabase Auth unification (master spec defers to v2)
- About page operator activity stats (commits/PRs)
- `/about/contribute` PR template auto-embed
- Site-page admin UI (operator edits markdown via git only)

## 9. Open Questions

- Seed vault has ~10 pages → graph is sparse on day 1. Resolves naturally as
  content grows.
- Operator must set up GitHub Discussions and populate `NEXT_PUBLIC_GISCUS_*`
  before giscus surfaces — outside Plan 5's code scope.

## 10. Success Criteria

- [ ] `/wiki/graph` loads, renders nodes, click → wiki page navigation
- [ ] `/about` and `/about/contribute` return 200 with rendered markdown
- [ ] giscus env unset → `/wiki/<slug>` body unaffected
- [ ] giscus env set → comment iframe visible on wiki slug pages
- [ ] All new unit + component tests green; existing 88 unit tests still green
- [ ] Typecheck clean
- [ ] 4 new E2E tests green (giscus one auto-skips without env)

## 11. References

- Master spec: `docs/superpowers/specs/2026-04-30-vibeforge-design.md` §giscus,
  §외부 기여, §IA / Routes, §Phase Plan
- Plan 4 spec/plan: `docs/superpowers/specs/2026-05-01-vibeforge-wiki-qa-backlinks-design.md`,
  `docs/superpowers/plans/2026-05-01-vibeforge-wiki-qa-backlinks.md`
- `react-force-graph-2d`: <https://github.com/vasturiano/react-force-graph>
- giscus: <https://giscus.app>
