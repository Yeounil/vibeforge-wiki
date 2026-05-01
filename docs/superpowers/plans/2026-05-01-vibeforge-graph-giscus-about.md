# Plan 5 — Graph view + giscus + About/Contribute Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `/wiki/graph` (force-directed graph), giscus comments on wiki slug pages, and `/about` + `/about/contribute` markdown pages. Closes the IA defined in the master spec.

**Architecture:** Three independent surfaces sharing two new lib modules (`lib/wiki/graph.ts` pure builder, `lib/site-pages/loader.ts` markdown loader) plus two new client components (`GraphView`, `GiscusEmbed`). Reuses the existing `renderBody` pipeline and `page-loader` cache. Best-effort error handling — unset env / missing vault content / build failures degrade gracefully without breaking the page body.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript strict, Vitest + RTL (unit/component), Playwright (E2E), `react-force-graph-2d` (canvas force layout), `gray-matter` (already installed), `unified` markdown pipeline (already installed), giscus client script.

**Spec:** `docs/superpowers/specs/2026-05-01-vibeforge-graph-giscus-about-design.md`

---

## File Map

**New:**
- `lib/wiki/graph.ts` + `lib/wiki/graph.test.ts` — pure `buildGraphData(pages, backlinks)`
- `lib/site-pages/loader.ts` + `lib/site-pages/loader.test.ts` — `loadSitePage(name)`
- `components/wiki/GraphView.tsx` — client, dynamic-import wrapper
- `components/wiki/GiscusEmbed.tsx` + `components/wiki/GiscusEmbed.test.tsx` — client, env-driven script injection
- `app/wiki/graph/page.tsx` — Server Component, full-bleed
- `app/about/page.tsx` — Server Component
- `app/about/contribute/page.tsx` — Server Component
- `site-pages/about.md` — operator bio seed
- `tests/e2e/plan5-surfaces.spec.ts` — 4 read-only e2e tests

**Modified:**
- `lib/wiki/page-loader.ts` — add `getBacklinkMap()` export
- `app/wiki/[...slug]/page.tsx` — append `<GiscusEmbed/>` below `<WikiPage/>`
- `app/wiki/page.tsx` — add "그래프뷰 보기" CTA
- `.env.example` — add 4 `NEXT_PUBLIC_GISCUS_*` vars
- `package.json` — add `react-force-graph-2d`

---

## Task 1: Install react-force-graph-2d

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add the dependency**

```bash
npm install react-force-graph-2d
```

Expected: package.json `dependencies` gains `"react-force-graph-2d": "^1.x.x"`. `package-lock.json` updated. No code changes.

- [ ] **Step 2: Verify install does not break typecheck**

Run: `npm run typecheck`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(plan5): add react-force-graph-2d for /wiki/graph"
```

---

## Task 2: `lib/wiki/graph.ts` — pure graph data builder

**Files:**
- Create: `lib/wiki/graph.ts`
- Test: `lib/wiki/graph.test.ts`

- [ ] **Step 1: Write failing tests**

Create `lib/wiki/graph.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildGraphData } from "./graph";
import type { Page, BacklinkMap } from "./types";

function page(slug: string, title: string): Page {
  return {
    slug,
    filePath: `data/${slug}.md`,
    frontmatter: { title, tags: [], aliases: [], video: null, updated: "2026-05-01" },
    body: "",
  };
}

describe("buildGraphData", () => {
  it("returns empty data for empty vault", () => {
    expect(buildGraphData([], {})).toEqual({ nodes: [], edges: [] });
  });

  it("emits one node per page with no backlinks", () => {
    const pages = [page("a/x", "X"), page("b/y", "Y")];
    const data = buildGraphData(pages, {});
    expect(data.nodes).toEqual([
      { id: "a/x", label: "X", group: "a" },
      { id: "b/y", label: "Y", group: "b" },
    ]);
    expect(data.edges).toEqual([]);
  });

  it("flattens backlinks into source→target edges", () => {
    const pages = [page("a/x", "X"), page("a/y", "Y")];
    const backlinks: BacklinkMap = { "a/x": ["a/y"] };
    const data = buildGraphData(pages, backlinks);
    expect(data.edges).toEqual([{ source: "a/y", target: "a/x" }]);
  });

  it("groups by top-level slug segment", () => {
    const pages = [page("data-handling/index", "Idx"), page("code-flow/loops", "Loops")];
    const data = buildGraphData(pages, {});
    expect(data.nodes.map((n) => n.group)).toEqual(["code-flow", "data-handling"]);
  });

  it("sorts nodes by id and edges by (source, target) for determinism", () => {
    const pages = [page("z", "Z"), page("a", "A"), page("m", "M")];
    const backlinks: BacklinkMap = { z: ["m", "a"], a: ["z"] };
    const data = buildGraphData(pages, backlinks);
    expect(data.nodes.map((n) => n.id)).toEqual(["a", "m", "z"]);
    expect(data.edges).toEqual([
      { source: "a", target: "z" },
      { source: "m", target: "z" },
      { source: "z", target: "a" },
    ]);
  });
});
```

- [ ] **Step 2: Run tests, expect failure**

Run: `npm test -- lib/wiki/graph.test.ts`
Expected: 5 tests, all FAIL (`buildGraphData` not defined).

- [ ] **Step 3: Implement `buildGraphData`**

Create `lib/wiki/graph.ts`:

```ts
import type { Page, BacklinkMap } from "./types";

export interface GraphNode {
  id: string;
  label: string;
  group: string;
}

export interface GraphEdge {
  source: string;
  target: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export function buildGraphData(
  pages: Page[],
  backlinks: BacklinkMap,
): GraphData {
  const nodes: GraphNode[] = pages
    .map((p) => ({
      id: p.slug,
      label: p.frontmatter.title,
      group: p.slug.split("/")[0],
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  const edges: GraphEdge[] = [];
  for (const [target, sources] of Object.entries(backlinks)) {
    for (const source of sources) {
      edges.push({ source, target });
    }
  }
  edges.sort((a, b) => {
    if (a.source !== b.source) return a.source.localeCompare(b.source);
    return a.target.localeCompare(b.target);
  });

  return { nodes, edges };
}
```

- [ ] **Step 4: Run tests, expect pass**

Run: `npm test -- lib/wiki/graph.test.ts`
Expected: 5 PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/wiki/graph.ts lib/wiki/graph.test.ts
git commit -m "feat(plan5): pure buildGraphData builder + 5 unit tests"
```

---

## Task 3: Export `getBacklinkMap()` from page-loader

**Files:**
- Modify: `lib/wiki/page-loader.ts`

- [ ] **Step 1: Add export**

Edit `lib/wiki/page-loader.ts` to add (right after `getAliasMap`):

```ts
export async function getBacklinkMap() {
  const { backlinks } = await ensureCache();
  return backlinks;
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: exits 0.

- [ ] **Step 3: Verify existing tests still green**

Run: `npm test -- lib/wiki`
Expected: all green (no regression).

- [ ] **Step 4: Commit**

```bash
git add lib/wiki/page-loader.ts
git commit -m "feat(plan5): export getBacklinkMap() from page-loader"
```

---

## Task 4: `lib/site-pages/loader.ts` + seed `site-pages/about.md`

**Files:**
- Create: `lib/site-pages/loader.ts`
- Test: `lib/site-pages/loader.test.ts`
- Create: `lib/site-pages/__fixtures__/ok.md`
- Create: `site-pages/about.md`

- [ ] **Step 1: Create fixture**

Create `lib/site-pages/__fixtures__/ok.md`:

```md
---
title: Test Page
---

Hello world.
```

- [ ] **Step 2: Write failing tests**

Create `lib/site-pages/loader.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import path from "node:path";
import { loadSitePage } from "./loader";

const FIXTURE_DIR = path.resolve(__dirname, "__fixtures__");

beforeEach(() => {
  vi.unstubAllEnvs();
});

describe("loadSitePage", () => {
  it("parses a valid site page (frontmatter + body)", async () => {
    const page = await loadSitePage("ok", FIXTURE_DIR);
    expect(page.name).toBe("ok");
    expect(page.frontmatter.title).toBe("Test Page");
    expect(page.body.trim()).toBe("Hello world.");
  });

  it("throws when the file is missing", async () => {
    await expect(loadSitePage("missing", FIXTURE_DIR)).rejects.toThrow(/not found/i);
  });

  it("throws when frontmatter.title is missing", async () => {
    const noTitleDir = path.resolve(__dirname, "__fixtures__");
    // create on the fly via fs in a temp dir
    const fs = await import("node:fs/promises");
    const os = await import("node:os");
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "vf-site-pages-"));
    await fs.writeFile(path.join(tmp, "no-title.md"), "---\nsomething: x\n---\nbody\n", "utf-8");
    await expect(loadSitePage("no-title", tmp)).rejects.toThrow(/title/i);
    await fs.rm(tmp, { recursive: true, force: true });
  });
});
```

- [ ] **Step 3: Run tests, expect failure**

Run: `npm test -- lib/site-pages`
Expected: 3 tests FAIL (loader does not exist).

- [ ] **Step 4: Implement loader**

Create `lib/site-pages/loader.ts`:

```ts
import path from "node:path";
import fs from "node:fs/promises";
import matter from "gray-matter";

export interface SitePage {
  name: string;
  frontmatter: { title: string };
  body: string;
}

const DEFAULT_DIR = path.resolve(process.cwd(), "site-pages");

export async function loadSitePage(
  name: string,
  baseDir: string = DEFAULT_DIR,
): Promise<SitePage> {
  const filePath = path.join(baseDir, `${name}.md`);
  let raw: string;
  try {
    raw = await fs.readFile(filePath, "utf-8");
  } catch {
    throw new Error(`site page not found: ${name} (${filePath})`);
  }
  const { data, content } = matter(raw);
  if (typeof data.title !== "string" || data.title.length === 0) {
    throw new Error(`site page '${name}': frontmatter.title is required`);
  }
  return { name, frontmatter: { title: data.title }, body: content };
}
```

- [ ] **Step 5: Run tests, expect pass**

Run: `npm test -- lib/site-pages`
Expected: 3 PASS.

- [ ] **Step 6: Create about.md seed**

Create `site-pages/about.md`:

```md
---
title: About
---

# VibeForge

VibeForge는 바이브코더가 한 걸음 더 나아가도록 돕는 CS 학습·토론 사이트입니다.

- [Wiki](/wiki) — 카테고리별 정리된 CS 지식
- [Forum](/forum) — Q&A · 일반 · 공지
- [그래프뷰](/wiki/graph) — 위키 페이지 사이의 연결 시각화

## 기여

이 사이트와 위키는 누구나 PR을 보낼 수 있는 오픈 프로젝트입니다.
[기여 가이드](/about/contribute)를 참조하세요.
```

- [ ] **Step 7: Commit**

```bash
git add lib/site-pages site-pages/about.md
git commit -m "feat(plan5): site-pages loader + about.md seed (3 unit tests)"
```

---

## Task 5: `<GiscusEmbed>` + `.env.example`

**Files:**
- Create: `components/wiki/GiscusEmbed.tsx`
- Test: `components/wiki/GiscusEmbed.test.tsx`
- Modify: `.env.example`

- [ ] **Step 1: Update `.env.example`**

Append to `.env.example`:

```
# giscus (Plan 5) — set up at https://giscus.app and paste values here
# When all four are unset, the comment widget is silently omitted
NEXT_PUBLIC_GISCUS_REPO=owner/repo
NEXT_PUBLIC_GISCUS_REPO_ID=R_xxxx
NEXT_PUBLIC_GISCUS_CATEGORY=Page Comments
NEXT_PUBLIC_GISCUS_CATEGORY_ID=DIC_xxxx
```

- [ ] **Step 2: Write failing component tests**

Create `components/wiki/GiscusEmbed.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { GiscusEmbed } from "./GiscusEmbed";

beforeEach(() => {
  vi.unstubAllEnvs();
  cleanup();
});

describe("GiscusEmbed", () => {
  it("renders nothing when env vars are unset", () => {
    vi.stubEnv("NEXT_PUBLIC_GISCUS_REPO", "");
    vi.stubEnv("NEXT_PUBLIC_GISCUS_REPO_ID", "");
    vi.stubEnv("NEXT_PUBLIC_GISCUS_CATEGORY", "");
    vi.stubEnv("NEXT_PUBLIC_GISCUS_CATEGORY_ID", "");
    const { container } = render(<GiscusEmbed pathname="/wiki/x" />);
    expect(container.firstChild).toBeNull();
  });

  it("injects a giscus script with correct data attrs when env is set", () => {
    vi.stubEnv("NEXT_PUBLIC_GISCUS_REPO", "owner/repo");
    vi.stubEnv("NEXT_PUBLIC_GISCUS_REPO_ID", "R_x");
    vi.stubEnv("NEXT_PUBLIC_GISCUS_CATEGORY", "Page Comments");
    vi.stubEnv("NEXT_PUBLIC_GISCUS_CATEGORY_ID", "DIC_x");
    const { container } = render(<GiscusEmbed pathname="/wiki/x" />);
    const script = container.querySelector("script") as HTMLScriptElement | null;
    expect(script).not.toBeNull();
    expect(script!.src).toBe("https://giscus.app/client.js");
    expect(script!.getAttribute("data-repo")).toBe("owner/repo");
    expect(script!.getAttribute("data-repo-id")).toBe("R_x");
    expect(script!.getAttribute("data-category")).toBe("Page Comments");
    expect(script!.getAttribute("data-category-id")).toBe("DIC_x");
    expect(script!.getAttribute("data-mapping")).toBe("pathname");
    expect(script!.getAttribute("data-theme")).toBe("light");
    expect(script!.getAttribute("data-lang")).toBe("ko");
  });

  it("does not inject the script twice on re-render with same pathname", () => {
    vi.stubEnv("NEXT_PUBLIC_GISCUS_REPO", "owner/repo");
    vi.stubEnv("NEXT_PUBLIC_GISCUS_REPO_ID", "R_x");
    vi.stubEnv("NEXT_PUBLIC_GISCUS_CATEGORY", "Page Comments");
    vi.stubEnv("NEXT_PUBLIC_GISCUS_CATEGORY_ID", "DIC_x");
    const { container, rerender } = render(<GiscusEmbed pathname="/wiki/x" />);
    rerender(<GiscusEmbed pathname="/wiki/x" />);
    const scripts = container.querySelectorAll("script");
    expect(scripts.length).toBe(1);
  });
});
```

- [ ] **Step 3: Run tests, expect failure**

Run: `npm test -- components/wiki/GiscusEmbed`
Expected: FAIL (component does not exist).

- [ ] **Step 4: Implement `GiscusEmbed`**

Create `components/wiki/GiscusEmbed.tsx`:

```tsx
"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import type { Route } from "next";

interface Props {
  pathname: string;
}

function readEnv() {
  const repo = process.env.NEXT_PUBLIC_GISCUS_REPO;
  const repoId = process.env.NEXT_PUBLIC_GISCUS_REPO_ID;
  const category = process.env.NEXT_PUBLIC_GISCUS_CATEGORY;
  const categoryId = process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID;
  if (!repo || !repoId || !category || !categoryId) return null;
  return { repo, repoId, category, categoryId };
}

export function GiscusEmbed({ pathname }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const injectedRef = useRef(false);
  const env = readEnv();

  useEffect(() => {
    if (!env) return;
    if (injectedRef.current) return;
    if (!containerRef.current) return;

    const script = document.createElement("script");
    script.src = "https://giscus.app/client.js";
    script.async = true;
    script.crossOrigin = "anonymous";
    script.setAttribute("data-repo", env.repo);
    script.setAttribute("data-repo-id", env.repoId);
    script.setAttribute("data-category", env.category);
    script.setAttribute("data-category-id", env.categoryId);
    script.setAttribute("data-mapping", "pathname");
    script.setAttribute("data-strict", "1");
    script.setAttribute("data-input-position", "bottom");
    script.setAttribute("data-theme", "light");
    script.setAttribute("data-lang", "ko");
    script.setAttribute("data-loading", "lazy");
    containerRef.current.appendChild(script);
    injectedRef.current = true;
  }, [env, pathname]);

  if (!env) return null;

  return (
    <section className="mt-10 vf-card p-6">
      <h2 className="text-lg font-semibold mb-2">댓글</h2>
      <p className="text-sm text-[var(--text-secondary)] mb-4">
        더 본격적인 질문은{" "}
        <Link href={"/forum/qa" as Route} className="underline">
          Q&amp;A
        </Link>
        에서 이어가요.
      </p>
      <div ref={containerRef} data-testid="giscus-mount" />
    </section>
  );
}
```

- [ ] **Step 5: Run tests, expect pass**

Run: `npm test -- components/wiki/GiscusEmbed`
Expected: 3 PASS.

- [ ] **Step 6: Commit**

```bash
git add components/wiki/GiscusEmbed.tsx components/wiki/GiscusEmbed.test.tsx .env.example
git commit -m "feat(plan5): GiscusEmbed component (env-gated, idempotent script inject)"
```

---

## Task 6: `<GraphView>` client wrapper (no unit tests, e2e covers)

**Files:**
- Create: `components/wiki/GraphView.tsx`

- [ ] **Step 1: Implement GraphView**

Create `components/wiki/GraphView.tsx`:

```tsx
"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getCategoryMeta } from "@/lib/design/categories";
import type { GraphData, GraphNode } from "@/lib/wiki/graph";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center text-[var(--text-secondary)]">
      그래프 불러오는 중…
    </div>
  ),
});

interface Props {
  data: GraphData;
}

function resolveColor(group: string): string {
  if (typeof window === "undefined") return "#888";
  const meta = getCategoryMeta(group);
  const computed = getComputedStyle(document.documentElement)
    .getPropertyValue(meta.colorVar)
    .trim();
  return computed || "#888";
}

export function GraphView({ data }: Props) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 800, h: 600 });

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const obs = new ResizeObserver(update);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  if (data.nodes.length < 2) {
    return (
      <div className="vf-card p-8 text-center">
        <p className="text-[var(--text-secondary)]">
          페이지가 더 쌓이면 그래프가 풍성해져요.
        </p>
      </div>
    );
  }

  const graphData = {
    nodes: data.nodes.map((n) => ({ ...n })),
    links: data.edges.map((e) => ({ source: e.source, target: e.target })),
  };

  return (
    <div ref={containerRef} className="w-full h-full" data-testid="graph-canvas">
      <ForceGraph2D
        graphData={graphData}
        width={size.w}
        height={size.h}
        nodeId="id"
        nodeLabel={(n: GraphNode) => n.label}
        nodeColor={(n: GraphNode) => resolveColor(n.group)}
        linkColor={() => "rgba(0,0,0,0.15)"}
        nodeRelSize={6}
        cooldownTicks={100}
        onNodeClick={(n: GraphNode) => router.push(`/wiki/${n.id}` as never)}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add components/wiki/GraphView.tsx
git commit -m "feat(plan5): GraphView client wrapper (dynamic-import force-graph-2d)"
```

---

## Task 7: `/wiki/graph` page

**Files:**
- Create: `app/wiki/graph/page.tsx`

- [ ] **Step 1: Implement the page**

Create `app/wiki/graph/page.tsx`:

```tsx
import Link from "next/link";
import { getAllPages, getBacklinkMap } from "@/lib/wiki/page-loader";
import { buildGraphData } from "@/lib/wiki/graph";
import { listCategories, getCategoryMeta } from "@/lib/design/categories";
import { GraphView } from "@/components/wiki/GraphView";
import { SiteHeader } from "@/components/layout/SiteHeader";

export const metadata = {
  title: "Graph — VibeForge",
};

export const revalidate = 3600;

export default async function GraphPage() {
  let nodeCount = 0;
  let edgeCount = 0;
  let data: Awaited<ReturnType<typeof buildGraphData>> = { nodes: [], edges: [] };
  try {
    const [pages, backlinks] = await Promise.all([getAllPages(), getBacklinkMap()]);
    data = buildGraphData(pages, backlinks);
    nodeCount = data.nodes.length;
    edgeCount = data.edges.length;
  } catch (e) {
    console.error("[graph build failed]", e);
  }

  const presentGroups = new Set(data.nodes.map((n) => n.group));
  const legend = listCategories().filter((c) => presentGroups.has(c.slug));

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-gradient)]">
      <div className="p-4 md:p-6">
        <SiteHeader />
      </div>
      <div className="px-4 md:px-6 pb-3 flex flex-wrap items-center gap-4 text-sm text-[var(--text-secondary)]">
        <Link href="/wiki" className="underline hover:text-[var(--text-primary)]">
          ← Wiki로 돌아가기
        </Link>
        <span>
          {nodeCount} pages · {edgeCount} links
        </span>
        <div className="flex flex-wrap gap-3">
          {legend.map((c) => (
            <span key={c.slug} className="inline-flex items-center gap-1">
              <span
                aria-hidden
                className="inline-block w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: `var(${getCategoryMeta(c.slug).colorVar})` }}
              />
              {c.label}
            </span>
          ))}
        </div>
      </div>
      <div className="flex-1 px-4 md:px-6 pb-6">
        <div className="vf-card h-[calc(100vh-180px)] overflow-hidden">
          <GraphView data={data} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build the project to check the route compiles**

Run: `npm run build`
Expected: build succeeds; route table includes `ƒ /wiki/graph` (or `○ /wiki/graph` if static).

- [ ] **Step 3: Manual smoke (optional, dev mode)**

If dev server is up: visit `http://localhost:3000/wiki/graph`. Confirm canvas renders with nodes (vault has 3 categories so legend should show entries).

- [ ] **Step 4: Commit**

```bash
git add app/wiki/graph/page.tsx
git commit -m "feat(plan5): /wiki/graph full-bleed graph view page"
```

---

## Task 8: `/about` page

**Files:**
- Create: `app/about/page.tsx`

- [ ] **Step 1: Implement the page**

Create `app/about/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { loadSitePage } from "@/lib/site-pages/loader";
import { renderBody } from "@/lib/wiki/render";
import { SiteHeader } from "@/components/layout/SiteHeader";

export const metadata = {
  title: "About — VibeForge",
};

export default async function AboutPage() {
  let html: string;
  try {
    const page = await loadSitePage("about");
    html = await renderBody(page.body, new Map());
  } catch (e) {
    console.error("[about page load failed]", e);
    notFound();
  }

  return (
    <div className="min-h-screen p-4 md:p-6 bg-[var(--bg-gradient)]">
      <SiteHeader />
      <main className="max-w-3xl mx-auto mt-6">
        <article
          className="vf-card p-6 md:p-8 prose max-w-none"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Build to verify**

Run: `npm run build`
Expected: includes `○ /about`. Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add app/about/page.tsx
git commit -m "feat(plan5): /about page renders site-pages/about.md"
```

---

## Task 9: `/about/contribute` page (mirror vault CONTRIBUTING.md)

**Files:**
- Create: `app/about/contribute/page.tsx`

- [ ] **Step 1: Implement the page**

Create `app/about/contribute/page.tsx`:

```tsx
import path from "node:path";
import fs from "node:fs/promises";
import { notFound } from "next/navigation";
import { renderBody } from "@/lib/wiki/render";
import { getAliasMap } from "@/lib/wiki/page-loader";
import { SiteHeader } from "@/components/layout/SiteHeader";

export const metadata = {
  title: "Contribute — VibeForge",
};

export const revalidate = 3600;

const CONTRIBUTING_PATH = path.resolve(process.cwd(), "content", "CONTRIBUTING.md");

export default async function ContributePage() {
  let html: string;
  try {
    const body = await fs.readFile(CONTRIBUTING_PATH, "utf-8");
    const aliasMap = await getAliasMap();
    html = await renderBody(body, aliasMap);
  } catch (e) {
    console.error("[contribute page load failed]", e);
    notFound();
  }

  return (
    <div className="min-h-screen p-4 md:p-6 bg-[var(--bg-gradient)]">
      <SiteHeader />
      <main className="max-w-3xl mx-auto mt-6">
        <article
          className="vf-card p-6 md:p-8 prose max-w-none"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Build to verify**

Run: `npm run build`
Expected: includes `ƒ /about/contribute` (dynamic due to fs read) or `○` if statically prerendered. Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add app/about/contribute/page.tsx
git commit -m "feat(plan5): /about/contribute mirrors vault CONTRIBUTING.md"
```

---

## Task 10: Append `<GiscusEmbed>` to wiki slug page

**Files:**
- Modify: `app/wiki/[...slug]/page.tsx`

- [ ] **Step 1: Add the import and embed**

Edit `app/wiki/[...slug]/page.tsx`:

Add to imports:

```ts
import { GiscusEmbed } from "@/components/wiki/GiscusEmbed";
```

Replace the `main` slot content (currently a single `<WikiPage .../>`) with a fragment that wraps the page and the embed:

```tsx
      main={
        <>
          <WikiPage
            slug={fullSlug}
            frontmatter={bundle.page.frontmatter}
            bodyHtml={bundle.bodyHtml}
            editBaseUrl={EDIT_BASE_URL}
            filePath={bundle.page.filePath}
          />
          <GiscusEmbed pathname={`/wiki/${fullSlug}`} />
        </>
      }
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: exits 0.

- [ ] **Step 3: Verify existing slug-page tests still green**

Run: `npm test`
Expected: all unit/component tests still pass (no regression).

- [ ] **Step 4: Commit**

```bash
git add app/wiki/[...slug]/page.tsx
git commit -m "feat(plan5): mount <GiscusEmbed> below WikiPage on slug routes"
```

---

## Task 11: Add "그래프뷰 보기" CTA on `/wiki`

**Files:**
- Modify: `app/wiki/page.tsx`

- [ ] **Step 1: Add CTA above category list**

Edit `app/wiki/page.tsx` — replace the existing `<header className="vf-card p-6">` block with:

```tsx
          <header className="vf-card p-6 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Wiki</h1>
              <p className="mt-2 text-[var(--text-secondary)]">
                바이브코더가 알아두면 좋은 CS 지식. 카테고리별로 정리되어 있어요.
              </p>
            </div>
            <Link
              href={"/wiki/graph" as Route}
              className="shrink-0 self-center px-4 py-2 rounded-md text-sm font-semibold text-white"
              style={{ background: "var(--accent-cta)" }}
            >
              그래프뷰 →
            </Link>
          </header>
```

(`Link` and `Route` are already imported in this file.)

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add app/wiki/page.tsx
git commit -m "feat(plan5): add 그래프뷰 CTA on /wiki landing"
```

---

## Task 12: E2E smoke + final verification + tag

**Files:**
- Create: `tests/e2e/plan5-surfaces.spec.ts`

- [ ] **Step 1: Write the e2e tests**

Create `tests/e2e/plan5-surfaces.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test.describe("plan 5 surfaces (read-only)", () => {
  test("/wiki/graph renders the canvas mount", async ({ page }) => {
    await page.goto("/wiki/graph");
    await expect(page.getByText("Wiki로 돌아가기")).toBeVisible();
    // GraphView either renders the canvas or the empty-state card
    const canvas = page.getByTestId("graph-canvas");
    const emptyCard = page.getByText("페이지가 더 쌓이면");
    await expect(canvas.or(emptyCard)).toBeVisible();
  });

  test("/about renders h1", async ({ page }) => {
    await page.goto("/about");
    await expect(page.getByRole("heading", { level: 1, name: "VibeForge" })).toBeVisible();
  });

  test("/about/contribute renders the contribute heading", async ({ page }) => {
    await page.goto("/about/contribute");
    await expect(page.getByRole("heading", { name: "기여 규칙" })).toBeVisible();
  });

  test("giscus iframe shows on a wiki slug page when env is set", async ({ page }) => {
    test.skip(
      !process.env.NEXT_PUBLIC_GISCUS_REPO ||
        !process.env.NEXT_PUBLIC_GISCUS_REPO_ID ||
        !process.env.NEXT_PUBLIC_GISCUS_CATEGORY ||
        !process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID,
      "giscus env not set",
    );
    // pick any seed wiki page that exists in the vault
    await page.goto("/wiki/data-handling/what-is-an-index");
    const giscusFrame = page.locator("iframe.giscus-frame");
    await expect(giscusFrame).toBeVisible({ timeout: 10_000 });
  });
});
```

- [ ] **Step 2: Run all unit/component tests**

Run: `npm test`
Expected: all green. Test count = pre-Plan-5 (88) + Plan-5 (5 graph + 3 site-pages + 3 GiscusEmbed = 11) = 99 tests.

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: exits 0.

- [ ] **Step 4: Run e2e**

Run: `npm run test:e2e -- tests/e2e/plan5-surfaces.spec.ts`
Expected: 3 pass + 1 skipped (giscus env-gated). If `npx playwright install chromium` is missing, run that first.

- [ ] **Step 5: Run full e2e suite to verify no regressions**

Run: `npm run test:e2e`
Expected: prior 14 e2e + 4 new = 18 total (giscus skip counts as one of the 4). All green.

- [ ] **Step 6: Commit e2e file**

```bash
git add tests/e2e/plan5-surfaces.spec.ts
git commit -m "test(e2e): plan 5 surfaces (graph, about, contribute, giscus skip-gate)"
```

- [ ] **Step 7: Tag the release**

```bash
git tag plan5-graph-giscus-about
```

- [ ] **Step 8: Summarize for memory update**

Print to chat: counts of new modules, total tests, commits, anything caught during reviews. Controller updates `memory/plan5_complete.md` and `memory/MEMORY.md` to reflect the new tag.

---

## Notes for the executor

- **TDD discipline:** every task that creates a `lib/` module follows red→green→commit. Component tests use RTL with the existing `vitest.setup.ts` (already loads `@testing-library/jest-dom`).
- **`as Route` cast:** Next.js `typedRoutes` requires the cast on dynamic / new dynamic-shaped strings (already a project convention).
- **Vault assumption:** `content/CONTRIBUTING.md` is committed at the vault repo root and is present at runtime. If your dev environment has a missing submodule, run `git submodule update --init` before Task 9.
- **`npm run lint` is broken** in this repo (pre-existing — interactive Next ESLint setup prompt). Do not run it; do not "fix" it. Plan 4 left this untouched intentionally.
- **giscus actual config** (repo-id / category-id) is operator setup, not engineer task. Test 4 of the e2e file is intentionally skipped without env, and CI without secrets will skip it cleanly.
- **Best-effort pattern:** every Server Component on a new surface uses try/catch around any I/O that could plausibly fail (vault read, supabase, etc.) and either falls back to empty data or calls `notFound()` — never lets an exception bubble to a 500.
