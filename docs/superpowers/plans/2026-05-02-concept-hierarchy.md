# Concept Hierarchy in Wiki — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `parent` (single) + `prerequisites` (array) frontmatter fields to wiki pages, build a per-folder hierarchy tree, and surface it in the sidebar (collapsible tree), the `/wiki` index (2-level), and each page (breadcrumb + prereq box + child list). Annotate `concepts/` so the change is visible end-to-end.

**Architecture:** Pure data-flow change. Frontmatter parser keeps raw strings → new `lib/wiki/hierarchy.ts` builds resolved per-folder trees + validates (cycle, cross-folder, missing) → `tree.json` baked at build time alongside existing `backlinks/tags/search/manifest.json` → `page-loader.ts` exposes `getHierarchy()` → server components compute parent chain / children / prereq item lists from the tree and pass them to presentational components. Sidebar becomes a client component for localStorage-persisted expansion state.

**Tech Stack:** Next.js 15 App Router · React 19 · TypeScript strict · vitest + @testing-library/react · Playwright · gray-matter (existing) · alias map from `lib/wiki/backlinks.ts` (existing).

**Spec:** `docs/superpowers/specs/2026-05-02-concept-hierarchy-design.md`

**Branch:** Continue on `plan3/supabase-forum`. No worktree — feature is sequenced (data → build → UI → annotation) with a single end product.

---

## File Map

### Site repo (`D:/Education/`)

| File | Action | Responsibility |
|---|---|---|
| `lib/wiki/types.ts` | Modify | Add `parent: string \| null` and `prerequisites: string[]` to `PageFrontmatter` (raw values; resolved into the tree separately) |
| `lib/wiki/frontmatter.ts` | Modify | Parse the two new optional fields |
| `lib/wiki/hierarchy.ts` | **Create** | `buildHierarchy`, `validateHierarchy`, `getParentChain`, `getChildItems`, `getPrereqItems` |
| `lib/wiki/hierarchy.test.ts` | **Create** | Unit tests for all hierarchy functions |
| `lib/wiki/page-loader.ts` | Modify | Add `getHierarchy()` returning cached `VaultHierarchy` |
| `scripts/build-indexes.ts` | Modify | Build hierarchy, validate, write `tree.json`, exit 1 on validation failure |
| `scripts/check-content.ts` | Modify | Call `validateHierarchy`, surface errors in `CheckResult` |
| `scripts/check-content.test.ts` | Modify | Add hierarchy validation cases |
| `scripts/__fixtures__/check-content/valid-hierarchy/data/...` | **Create** | Fixture pages with valid parent/prereq |
| `scripts/__fixtures__/check-content/cycle/data/...` | **Create** | Cycle A→B→A |
| `scripts/__fixtures__/check-content/cross-folder-parent/data/...` | **Create** | concepts page with entities parent |
| `scripts/__fixtures__/check-content/missing-parent/data/...` | **Create** | parent: ghost |
| `scripts/__fixtures__/check-content/cross-folder-prereq/data/...` | **Create** | concepts page with entities prereq (warn) |
| `scripts/__fixtures__/check-content/self-parent/data/...` | **Create** | parent = self |
| `components/layout/Sidebar.tsx` | Modify | Become a client component; render tree per category; localStorage expansion; flat fallback when tree empty |
| `components/layout/Sidebar.test.tsx` | Modify | Update existing tests to pass empty tree (fallback path); add tree-mode tests |
| `components/wiki/Breadcrumb.tsx` | **Create** | `Wiki › Category › … › current` |
| `components/wiki/Breadcrumb.test.tsx` | **Create** | Renders chain, current is non-link, parent-less case |
| `components/wiki/Prerequisites.tsx` | **Create** | "먼저 보면 좋아요" callout; null when empty |
| `components/wiki/Prerequisites.test.tsx` | **Create** | Renders items, returns null when empty |
| `components/wiki/ChildPages.tsx` | **Create** | "이 개념을 더 깊게 다루는 글" section; null when empty |
| `components/wiki/ChildPages.test.tsx` | **Create** | Renders items, returns null when empty |
| `components/wiki/WikiPage.tsx` | Modify | Compose Breadcrumb (above header), Prerequisites (between video and body), ChildPages (after body, before edit link) |
| `app/wiki/[...slug]/page.tsx` | Modify | Load hierarchy, compute parent chain + child items + prereq items, pass to WikiPage and Sidebar |
| `app/wiki/page.tsx` | Modify | Index card = roots + immediate children inline; "parent 없는" group at the bottom |
| `lib/design/categories.ts` | Modify | Register `concepts/entities/people/sources` so breadcrumb labels render correctly |
| `tests/e2e/wiki-hierarchy.spec.ts` | **Create** | Sidebar tree expansion, breadcrumb, prereq box, child list, localStorage persistence |

### Content repo (`content/` submodule)

| File | Action | Responsibility |
|---|---|---|
| `data/concepts/*.md` | Modify (Phase 2) | Add `parent` and `prerequisites` to relevant pages based on existing `## 관련` and wiki-link analysis |
| `CONTRIBUTING.md` | Modify | Add a paragraph explaining `parent` vs `prerequisites` for authors |

---

## Type & API Reference (locked across all tasks)

These are the canonical signatures. Match them exactly in every task — drift is the #1 source of integration bugs.

```ts
// lib/wiki/types.ts (after Task 1)
export interface PageFrontmatter {
  title: string;
  tags: string[];
  aliases: string[];
  video: string | null;
  updated: string;
  parent: string | null;        // RAW value from YAML (title or alias). Resolved into tree elsewhere.
  prerequisites: string[];      // RAW values from YAML.
}

// lib/wiki/hierarchy.ts (created in Task 2)
export interface HierarchyTree {
  roots: string[];
  children: Record<string, string[]>;
  parents: Record<string, string>;
  prerequisites: Record<string, string[]>;
}

export type VaultHierarchy = Record<string /* topLevelFolder */, HierarchyTree>;

export type ValidationErrorKind =
  | "missing-parent"
  | "cross-folder-parent"
  | "cycle"
  | "self-parent"
  | "missing-prereq"
  | "self-prereq";

export type ValidationWarningKind =
  | "cross-folder-prereq";

export interface ValidationError {
  page: string;       // file path relative to vault, e.g. "data/concepts/foo.md"
  kind: ValidationErrorKind;
  detail: string;
}

export interface ValidationWarning {
  page: string;
  kind: ValidationWarningKind;
  detail: string;
}

export interface ValidationResult {
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export function buildHierarchy(pages: Page[], aliasMap: Map<string, string>): VaultHierarchy;
export function validateHierarchy(pages: Page[], aliasMap: Map<string, string>): ValidationResult;
export function getParentChain(
  tree: VaultHierarchy,
  slug: string,
  titleMap: Record<string, string>
): { slug: string; title: string }[];
export function getChildItems(
  tree: VaultHierarchy,
  slug: string,
  titleMap: Record<string, string>
): { slug: string; title: string }[];
export function getPrereqItems(
  tree: VaultHierarchy,
  slug: string,
  titleMap: Record<string, string>
): { slug: string; title: string }[];

// components/layout/Sidebar.tsx (after Task 7)
export interface SidebarPage {
  slug: string;
  title: string;
  category: string;
}
interface Props {
  pages: SidebarPage[];
  tree: VaultHierarchy;          // {} = fallback to flat
  currentSlug: string | null;
}

// components/wiki/Breadcrumb.tsx (Task 8)
interface BreadcrumbProps {
  category: string;              // e.g. "concepts"
  categoryLabel: string;         // e.g. "Concepts" — typically getCategoryMeta(category).label
  chain: { slug: string | null; title: string }[]; // last entry = current page (slug=null)
}

// components/wiki/Prerequisites.tsx (Task 9)
interface PrerequisitesProps {
  items: { slug: string; title: string }[];
}

// components/wiki/ChildPages.tsx (Task 10)
interface ChildPagesProps {
  items: { slug: string; title: string }[];
}

// components/wiki/WikiPage.tsx (after Task 11)
interface WikiPageProps {
  slug: string;
  frontmatter: PageFrontmatter;
  bodyHtml: string;
  editBaseUrl: string | null;
  filePath: string;
  // NEW:
  category: string;
  categoryLabel: string;
  parentChain: { slug: string; title: string }[];          // [] when page has no parent (current page is appended internally)
  prereqItems: { slug: string; title: string }[];          // [] hides box
  childItems: { slug: string; title: string }[];           // [] hides section
}
```

---

## Task 1: Extend `PageFrontmatter` type and parser

**Files:**
- Modify: `lib/wiki/types.ts`
- Modify: `lib/wiki/frontmatter.ts`

- [ ] **Step 1.1: Add fields to `PageFrontmatter`**

Edit `lib/wiki/types.ts` — replace the entire `PageFrontmatter` interface with:

```ts
export interface PageFrontmatter {
  title: string;
  tags: string[];
  aliases: string[];
  video: string | null;
  updated: string; // ISO date
  parent: string | null;        // RAW value from YAML (title or alias). Resolved into tree elsewhere.
  prerequisites: string[];      // RAW values from YAML.
}
```

The `Page`, `BacklinkMap`, `TagMap` interfaces below stay untouched.

- [ ] **Step 1.2: Parse the two new fields in `parseFrontmatter`**

Edit `lib/wiki/frontmatter.ts`. After the `aliases` line and before the `video` line in the destructuring block, add the two new fields. Replace the function body so it reads:

```ts
export function parseFrontmatter(raw: string): ParseResult {
  const { data, content } = matter(raw);

  if (typeof data.title !== "string" || data.title.length === 0) {
    throw new Error("frontmatter: 'title' is required and must be a non-empty string");
  }
  if (data.updated instanceof Date) {
    data.updated = data.updated.toISOString().slice(0, 10);
  }
  if (typeof data.updated !== "string") {
    throw new Error("frontmatter: 'updated' is required (ISO date string)");
  }

  const tags = Array.isArray(data.tags) ? data.tags.map(String) : [];
  const aliases = Array.isArray(data.aliases) ? data.aliases.map(String) : [];
  const video = typeof data.video === "string" ? data.video : null;
  const parent = typeof data.parent === "string" && data.parent.length > 0 ? data.parent : null;
  const prerequisites = Array.isArray(data.prerequisites)
    ? data.prerequisites.filter((p): p is string => typeof p === "string" && p.length > 0)
    : [];

  return {
    frontmatter: {
      title: data.title,
      tags,
      aliases,
      video,
      updated: data.updated,
      parent,
      prerequisites,
    },
    body: content,
  };
}
```

- [ ] **Step 1.3: Run typecheck — confirm no other code consumes `PageFrontmatter` with the old shape and breaks**

Run:
```bash
cd /d/Education && npm run typecheck 2>&1 | tail -30
```

Expected: PASS. The interface is additive (both new fields default-populated by parser), so existing reads like `frontmatter.title` keep working. If TypeScript complains anywhere about object literal type errors (e.g. test fixtures that build `PageFrontmatter` by hand), fix them by adding `parent: null, prerequisites: []`.

- [ ] **Step 1.4: Commit**

```bash
cd /d/Education && git add lib/wiki/types.ts lib/wiki/frontmatter.ts && git commit -m "feat(wiki): add parent + prerequisites to PageFrontmatter"
```

---

## Task 2: Create `lib/wiki/hierarchy.ts` with TDD

**Files:**
- Create: `lib/wiki/hierarchy.ts`
- Create: `lib/wiki/hierarchy.test.ts`

This task uses strict TDD: write each failing test, watch it fail, then implement the minimal code to pass.

- [ ] **Step 2.1: Write the failing test file with all cases**

Create `lib/wiki/hierarchy.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  buildHierarchy,
  validateHierarchy,
  getParentChain,
  getChildItems,
  getPrereqItems,
} from "./hierarchy";
import { buildAliasMap } from "./backlinks";
import type { Page } from "./types";

function makePage(slug: string, opts: Partial<Page["frontmatter"]> = {}): Page {
  const title = opts.title ?? slug.split("/").pop()!;
  return {
    slug,
    filePath: `data/${slug}.md`,
    body: "",
    frontmatter: {
      title,
      tags: opts.tags ?? [],
      aliases: opts.aliases ?? [],
      video: null,
      updated: "2026-05-02",
      parent: opts.parent ?? null,
      prerequisites: opts.prerequisites ?? [],
    },
  };
}

describe("buildHierarchy", () => {
  it("groups pages into per-folder trees", () => {
    const pages = [
      makePage("concepts/Database"),
      makePage("concepts/DBMS", { parent: "Database" }),
      makePage("entities/Oracle"),
    ];
    const aliases = buildAliasMap(pages);
    const h = buildHierarchy(pages, aliases);
    expect(Object.keys(h).sort()).toEqual(["concepts", "entities"]);
    expect(h.concepts.roots).toEqual(["concepts/Database"]);
    expect(h.concepts.children["concepts/Database"]).toEqual(["concepts/DBMS"]);
    expect(h.concepts.parents["concepts/DBMS"]).toBe("concepts/Database");
    expect(h.entities.roots).toEqual(["entities/Oracle"]);
  });

  it("resolves parent by alias", () => {
    const pages = [
      makePage("concepts/Database", { aliases: ["DB"] }),
      makePage("concepts/DBMS", { parent: "DB" }),
    ];
    const h = buildHierarchy(pages, buildAliasMap(pages));
    expect(h.concepts.children["concepts/Database"]).toEqual(["concepts/DBMS"]);
  });

  it("populates prerequisites map (slug-resolved)", () => {
    const pages = [
      makePage("concepts/A"),
      makePage("concepts/B", { prerequisites: ["A"] }),
    ];
    const h = buildHierarchy(pages, buildAliasMap(pages));
    expect(h.concepts.prerequisites["concepts/B"]).toEqual(["concepts/A"]);
  });

  it("sorts children alphabetically (Korean localeCompare)", () => {
    const pages = [
      makePage("concepts/Root"),
      makePage("concepts/나", { parent: "Root" }),
      makePage("concepts/가", { parent: "Root" }),
      makePage("concepts/다", { parent: "Root" }),
    ];
    const h = buildHierarchy(pages, buildAliasMap(pages));
    expect(h.concepts.children["concepts/Root"]).toEqual([
      "concepts/가",
      "concepts/나",
      "concepts/다",
    ]);
  });

  it("treats unresolved parent strings as if absent (no crash, no edge)", () => {
    const pages = [makePage("concepts/A", { parent: "Ghost" })];
    const h = buildHierarchy(pages, buildAliasMap(pages));
    expect(h.concepts.roots).toEqual(["concepts/A"]);
    expect(h.concepts.parents["concepts/A"]).toBeUndefined();
  });

  it("ignores cross-folder parents (so the tree never spans folders)", () => {
    const pages = [
      makePage("entities/Oracle"),
      makePage("concepts/SQL", { parent: "Oracle" }),
    ];
    const h = buildHierarchy(pages, buildAliasMap(pages));
    expect(h.concepts.roots).toEqual(["concepts/SQL"]);
    expect(h.concepts.parents["concepts/SQL"]).toBeUndefined();
  });
});

describe("validateHierarchy", () => {
  it("returns no errors when everything is consistent", () => {
    const pages = [
      makePage("concepts/A"),
      makePage("concepts/B", { parent: "A" }),
    ];
    const r = validateHierarchy(pages, buildAliasMap(pages));
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
  });

  it("flags missing-parent", () => {
    const pages = [makePage("concepts/A", { parent: "Ghost" })];
    const r = validateHierarchy(pages, buildAliasMap(pages));
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0].kind).toBe("missing-parent");
    expect(r.errors[0].page).toBe("data/concepts/A.md");
    expect(r.errors[0].detail).toContain("Ghost");
  });

  it("flags cross-folder-parent", () => {
    const pages = [
      makePage("entities/Oracle"),
      makePage("concepts/SQL", { parent: "Oracle" }),
    ];
    const r = validateHierarchy(pages, buildAliasMap(pages));
    expect(r.errors.some((e) => e.kind === "cross-folder-parent")).toBe(true);
  });

  it("flags self-parent", () => {
    const pages = [makePage("concepts/A", { parent: "A" })];
    const r = validateHierarchy(pages, buildAliasMap(pages));
    expect(r.errors.some((e) => e.kind === "self-parent")).toBe(true);
  });

  it("flags cycles (A→B→A)", () => {
    const pages = [
      makePage("concepts/A", { parent: "B" }),
      makePage("concepts/B", { parent: "A" }),
    ];
    const r = validateHierarchy(pages, buildAliasMap(pages));
    expect(r.errors.some((e) => e.kind === "cycle")).toBe(true);
  });

  it("flags longer cycles (A→B→C→A)", () => {
    const pages = [
      makePage("concepts/A", { parent: "C" }),
      makePage("concepts/B", { parent: "A" }),
      makePage("concepts/C", { parent: "B" }),
    ];
    const r = validateHierarchy(pages, buildAliasMap(pages));
    expect(r.errors.filter((e) => e.kind === "cycle").length).toBeGreaterThan(0);
  });

  it("flags missing-prereq", () => {
    const pages = [makePage("concepts/A", { prerequisites: ["Ghost"] })];
    const r = validateHierarchy(pages, buildAliasMap(pages));
    expect(r.errors.some((e) => e.kind === "missing-prereq")).toBe(true);
  });

  it("flags self-prereq", () => {
    const pages = [makePage("concepts/A", { prerequisites: ["A"] })];
    const r = validateHierarchy(pages, buildAliasMap(pages));
    expect(r.errors.some((e) => e.kind === "self-prereq")).toBe(true);
  });

  it("warns (does not error) on cross-folder-prereq", () => {
    const pages = [
      makePage("people/Codd"),
      makePage("concepts/SQL", { prerequisites: ["Codd"] }),
    ];
    const r = validateHierarchy(pages, buildAliasMap(pages));
    expect(r.errors).toEqual([]);
    expect(r.warnings.some((w) => w.kind === "cross-folder-prereq")).toBe(true);
  });
});

describe("getParentChain", () => {
  it("returns chain root → parent → ... excluding the current page", () => {
    const pages = [
      makePage("concepts/A"),
      makePage("concepts/B", { parent: "A" }),
      makePage("concepts/C", { parent: "B" }),
    ];
    const tree = buildHierarchy(pages, buildAliasMap(pages));
    const titleMap = { "concepts/A": "A", "concepts/B": "B", "concepts/C": "C" };
    const chain = getParentChain(tree, "concepts/C", titleMap);
    expect(chain).toEqual([
      { slug: "concepts/A", title: "A" },
      { slug: "concepts/B", title: "B" },
    ]);
  });

  it("returns [] for a root (parentless) page", () => {
    const pages = [makePage("concepts/A")];
    const tree = buildHierarchy(pages, buildAliasMap(pages));
    const chain = getParentChain(tree, "concepts/A", { "concepts/A": "A" });
    expect(chain).toEqual([]);
  });

  it("falls back to slug when title is missing", () => {
    const pages = [makePage("concepts/A"), makePage("concepts/B", { parent: "A" })];
    const tree = buildHierarchy(pages, buildAliasMap(pages));
    const chain = getParentChain(tree, "concepts/B", {} /* no titles */);
    expect(chain).toEqual([{ slug: "concepts/A", title: "concepts/A" }]);
  });
});

describe("getChildItems", () => {
  it("returns sorted children with titles", () => {
    const pages = [
      makePage("concepts/A"),
      makePage("concepts/Z-child", { parent: "A", title: "Z-child" }),
      makePage("concepts/A-child", { parent: "A", title: "A-child" }),
    ];
    const tree = buildHierarchy(pages, buildAliasMap(pages));
    const titleMap = {
      "concepts/A-child": "A-child",
      "concepts/Z-child": "Z-child",
    };
    const items = getChildItems(tree, "concepts/A", titleMap);
    expect(items).toEqual([
      { slug: "concepts/A-child", title: "A-child" },
      { slug: "concepts/Z-child", title: "Z-child" },
    ]);
  });

  it("returns [] when no children", () => {
    const pages = [makePage("concepts/A")];
    const tree = buildHierarchy(pages, buildAliasMap(pages));
    expect(getChildItems(tree, "concepts/A", { "concepts/A": "A" })).toEqual([]);
  });
});

describe("getPrereqItems", () => {
  it("returns prereqs with titles", () => {
    const pages = [
      makePage("concepts/A"),
      makePage("concepts/B", { prerequisites: ["A"] }),
    ];
    const tree = buildHierarchy(pages, buildAliasMap(pages));
    const items = getPrereqItems(tree, "concepts/B", {
      "concepts/A": "A",
      "concepts/B": "B",
    });
    expect(items).toEqual([{ slug: "concepts/A", title: "A" }]);
  });

  it("returns [] when no prereqs", () => {
    const pages = [makePage("concepts/A")];
    const tree = buildHierarchy(pages, buildAliasMap(pages));
    expect(getPrereqItems(tree, "concepts/A", { "concepts/A": "A" })).toEqual([]);
  });
});
```

- [ ] **Step 2.2: Run the test, confirm it fails (no implementation yet)**

Run:
```bash
cd /d/Education && npx vitest run lib/wiki/hierarchy.test.ts 2>&1 | tail -20
```

Expected: FAIL with "Failed to load url" or "Cannot find module './hierarchy'".

- [ ] **Step 2.3: Implement `lib/wiki/hierarchy.ts`**

Create `lib/wiki/hierarchy.ts`:

```ts
import type { Page } from "./types";

export interface HierarchyTree {
  roots: string[];
  children: Record<string, string[]>;
  parents: Record<string, string>;
  prerequisites: Record<string, string[]>;
}

export type VaultHierarchy = Record<string /* topLevelFolder */, HierarchyTree>;

export type ValidationErrorKind =
  | "missing-parent"
  | "cross-folder-parent"
  | "cycle"
  | "self-parent"
  | "missing-prereq"
  | "self-prereq";

export type ValidationWarningKind = "cross-folder-prereq";

export interface ValidationError {
  page: string;
  kind: ValidationErrorKind;
  detail: string;
}

export interface ValidationWarning {
  page: string;
  kind: ValidationWarningKind;
  detail: string;
}

export interface ValidationResult {
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

function topFolder(slug: string): string {
  const idx = slug.indexOf("/");
  return idx === -1 ? slug : slug.slice(0, idx);
}

function emptyTree(): HierarchyTree {
  return { roots: [], children: {}, parents: {}, prerequisites: {} };
}

function resolveSameFolder(
  raw: string,
  ownFolder: string,
  aliasMap: Map<string, string>,
): string | null {
  const resolved = aliasMap.get(raw.toLowerCase());
  if (!resolved) return null;
  if (topFolder(resolved) !== ownFolder) return null;
  return resolved;
}

export function buildHierarchy(
  pages: Page[],
  aliasMap: Map<string, string>,
): VaultHierarchy {
  const out: VaultHierarchy = {};

  // Initialize per-folder buckets and seed all pages as nodes
  for (const p of pages) {
    const folder = topFolder(p.slug);
    if (!out[folder]) out[folder] = emptyTree();
    if (!out[folder].children[p.slug]) out[folder].children[p.slug] = [];
  }

  // Wire parent → children + parents
  for (const p of pages) {
    const folder = topFolder(p.slug);
    const tree = out[folder];

    if (p.frontmatter.parent) {
      const parent = resolveSameFolder(p.frontmatter.parent, folder, aliasMap);
      if (parent && parent !== p.slug) {
        if (!tree.children[parent]) tree.children[parent] = [];
        tree.children[parent].push(p.slug);
        tree.parents[p.slug] = parent;
      }
    }

    if (p.frontmatter.prerequisites.length > 0) {
      const slugs: string[] = [];
      for (const raw of p.frontmatter.prerequisites) {
        const resolved = aliasMap.get(raw.toLowerCase());
        // prereqs may be cross-folder (warn-only), but never self
        if (resolved && resolved !== p.slug) slugs.push(resolved);
      }
      if (slugs.length > 0) tree.prerequisites[p.slug] = slugs;
    }
  }

  // Detect cycles: pages whose parent chain loops back to themselves get their
  // parent edge stripped (so the validator can still report the cycle as an
  // error, while traversal terminates here).
  for (const folder of Object.keys(out)) {
    const tree = out[folder];
    for (const slug of Object.keys(tree.parents)) {
      let cursor: string | undefined = tree.parents[slug];
      const seen = new Set<string>([slug]);
      while (cursor) {
        if (seen.has(cursor)) {
          const exParent = tree.parents[slug];
          delete tree.parents[slug];
          if (exParent && tree.children[exParent]) {
            tree.children[exParent] = tree.children[exParent].filter((s) => s !== slug);
          }
          break;
        }
        seen.add(cursor);
        cursor = tree.parents[cursor];
      }
    }
  }

  // Sort children alphabetically (Korean-aware) and compute roots
  for (const folder of Object.keys(out)) {
    const tree = out[folder];
    for (const k of Object.keys(tree.children)) {
      tree.children[k].sort((a, b) => a.localeCompare(b, "ko"));
    }
    tree.roots = Object.keys(tree.children)
      .filter((s) => !(s in tree.parents))
      .sort((a, b) => a.localeCompare(b, "ko"));
  }

  return out;
}

export function validateHierarchy(
  pages: Page[],
  aliasMap: Map<string, string>,
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Build a quick index of which slugs exist (for membership checks)
  const slugSet = new Set(pages.map((p) => p.slug));

  // First pass: per-page parent / prereq integrity
  for (const p of pages) {
    const folder = topFolder(p.slug);
    if (p.frontmatter.parent) {
      const raw = p.frontmatter.parent;
      const resolved = aliasMap.get(raw.toLowerCase());
      if (!resolved || !slugSet.has(resolved)) {
        errors.push({
          page: p.filePath,
          kind: "missing-parent",
          detail: `parent "${raw}" — 알 수 없는 페이지`,
        });
      } else if (resolved === p.slug) {
        errors.push({
          page: p.filePath,
          kind: "self-parent",
          detail: `parent가 자기 자신입니다`,
        });
      } else if (topFolder(resolved) !== folder) {
        errors.push({
          page: p.filePath,
          kind: "cross-folder-parent",
          detail: `parent "${raw}"이 cross-folder (${topFolder(resolved)}/)`,
        });
      }
    }
    for (const raw of p.frontmatter.prerequisites) {
      const resolved = aliasMap.get(raw.toLowerCase());
      if (!resolved || !slugSet.has(resolved)) {
        errors.push({
          page: p.filePath,
          kind: "missing-prereq",
          detail: `prerequisites "${raw}" — 알 수 없는 페이지`,
        });
      } else if (resolved === p.slug) {
        errors.push({
          page: p.filePath,
          kind: "self-prereq",
          detail: `prerequisites가 자기 자신입니다`,
        });
      } else if (topFolder(resolved) !== folder) {
        warnings.push({
          page: p.filePath,
          kind: "cross-folder-prereq",
          detail: `prerequisites "${raw}"이 cross-folder (${topFolder(resolved)}/)`,
        });
      }
    }
  }

  // Second pass: cycle detection over resolved same-folder parent edges only
  const parentOf = new Map<string, string>();
  for (const p of pages) {
    if (!p.frontmatter.parent) continue;
    const folder = topFolder(p.slug);
    const resolved = resolveSameFolder(p.frontmatter.parent, folder, aliasMap);
    if (resolved && resolved !== p.slug) parentOf.set(p.slug, resolved);
  }
  const filePathBySlug = new Map(pages.map((p) => [p.slug, p.filePath]));
  for (const start of parentOf.keys()) {
    let cursor: string | undefined = parentOf.get(start);
    const seen = new Set<string>([start]);
    const path: string[] = [start];
    while (cursor) {
      if (seen.has(cursor)) {
        // Found a cycle. Report it once (anchored at the cycle's lexicographically smallest slug).
        const cycleNodes = [...path, cursor];
        const anchor = [...seen].sort()[0];
        if (start === anchor) {
          errors.push({
            page: filePathBySlug.get(start) ?? start,
            kind: "cycle",
            detail: `사이클 감지 (${cycleNodes.join(" → ")})`,
          });
        }
        break;
      }
      seen.add(cursor);
      path.push(cursor);
      cursor = parentOf.get(cursor);
    }
  }

  return { errors, warnings };
}

export function getParentChain(
  tree: VaultHierarchy,
  slug: string,
  titleMap: Record<string, string>,
): { slug: string; title: string }[] {
  const folder = topFolder(slug);
  const folderTree = tree[folder];
  if (!folderTree) return [];
  const chain: string[] = [];
  let cursor: string | undefined = folderTree.parents[slug];
  while (cursor) {
    chain.unshift(cursor);
    cursor = folderTree.parents[cursor];
  }
  return chain.map((s) => ({ slug: s, title: titleMap[s] ?? s }));
}

export function getChildItems(
  tree: VaultHierarchy,
  slug: string,
  titleMap: Record<string, string>,
): { slug: string; title: string }[] {
  const folder = topFolder(slug);
  const folderTree = tree[folder];
  if (!folderTree) return [];
  const children = folderTree.children[slug] ?? [];
  return children.map((s) => ({ slug: s, title: titleMap[s] ?? s }));
}

export function getPrereqItems(
  tree: VaultHierarchy,
  slug: string,
  titleMap: Record<string, string>,
): { slug: string; title: string }[] {
  const folder = topFolder(slug);
  const folderTree = tree[folder];
  if (!folderTree) return [];
  const items = folderTree.prerequisites[slug] ?? [];
  return items.map((s) => ({ slug: s, title: titleMap[s] ?? s }));
}
```

- [ ] **Step 2.4: Run hierarchy tests until green**

Run:
```bash
cd /d/Education && npx vitest run lib/wiki/hierarchy.test.ts 2>&1 | tail -30
```

Expected: All tests pass. If any fail, read the failure message — most likely cause is a typo in the implementation matching what the test expects (kind name, exact ordering). Fix and rerun until green.

- [ ] **Step 2.5: Run the full unit suite — confirm no regression**

Run:
```bash
cd /d/Education && npm test 2>&1 | tail -20
```

Expected: All tests pass.

- [ ] **Step 2.6: Commit**

```bash
cd /d/Education && git add lib/wiki/hierarchy.ts lib/wiki/hierarchy.test.ts && git commit -m "feat(wiki): hierarchy module (build, validate, lookups)"
```

---

## Task 3: Wire `tree.json` generation into `build-indexes.ts`

**Files:**
- Modify: `scripts/build-indexes.ts`

- [ ] **Step 3.1: Edit `scripts/build-indexes.ts` to build, validate, and write the hierarchy**

Replace the entire file contents with:

```ts
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { loadVault } from "../lib/wiki/load";
import { buildBacklinks, buildAliasMap } from "../lib/wiki/backlinks";
import { buildTagMap } from "../lib/wiki/tags";
import { buildSearchIndex } from "../lib/wiki/search-index";
import { buildHierarchy, validateHierarchy } from "../lib/wiki/hierarchy";

const ROOT = path.resolve(__dirname, "..");
const CONTENT_DIR = path.join(ROOT, "content");
const OUT_DIR = path.join(ROOT, "public", "wiki-data");

interface PageManifestEntry {
  slug: string;
  title: string;
  tags: string[];
  updated: string;
}

async function main() {
  console.log(`[build-indexes] reading vault from ${CONTENT_DIR}`);
  const pages = await loadVault(CONTENT_DIR);
  console.log(`[build-indexes] loaded ${pages.length} pages`);

  const aliasMap = buildAliasMap(pages);

  // Validate hierarchy first — fail fast on errors before producing partial output
  const validation = validateHierarchy(pages, aliasMap);
  for (const w of validation.warnings) {
    console.warn(`[build-indexes] WARN ${w.page}: ${w.detail}`);
  }
  if (validation.errors.length > 0) {
    console.error(`[build-indexes] ${validation.errors.length} hierarchy error(s):`);
    for (const e of validation.errors) {
      console.error(`  ✗ ${e.page}: ${e.detail}`);
    }
    process.exit(1);
  }

  const { backlinks, broken } = buildBacklinks(pages);
  if (broken.length > 0) {
    console.warn(`[build-indexes] ${broken.length} broken wiki-link(s):`);
    for (const b of broken) {
      console.warn(`  ${b.from} → [[${b.target}]]`);
    }
  }

  const tags = buildTagMap(pages);
  const searchIdx = buildSearchIndex(pages);
  const hierarchy = buildHierarchy(pages, aliasMap);

  const manifest: PageManifestEntry[] = pages.map((p) => ({
    slug: p.slug,
    title: p.frontmatter.title,
    tags: p.frontmatter.tags,
    updated: p.frontmatter.updated,
  }));

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(path.join(OUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2));
  await writeFile(path.join(OUT_DIR, "backlinks.json"), JSON.stringify(backlinks));
  await writeFile(path.join(OUT_DIR, "tags.json"), JSON.stringify(tags));
  await writeFile(path.join(OUT_DIR, "search.json"), JSON.stringify(searchIdx));
  await writeFile(path.join(OUT_DIR, "tree.json"), JSON.stringify(hierarchy));

  console.log(`[build-indexes] wrote 5 JSON files to ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 3.2: Run `build:indexes` — confirm green and `tree.json` exists**

Run:
```bash
cd /d/Education && npm run build:indexes 2>&1 | tail -10 && ls -la public/wiki-data/tree.json
```

Expected: `[build-indexes] wrote 5 JSON files`. The `tree.json` file exists. Since no pages have `parent`/`prerequisites` yet, every page should appear under `roots` for its folder.

- [ ] **Step 3.3: Sanity-check `tree.json` content**

Run:
```bash
cd /d/Education && node -e "const t = require('./public/wiki-data/tree.json'); console.log('folders:', Object.keys(t)); console.log('concepts roots:', t.concepts ? t.concepts.roots.length : 0); console.log('first 3:', t.concepts ? t.concepts.roots.slice(0,3) : []);"
```

Expected: prints folder list (`concepts`, `entities`, `people`, `code-flow`, `data-handling`, `how-computers-work`, `sources`) and a positive root count for `concepts` (~50).

- [ ] **Step 3.4: Commit**

```bash
cd /d/Education && git add scripts/build-indexes.ts && git commit -m "feat(wiki): generate tree.json and validate hierarchy at build time"
```

---

## Task 4: Add hierarchy validation to `check-content` (with fixtures)

**Files:**
- Modify: `scripts/check-content.ts`
- Modify: `scripts/check-content.test.ts`
- Create: `scripts/__fixtures__/check-content/valid-hierarchy/data/concepts/parent.md`
- Create: `scripts/__fixtures__/check-content/valid-hierarchy/data/concepts/child.md`
- Create: `scripts/__fixtures__/check-content/cycle/data/concepts/a.md`
- Create: `scripts/__fixtures__/check-content/cycle/data/concepts/b.md`
- Create: `scripts/__fixtures__/check-content/cross-folder-parent/data/entities/oracle.md`
- Create: `scripts/__fixtures__/check-content/cross-folder-parent/data/concepts/sql.md`
- Create: `scripts/__fixtures__/check-content/missing-parent/data/concepts/orphan.md`
- Create: `scripts/__fixtures__/check-content/cross-folder-prereq/data/people/codd.md`
- Create: `scripts/__fixtures__/check-content/cross-folder-prereq/data/concepts/sql.md`
- Create: `scripts/__fixtures__/check-content/self-parent/data/concepts/loop.md`

- [ ] **Step 4.1: Create the six new fixture vaults**

The existing fixture pattern (see `scripts/__fixtures__/check-content/valid/data/db/page-a.md`) is one folder per scenario, each with a `data/<topfolder>/<slug>.md` file containing minimal frontmatter + body. Create:

`scripts/__fixtures__/check-content/valid-hierarchy/data/concepts/parent.md`:
```markdown
---
title: Parent
tags: [test]
updated: 2026-05-02
---
부모.
```

`scripts/__fixtures__/check-content/valid-hierarchy/data/concepts/child.md`:
```markdown
---
title: Child
tags: [test]
updated: 2026-05-02
parent: Parent
---
자식.
```

`scripts/__fixtures__/check-content/cycle/data/concepts/a.md`:
```markdown
---
title: A
tags: [test]
updated: 2026-05-02
parent: B
---
.
```

`scripts/__fixtures__/check-content/cycle/data/concepts/b.md`:
```markdown
---
title: B
tags: [test]
updated: 2026-05-02
parent: A
---
.
```

`scripts/__fixtures__/check-content/cross-folder-parent/data/entities/oracle.md`:
```markdown
---
title: Oracle
tags: [test]
updated: 2026-05-02
---
.
```

`scripts/__fixtures__/check-content/cross-folder-parent/data/concepts/sql.md`:
```markdown
---
title: SQL
tags: [test]
updated: 2026-05-02
parent: Oracle
---
.
```

`scripts/__fixtures__/check-content/missing-parent/data/concepts/orphan.md`:
```markdown
---
title: Orphan
tags: [test]
updated: 2026-05-02
parent: Ghost
---
.
```

`scripts/__fixtures__/check-content/cross-folder-prereq/data/people/codd.md`:
```markdown
---
title: Codd
tags: [test]
updated: 2026-05-02
---
.
```

`scripts/__fixtures__/check-content/cross-folder-prereq/data/concepts/sql.md`:
```markdown
---
title: SQL
tags: [test]
updated: 2026-05-02
prerequisites:
  - Codd
---
.
```

`scripts/__fixtures__/check-content/self-parent/data/concepts/loop.md`:
```markdown
---
title: Loop
tags: [test]
updated: 2026-05-02
parent: Loop
---
.
```

- [ ] **Step 4.2: Add hierarchy validation calls into `runCheck` and convert hierarchy results into `CheckResult`**

Edit `scripts/check-content.ts`. The current code already constructs `pageRecords: Page[]` (line 138) and `aliasMap` (line 150). The current `Page[]` constructor at line 141-148 doesn't populate `parent`/`prerequisites`. Update it.

Find the block (line 138-150):

```ts
  const pageRecords: Page[] = validPages.map((p) => ({
    slug: p.slug,
    filePath: p.relPath,
    frontmatter: {
      title: p.title,
      tags: p.tags,
      aliases: p.aliases,
      video: null,
      updated: p.updated,
    },
    body: p.body,
  }));
  const aliasMap = buildAliasMap(pageRecords);
```

Also update the `validPages.push(...)` block at line 127-135 to capture `parent` and `prerequisites` from `data`:

Replace the original `validPages.push(...)` block with:

```ts
    const parent = typeof data.parent === "string" && data.parent.length > 0 ? data.parent : null;
    const prerequisites = Array.isArray(data.prerequisites)
      ? (data.prerequisites.filter(
          (p) => typeof p === "string" && p.length > 0,
        ) as string[])
      : [];

    validPages.push({
      relPath,
      slug: fileToSlug(relPath),
      title: data.title as string,
      tags: (data.tags as unknown[]).map(String),
      aliases,
      updated: updatedStr!,
      body: parsed.content,
      parent,
      prerequisites,
    });
```

Update the `ParsedPage` interface at line 40-48 to include the two new fields:

```ts
interface ParsedPage {
  relPath: string;
  slug: string;
  title: string;
  tags: string[];
  aliases: string[];
  updated: string;
  body: string;
  parent: string | null;
  prerequisites: string[];
}
```

Update the `pageRecords` construction so the resulting `Page[]` carries `parent` and `prerequisites`:

```ts
  const pageRecords: Page[] = validPages.map((p) => ({
    slug: p.slug,
    filePath: p.relPath,
    frontmatter: {
      title: p.title,
      tags: p.tags,
      aliases: p.aliases,
      video: null,
      updated: p.updated,
      parent: p.parent,
      prerequisites: p.prerequisites,
    },
    body: p.body,
  }));
  const aliasMap = buildAliasMap(pageRecords);
```

Add the import at the top of the file (with the other imports):

```ts
import { validateHierarchy } from "../lib/wiki/hierarchy";
```

After the existing wiki-link broken/repeat block (lines 152-170, the `for (const p of validPages)` loop), but before `return { exitCode: ... }`, insert the hierarchy validation:

```ts
  const hierarchy = validateHierarchy(pageRecords, aliasMap);
  for (const e of hierarchy.errors) {
    errors.push({ file: e.page, message: `[hierarchy] ${e.detail}` });
  }
  for (const w of hierarchy.warnings) {
    warnings.push({ file: w.page, message: `[hierarchy] ${w.detail}` });
  }
```

- [ ] **Step 4.3: Add the hierarchy test cases to `check-content.test.ts`**

Edit `scripts/check-content.test.ts`. Inside the `describe("runCheck", ...)` block, after the existing `test("non-existent vault → exit 2 (config error)", ...)` test, append the following tests:

```ts
  test("valid hierarchy → exit 0", async () => {
    const r = await runCheck(path.join(FIX, "valid-hierarchy"));
    expect(r.exitCode).toBe(0);
    expect(r.errors).toEqual([]);
  });

  test("cycle → exit 1, error mentions '사이클'", async () => {
    const r = await runCheck(path.join(FIX, "cycle"));
    expect(r.exitCode).toBe(1);
    expect(r.errors.some((e) => /사이클/.test(e.message))).toBe(true);
  });

  test("cross-folder parent → exit 1, error mentions 'cross-folder'", async () => {
    const r = await runCheck(path.join(FIX, "cross-folder-parent"));
    expect(r.exitCode).toBe(1);
    expect(r.errors.some((e) => /cross-folder/.test(e.message))).toBe(true);
  });

  test("missing parent → exit 1, error mentions 'Ghost'", async () => {
    const r = await runCheck(path.join(FIX, "missing-parent"));
    expect(r.exitCode).toBe(1);
    expect(r.errors.some((e) => /Ghost/.test(e.message))).toBe(true);
  });

  test("cross-folder prereq → exit 0, warning emitted", async () => {
    const r = await runCheck(path.join(FIX, "cross-folder-prereq"));
    expect(r.exitCode).toBe(0);
    expect(r.warnings.some((w) => /cross-folder/.test(w.message))).toBe(true);
  });

  test("self parent → exit 1, error mentions '자기 자신'", async () => {
    const r = await runCheck(path.join(FIX, "self-parent"));
    expect(r.exitCode).toBe(1);
    expect(r.errors.some((e) => /자기 자신/.test(e.message))).toBe(true);
  });
```

- [ ] **Step 4.4: Run check-content tests**

Run:
```bash
cd /d/Education && npx vitest run scripts/check-content.test.ts 2>&1 | tail -20
```

Expected: All tests pass (existing + new). If any fail, inspect the message — typical issue is a fixture file missing a required field (tags, updated).

- [ ] **Step 4.5: Run `check:content` against the real vault**

Run:
```bash
cd /d/Education && npm run check:content 2>&1 | tail -20
```

Expected: exit 0 (no annotations yet, so no hierarchy errors). Existing wiki-link warnings/errors unchanged.

- [ ] **Step 4.6: Commit**

```bash
cd /d/Education && git add scripts/check-content.ts scripts/check-content.test.ts scripts/__fixtures__/check-content/valid-hierarchy scripts/__fixtures__/check-content/cycle scripts/__fixtures__/check-content/cross-folder-parent scripts/__fixtures__/check-content/missing-parent scripts/__fixtures__/check-content/cross-folder-prereq scripts/__fixtures__/check-content/self-parent && git commit -m "feat(wiki): hierarchy validation in check-content with fixtures"
```

---

## Task 5: Add `getHierarchy()` to `page-loader.ts`

**Files:**
- Modify: `lib/wiki/page-loader.ts`

- [ ] **Step 5.1: Update the cache to load `tree.json`**

Edit `lib/wiki/page-loader.ts`. Replace the entire file with:

```ts
import path from "node:path";
import { readFile } from "node:fs/promises";
import { loadVault } from "./load";
import { buildBacklinks, buildAliasMap } from "./backlinks";
import { renderBody } from "./render";
import type { Page } from "./types";
import type { VaultHierarchy } from "./hierarchy";

const CONTENT_DIR = path.resolve(process.cwd(), "content");
const TREE_JSON_PATH = path.resolve(process.cwd(), "public", "wiki-data", "tree.json");

interface LoadedPageBundle {
  page: Page;
  bodyHtml: string;
  backlinks: string[];
  titleMap: Record<string, string>;
}

let cache: {
  all: Page[];
  titleMap: Record<string, string>;
  aliasMap: Map<string, string>;
  backlinks: Record<string, string[]>;
  hierarchy: VaultHierarchy;
} | null = null;

async function loadHierarchyFromDisk(): Promise<VaultHierarchy> {
  try {
    const raw = await readFile(TREE_JSON_PATH, "utf-8");
    return JSON.parse(raw) as VaultHierarchy;
  } catch {
    // tree.json missing — degrade gracefully to empty (Sidebar/UI fallback paths cover this)
    return {};
  }
}

async function ensureCache() {
  if (cache) return cache;
  const all = await loadVault(CONTENT_DIR);
  const aliasMap = buildAliasMap(all);
  const { backlinks } = buildBacklinks(all);
  const titleMap: Record<string, string> = {};
  for (const p of all) titleMap[p.slug] = p.frontmatter.title;
  const hierarchy = await loadHierarchyFromDisk();
  cache = { all, titleMap, aliasMap, backlinks, hierarchy };
  return cache;
}

export async function loadOnePage(slug: string): Promise<LoadedPageBundle | null> {
  const { all, titleMap, aliasMap, backlinks } = await ensureCache();
  const page = all.find((p) => p.slug === slug);
  if (!page) return null;
  const bodyHtml = await renderBody(page.body, aliasMap);
  return {
    page,
    bodyHtml,
    backlinks: backlinks[slug] ?? [],
    titleMap,
  };
}

export async function getAllSlugs(): Promise<string[]> {
  const { all } = await ensureCache();
  return all.map((p) => p.slug);
}

export async function getAllPages(): Promise<Page[]> {
  const { all } = await ensureCache();
  return all;
}

export async function getAliasMap(): Promise<Map<string, string>> {
  const { aliasMap } = await ensureCache();
  return aliasMap;
}

export async function getBacklinkMap() {
  const { backlinks } = await ensureCache();
  return backlinks;
}

export async function getHierarchy(): Promise<VaultHierarchy> {
  const { hierarchy } = await ensureCache();
  return hierarchy;
}

export async function getTitleMap(): Promise<Record<string, string>> {
  const { titleMap } = await ensureCache();
  return titleMap;
}
```

- [ ] **Step 5.2: Run typecheck**

Run:
```bash
cd /d/Education && npm run typecheck 2>&1 | tail -10
```

Expected: PASS.

- [ ] **Step 5.3: Run `build:indexes` then ad-hoc test the loader**

Run:
```bash
cd /d/Education && npm run build:indexes && node -e "const m = require('tsx/cjs/api'); const { register } = m; register(); const { getHierarchy } = require('./lib/wiki/page-loader'); getHierarchy().then(h => console.log(Object.keys(h)));"
```

Expected: prints folder list (`['concepts', 'entities', 'people', 'code-flow', 'data-handling', 'how-computers-work', 'sources']` or similar). If `tsx/cjs` import is awkward, skip this step — the loader will be exercised by Sidebar tests in later tasks.

- [ ] **Step 5.4: Commit**

```bash
cd /d/Education && git add lib/wiki/page-loader.ts && git commit -m "feat(wiki): expose getHierarchy() and getTitleMap() from page-loader"
```

---

## Task 6: Update existing `Sidebar.test.tsx` to pass empty tree (preparation)

**Files:**
- Modify: `components/layout/Sidebar.test.tsx`

This task does NOT change Sidebar behavior yet. We update existing tests to pass the new prop `tree={}` so they keep working when the prop becomes required in Task 7.

- [ ] **Step 6.1: Update both existing tests to pass `tree={}`**

Edit `components/layout/Sidebar.test.tsx`. Find both `<Sidebar pages={PAGES} currentSlug={...} />` invocations. Update each to add a `tree={{}}` prop:

```tsx
render(<Sidebar pages={PAGES} tree={{}} currentSlug={null} />);
```
and
```tsx
render(<Sidebar pages={PAGES} tree={{}} currentSlug="data-handling/what-is-an-index" />);
```

(Both calls live inside the `describe("Sidebar", ...)` block.)

- [ ] **Step 6.2: Run sidebar test — expect FAIL because the Sidebar component does not yet accept a `tree` prop**

Run:
```bash
cd /d/Education && npx vitest run components/layout/Sidebar.test.tsx 2>&1 | tail -20
```

Expected: TypeScript / runtime warning about unknown prop. We'll fix this in Task 7 — the prop will be added there. Skip this step if it interferes; the next task adds the prop.

(No commit yet — keep this with Task 7.)

---

## Task 7: Make `Sidebar.tsx` a tree-rendering client component

**Files:**
- Modify: `components/layout/Sidebar.tsx`
- Modify: `components/layout/Sidebar.test.tsx` (extend tests)

This is a refactor — the existing two tests (now passing `tree={{}}`) verify the fallback path stays correct.

- [ ] **Step 7.1: Add new test cases for tree mode (TDD — failing first)**

Edit `components/layout/Sidebar.test.tsx`. First, update the existing top-of-file imports:

- Change `import { describe, it, expect } from "vitest";` to `import { describe, it, expect, beforeEach } from "vitest";`
- Change `import { render, screen } from "@testing-library/react";` to `import { render, screen, fireEvent } from "@testing-library/react";`
- Add a new line below the existing imports: `import type { VaultHierarchy } from "@/lib/wiki/hierarchy";`

Then append the following code AFTER the existing `describe("Sidebar", ...)` block (as a sibling describe block, NOT nested):

```tsx
const TREE_PAGES = [
  { slug: "concepts/Database", title: "Database", category: "concepts" },
  { slug: "concepts/DBMS", title: "DBMS", category: "concepts" },
  { slug: "concepts/3-Level-Schema", title: "3-Level Schema", category: "concepts" },
  { slug: "concepts/Standalone", title: "Standalone", category: "concepts" },
];

const TREE: VaultHierarchy = {
  concepts: {
    roots: ["concepts/Database", "concepts/Standalone"],
    children: {
      "concepts/Database": ["concepts/DBMS"],
      "concepts/DBMS": ["concepts/3-Level-Schema"],
      "concepts/3-Level-Schema": [],
      "concepts/Standalone": [],
    },
    parents: {
      "concepts/DBMS": "concepts/Database",
      "concepts/3-Level-Schema": "concepts/DBMS",
    },
    prerequisites: {},
  },
};

describe("Sidebar tree mode", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders nested tree under category and shows disclosure for nodes with children", () => {
    render(
      <Sidebar
        pages={TREE_PAGES}
        tree={TREE}
        currentSlug="concepts/3-Level-Schema"
      />,
    );
    // root with children shows disclosure
    const databaseToggle = screen.getByRole("button", { name: /Database/ });
    expect(databaseToggle).toHaveAttribute("aria-expanded", "true"); // current page is in this subtree
    // current-page link visible (=> ancestors auto-expanded)
    expect(screen.getByRole("link", { name: "3-Level Schema" })).toBeInTheDocument();
    // root without children: no disclosure button
    expect(screen.getByRole("link", { name: "Standalone" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Standalone/ })).toBeNull();
  });

  it("clicking disclosure toggles expansion and persists in localStorage", () => {
    render(<Sidebar pages={TREE_PAGES} tree={TREE} currentSlug={null} />);
    const databaseToggle = screen.getByRole("button", { name: /Database/ });
    expect(databaseToggle).toHaveAttribute("aria-expanded", "false"); // not on current path
    fireEvent.click(databaseToggle);
    expect(databaseToggle).toHaveAttribute("aria-expanded", "true");
    expect(window.localStorage.getItem("vf:sidebar:expanded:concepts/Database")).toBe("1");
  });

  it("falls back to flat list when tree is empty", () => {
    render(<Sidebar pages={TREE_PAGES} tree={{}} currentSlug={null} />);
    // All pages render as flat links, no disclosure
    expect(screen.getByRole("link", { name: "Database" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "DBMS" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "3-Level Schema" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Database/ })).toBeNull();
  });
});
```

- [ ] **Step 7.2: Run tests — confirm new ones fail (component still flat)**

Run:
```bash
cd /d/Education && npx vitest run components/layout/Sidebar.test.tsx 2>&1 | tail -30
```

Expected: New `Sidebar tree mode` tests FAIL (button "Database" not found, etc.). Existing two tests should also fail because the Sidebar doesn't yet accept a `tree` prop (TS error or "ignored prop" warning).

- [ ] **Step 7.3: Rewrite `Sidebar.tsx` as a client component with tree + flat fallback**

Replace `components/layout/Sidebar.tsx` entirely with:

```tsx
"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useMemo, useState } from "react";
import { listCategories, getCategoryMeta } from "@/lib/design/categories";
import type { VaultHierarchy } from "@/lib/wiki/hierarchy";

export interface SidebarPage {
  slug: string;
  title: string;
  category: string;
}

interface Props {
  pages: SidebarPage[];
  tree: VaultHierarchy;
  currentSlug: string | null;
}

const STORAGE_PREFIX = "vf:sidebar:expanded:";

function ancestorsOf(category: string, slug: string, tree: VaultHierarchy): Set<string> {
  const out = new Set<string>();
  const folderTree = tree[category];
  if (!folderTree) return out;
  let cursor: string | undefined = folderTree.parents[slug];
  while (cursor) {
    out.add(cursor);
    cursor = folderTree.parents[cursor];
  }
  return out;
}

function loadStoredToggle(slug: string): boolean | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(STORAGE_PREFIX + slug);
  if (v === "1") return true;
  if (v === "0") return false;
  return null;
}

function persistToggle(slug: string, expanded: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_PREFIX + slug, expanded ? "1" : "0");
}

export function Sidebar({ pages, tree, currentSlug }: Props) {
  const order = listCategories().map((c) => c.slug);
  const titleMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const p of pages) m[p.slug] = p.title;
    return m;
  }, [pages]);

  const byCat = new Map<string, SidebarPage[]>();
  for (const p of pages) {
    if (!byCat.has(p.category)) byCat.set(p.category, []);
    byCat.get(p.category)!.push(p);
  }
  const knownThenRest = [
    ...order.filter((c) => byCat.has(c)),
    ...Array.from(byCat.keys()).filter((c) => !order.includes(c)),
  ];

  // Initial expansion state (synchronous, before hydration): only the current page's
  // ancestor chain is open. localStorage hydration in useEffect adds user-toggled state.
  const initialExpanded = useMemo(() => {
    const s = new Set<string>();
    if (currentSlug) {
      const folder = currentSlug.split("/")[0];
      for (const a of ancestorsOf(folder, currentSlug, tree)) s.add(a);
    }
    return s;
  }, [currentSlug, tree]);

  const [expanded, setExpanded] = useState<Set<string>>(initialExpanded);

  // After mount: layer in any localStorage-persisted toggles (union with current path).
  useEffect(() => {
    setExpanded((prev) => {
      const next = new Set(prev);
      for (const cat of knownThenRest) {
        const folderTree = tree[cat];
        if (!folderTree) continue;
        // Iterate every node that has children — only those have a toggle row
        for (const slug of Object.keys(folderTree.children)) {
          if (folderTree.children[slug].length === 0) continue;
          const stored = loadStoredToggle(slug);
          if (stored === true) next.add(slug);
          if (stored === false) next.delete(slug);
        }
      }
      return next;
    });
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle(slug: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      const willExpand = !next.has(slug);
      if (willExpand) next.add(slug);
      else next.delete(slug);
      persistToggle(slug, willExpand);
      return next;
    });
  }

  function renderTreeNode(slug: string, depth: number, folderTree: NonNullable<VaultHierarchy[string]>): JSX.Element {
    const title = titleMap[slug] ?? slug;
    const isCurrent = slug === currentSlug;
    const children = folderTree.children[slug] ?? [];
    const hasChildren = children.length > 0;
    const isOpen = expanded.has(slug);

    return (
      <li key={slug}>
        <div className="flex items-center gap-1" style={{ paddingLeft: `${depth * 12}px` }}>
          {hasChildren ? (
            <button
              type="button"
              onClick={() => toggle(slug)}
              aria-expanded={isOpen}
              aria-label={`${title} ${isOpen ? "접기" : "펼치기"}`}
              className="w-4 text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs"
            >
              {isOpen ? "▾" : "▸"}
            </button>
          ) : (
            <span aria-hidden className="w-4" />
          )}
          <Link
            href={`/wiki/${slug}` as Route}
            aria-current={isCurrent ? "page" : undefined}
            className={
              isCurrent
                ? "text-[var(--text-primary)] font-medium"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }
          >
            {title}
          </Link>
        </div>
        {hasChildren && isOpen && (
          <ul className="space-y-1 mt-1">
            {children.map((c) => renderTreeNode(c, depth + 1, folderTree))}
          </ul>
        )}
      </li>
    );
  }

  return (
    <nav
      aria-label="Categories"
      className="bg-[var(--surface-card)] rounded-[var(--radius-card)] shadow-[var(--surface-shadow)] p-4"
    >
      {knownThenRest.map((cat) => {
        const meta = getCategoryMeta(cat);
        const folderTree = tree[cat];
        const useTree = folderTree && folderTree.roots.length > 0;
        return (
          <div key={cat} className="mb-4 last:mb-0">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)] mb-2">
              <span
                aria-hidden
                className="inline-block w-2 h-2 rounded-full"
                style={{ backgroundColor: `var(${meta.colorVar})` }}
              />
              {meta.label}
            </div>
            <ul className="space-y-1 text-sm">
              {useTree
                ? folderTree.roots.map((rootSlug) => renderTreeNode(rootSlug, 0, folderTree))
                : byCat.get(cat)!.map((p) => {
                    const isCurrent = p.slug === currentSlug;
                    return (
                      <li key={p.slug} className="pl-4">
                        <Link
                          href={`/wiki/${p.slug}` as Route}
                          aria-current={isCurrent ? "page" : undefined}
                          className={
                            isCurrent
                              ? "text-[var(--text-primary)] font-medium"
                              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                          }
                        >
                          {p.title}
                        </Link>
                      </li>
                    );
                  })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 7.4: Run sidebar tests until green**

Run:
```bash
cd /d/Education && npx vitest run components/layout/Sidebar.test.tsx 2>&1 | tail -30
```

Expected: All tests pass. If the "renders category labels..." test fails because the new tree mode hides labels for the test's flat data (test uses `data-handling`, `how-computers-work`, `code-flow` categories with `tree={{}}`), it should still go through the fallback path. Verify the labels ("데이터 다루기" etc.) appear in the output.

- [ ] **Step 7.5: Run full unit suite — confirm no regressions**

Run:
```bash
cd /d/Education && npm test 2>&1 | tail -10
```

Expected: All tests pass.

- [ ] **Step 7.6: Commit**

```bash
cd /d/Education && git add components/layout/Sidebar.tsx components/layout/Sidebar.test.tsx && git commit -m "feat(wiki): sidebar renders per-folder tree with localStorage expansion"
```

---

## Task 8: Create `Breadcrumb.tsx` (TDD)

**Files:**
- Create: `components/wiki/Breadcrumb.tsx`
- Create: `components/wiki/Breadcrumb.test.tsx`

- [ ] **Step 8.1: Write the failing test**

Create `components/wiki/Breadcrumb.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Breadcrumb } from "./Breadcrumb";

describe("Breadcrumb", () => {
  it("renders Wiki › Category › ancestors › current", () => {
    render(
      <Breadcrumb
        category="concepts"
        categoryLabel="Concepts"
        chain={[
          { slug: "concepts/Database", title: "Database" },
          { slug: "concepts/DBMS", title: "DBMS" },
          { slug: null, title: "3-Level Schema" },
        ]}
      />,
    );
    expect(screen.getByRole("link", { name: "Wiki" })).toHaveAttribute("href", "/wiki");
    expect(screen.getByRole("link", { name: "Concepts" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Database" })).toHaveAttribute("href", "/wiki/concepts/Database");
    expect(screen.getByRole("link", { name: "DBMS" })).toHaveAttribute("href", "/wiki/concepts/DBMS");
    // last entry is current — not a link
    expect(screen.queryByRole("link", { name: "3-Level Schema" })).toBeNull();
    expect(screen.getByText("3-Level Schema")).toBeInTheDocument();
  });

  it("renders Wiki › Category › current for parentless pages", () => {
    render(
      <Breadcrumb
        category="concepts"
        categoryLabel="Concepts"
        chain={[{ slug: null, title: "Standalone" }]}
      />,
    );
    expect(screen.getByRole("link", { name: "Wiki" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Concepts" })).toBeInTheDocument();
    expect(screen.getByText("Standalone")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Standalone" })).toBeNull();
  });
});
```

- [ ] **Step 8.2: Run test — confirm failure**

Run:
```bash
cd /d/Education && npx vitest run components/wiki/Breadcrumb.test.tsx 2>&1 | tail -10
```

Expected: FAIL with "Cannot find module './Breadcrumb'".

- [ ] **Step 8.3: Implement `Breadcrumb.tsx`**

Create `components/wiki/Breadcrumb.tsx`:

```tsx
import Link from "next/link";
import type { Route } from "next";

interface BreadcrumbProps {
  category: string;
  categoryLabel: string;
  chain: { slug: string | null; title: string }[]; // last entry = current page (slug=null)
}

export function Breadcrumb({ category, categoryLabel, chain }: BreadcrumbProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="text-xs text-[var(--text-secondary)] mb-3 overflow-x-auto whitespace-nowrap"
    >
      <Link href="/wiki" className="hover:text-[var(--text-primary)]">
        Wiki
      </Link>
      <span aria-hidden className="mx-1">›</span>
      <Link
        href={`/wiki?category=${encodeURIComponent(category)}` as Route}
        className="hover:text-[var(--text-primary)]"
      >
        {categoryLabel}
      </Link>
      {chain.map((node, idx) => (
        <span key={`${node.slug ?? "current"}-${idx}`}>
          <span aria-hidden className="mx-1">›</span>
          {node.slug ? (
            <Link
              href={`/wiki/${node.slug}` as Route}
              className="hover:text-[var(--text-primary)]"
            >
              {node.title}
            </Link>
          ) : (
            <span className="text-[var(--text-primary)]">{node.title}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
```

(Note: the category link points to `/wiki?category=...` — this query is currently ignored by the index page but reserved for a future filter. Linking to `/wiki` keeps the breadcrumb non-broken.)

- [ ] **Step 8.4: Run test until green**

Run:
```bash
cd /d/Education && npx vitest run components/wiki/Breadcrumb.test.tsx 2>&1 | tail -10
```

Expected: PASS.

- [ ] **Step 8.5: Commit**

```bash
cd /d/Education && git add components/wiki/Breadcrumb.tsx components/wiki/Breadcrumb.test.tsx && git commit -m "feat(wiki): Breadcrumb component"
```

---

## Task 9: Create `Prerequisites.tsx` (TDD)

**Files:**
- Create: `components/wiki/Prerequisites.tsx`
- Create: `components/wiki/Prerequisites.test.tsx`

- [ ] **Step 9.1: Write the failing test**

Create `components/wiki/Prerequisites.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Prerequisites } from "./Prerequisites";

describe("Prerequisites", () => {
  it("renders heading and item links", () => {
    render(
      <Prerequisites
        items={[
          { slug: "concepts/A", title: "A" },
          { slug: "concepts/B", title: "B" },
        ]}
      />,
    );
    expect(screen.getByText("먼저 보면 좋아요")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "A" })).toHaveAttribute("href", "/wiki/concepts/A");
    expect(screen.getByRole("link", { name: "B" })).toHaveAttribute("href", "/wiki/concepts/B");
  });

  it("returns null when items is empty", () => {
    const { container } = render(<Prerequisites items={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
```

- [ ] **Step 9.2: Run test — confirm failure**

Run:
```bash
cd /d/Education && npx vitest run components/wiki/Prerequisites.test.tsx 2>&1 | tail -10
```

Expected: FAIL with "Cannot find module './Prerequisites'".

- [ ] **Step 9.3: Implement `Prerequisites.tsx`**

Create `components/wiki/Prerequisites.tsx`:

```tsx
import Link from "next/link";
import type { Route } from "next";

interface PrerequisitesProps {
  items: { slug: string; title: string }[];
}

export function Prerequisites({ items }: PrerequisitesProps) {
  if (items.length === 0) return null;
  return (
    <aside
      aria-label="Prerequisites"
      className="vf-card p-4 my-6 border-l-4"
      style={{ borderLeftColor: "var(--accent-cta)" }}
    >
      <p className="text-sm font-semibold text-[var(--text-primary)] mb-2">
        먼저 보면 좋아요
      </p>
      <ul className="space-y-1 text-sm">
        {items.map((item) => (
          <li key={item.slug}>
            <Link
              href={`/wiki/${item.slug}` as Route}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              {item.title}
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
```

- [ ] **Step 9.4: Run test until green**

Run:
```bash
cd /d/Education && npx vitest run components/wiki/Prerequisites.test.tsx 2>&1 | tail -10
```

Expected: PASS.

- [ ] **Step 9.5: Commit**

```bash
cd /d/Education && git add components/wiki/Prerequisites.tsx components/wiki/Prerequisites.test.tsx && git commit -m "feat(wiki): Prerequisites callout component"
```

---

## Task 10: Create `ChildPages.tsx` (TDD)

**Files:**
- Create: `components/wiki/ChildPages.tsx`
- Create: `components/wiki/ChildPages.test.tsx`

- [ ] **Step 10.1: Write the failing test**

Create `components/wiki/ChildPages.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChildPages } from "./ChildPages";

describe("ChildPages", () => {
  it("renders heading and items", () => {
    render(
      <ChildPages
        items={[
          { slug: "concepts/X", title: "X" },
          { slug: "concepts/Y", title: "Y" },
        ]}
      />,
    );
    expect(screen.getByRole("heading", { name: "이 개념을 더 깊게 다루는 글" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "X" })).toHaveAttribute("href", "/wiki/concepts/X");
    expect(screen.getByRole("link", { name: "Y" })).toHaveAttribute("href", "/wiki/concepts/Y");
  });

  it("returns null when items is empty", () => {
    const { container } = render(<ChildPages items={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
```

- [ ] **Step 10.2: Run test — confirm failure**

Run:
```bash
cd /d/Education && npx vitest run components/wiki/ChildPages.test.tsx 2>&1 | tail -10
```

Expected: FAIL with "Cannot find module './ChildPages'".

- [ ] **Step 10.3: Implement `ChildPages.tsx`**

Create `components/wiki/ChildPages.tsx`:

```tsx
import Link from "next/link";
import type { Route } from "next";

interface ChildPagesProps {
  items: { slug: string; title: string }[];
}

export function ChildPages({ items }: ChildPagesProps) {
  if (items.length === 0) return null;
  return (
    <section aria-label="Child pages" className="mt-8">
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">
        이 개념을 더 깊게 다루는 글
      </h2>
      <ul className="space-y-1 text-sm">
        {items.map((item) => (
          <li key={item.slug}>
            <Link
              href={`/wiki/${item.slug}` as Route}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              {item.title}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 10.4: Run test until green**

Run:
```bash
cd /d/Education && npx vitest run components/wiki/ChildPages.test.tsx 2>&1 | tail -10
```

Expected: PASS.

- [ ] **Step 10.5: Commit**

```bash
cd /d/Education && git add components/wiki/ChildPages.tsx components/wiki/ChildPages.test.tsx && git commit -m "feat(wiki): ChildPages section component"
```

---

## Task 11: Integrate the three components into `WikiPage.tsx`

**Files:**
- Modify: `components/wiki/WikiPage.tsx`

- [ ] **Step 11.1: Replace `WikiPage.tsx` with the integrated version**

Replace `components/wiki/WikiPage.tsx` entirely with:

```tsx
// components/wiki/WikiPage.tsx
import type { PageFrontmatter } from "@/lib/wiki/types";
import { Breadcrumb } from "./Breadcrumb";
import { Prerequisites } from "./Prerequisites";
import { ChildPages } from "./ChildPages";

interface Props {
  slug: string;
  frontmatter: PageFrontmatter;
  bodyHtml: string;
  /** GitHub URL prefix for "Edit on GitHub" — pass null to hide */
  editBaseUrl: string | null;
  /** filePath relative to wiki repo root, e.g. "data/cat-a/page.md" */
  filePath: string;
  category: string;
  categoryLabel: string;
  parentChain: { slug: string; title: string }[];
  prereqItems: { slug: string; title: string }[];
  childItems: { slug: string; title: string }[];
}

export function WikiPage({
  slug,
  frontmatter,
  bodyHtml,
  editBaseUrl,
  filePath,
  category,
  categoryLabel,
  parentChain,
  prereqItems,
  childItems,
}: Props) {
  const breadcrumbChain = [
    ...parentChain.map((node) => ({ slug: node.slug as string | null, title: node.title })),
    { slug: null as string | null, title: frontmatter.title },
  ];

  return (
    <article className="vf-card p-6 md:p-8">
      <Breadcrumb category={category} categoryLabel={categoryLabel} chain={breadcrumbChain} />
      <header className="mb-6">
        <h1 className="text-3xl font-bold">{frontmatter.title}</h1>
        <div className="text-sm text-[var(--text-secondary)] mt-1">
          updated {frontmatter.updated}
          {frontmatter.tags.length > 0 && (
            <>
              {" · tags: "}
              {frontmatter.tags.map((t, i) => (
                <span key={t}>
                  <a
                    href={`/wiki/tag/${encodeURIComponent(t)}`}
                    className="underline hover:text-[var(--text-primary)]"
                  >
                    {t}
                  </a>
                  {i < frontmatter.tags.length - 1 ? ", " : ""}
                </span>
              ))}
            </>
          )}
        </div>
      </header>

      {frontmatter.video && (
        <div className="mb-6 aspect-video rounded-lg overflow-hidden">
          <iframe
            src={frontmatter.video}
            title="Video"
            className="w-full h-full"
            allowFullScreen
          />
        </div>
      )}

      <Prerequisites items={prereqItems} />

      <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: bodyHtml }} />

      <ChildPages items={childItems} />

      {editBaseUrl && (
        <p className="mt-8 text-sm">
          <a
            href={`${editBaseUrl}/edit/main/${filePath}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            이 페이지 GitHub에서 편집
          </a>
        </p>
      )}

      <p className="mt-2 text-xs text-[var(--text-secondary)] opacity-60">slug: {slug}</p>
    </article>
  );
}
```

- [ ] **Step 11.2: Run typecheck — expect failure on the call site (page.tsx) for missing required props**

Run:
```bash
cd /d/Education && npm run typecheck 2>&1 | tail -10
```

Expected: TypeScript error in `app/wiki/[...slug]/page.tsx` — props `category`, `categoryLabel`, `parentChain`, `prereqItems`, `childItems` not provided. Fix in next task.

(No commit yet — Task 12 closes this.)

---

## Task 12: Plumb hierarchy data through `app/wiki/[...slug]/page.tsx`

**Files:**
- Modify: `app/wiki/[...slug]/page.tsx`

- [ ] **Step 12.1: Update the page to load hierarchy and pass new props**

Replace `app/wiki/[...slug]/page.tsx` entirely with:

```tsx
// app/wiki/[...slug]/page.tsx
import { notFound } from "next/navigation";
import { loadOnePage, getAllSlugs, getAllPages, getHierarchy } from "@/lib/wiki/page-loader";
import {
  getParentChain,
  getChildItems,
  getPrereqItems,
} from "@/lib/wiki/hierarchy";
import { WikiPage } from "@/components/wiki/WikiPage";
import { AppShell } from "@/components/layout/AppShell";
import { Sidebar } from "@/components/layout/Sidebar";
import { RightPanel } from "@/components/layout/RightPanel";
import { TableOfContents } from "@/components/wiki/TableOfContents";
import { Backlinks } from "@/components/wiki/Backlinks";
import { RelatedQA } from "@/components/wiki/RelatedQA";
import { GiscusEmbed } from "@/components/wiki/GiscusEmbed";
import { SearchBox } from "@/components/wiki/SearchBox";
import { getCategoryMeta } from "@/lib/design/categories";
import { createClient } from "@/lib/supabase/server";
import { listPostsByWikiSlug } from "@/lib/wiki-qa/queries";

const EDIT_BASE_URL = process.env.NEXT_PUBLIC_WIKI_REPO_URL ?? null;

export const dynamicParams = true;
export const revalidate = 60;

export async function generateStaticParams() {
  const slugs = await getAllSlugs();
  return slugs.map((slug) => ({
    slug: slug.split("/").map(encodeURIComponent),
  }));
}

export default async function WikiSlugPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const fullSlug = slug.map(decodeURIComponent).join("/");
  const bundle = await loadOnePage(fullSlug);
  if (!bundle) notFound();

  const all = await getAllPages();
  const hierarchy = await getHierarchy();
  const sidebarPages = all.map((p) => ({
    slug: p.slug,
    title: p.frontmatter.title,
    category: p.slug.split("/")[0],
  }));

  const category = fullSlug.split("/")[0];
  const categoryMeta = getCategoryMeta(category);
  const parentChain = getParentChain(hierarchy, fullSlug, bundle.titleMap);
  const childItems = getChildItems(hierarchy, fullSlug, bundle.titleMap);
  const prereqItems = getPrereqItems(hierarchy, fullSlug, bundle.titleMap);

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
      sidebar={<Sidebar pages={sidebarPages} tree={hierarchy} currentSlug={fullSlug} />}
      main={
        <>
          <WikiPage
            slug={fullSlug}
            frontmatter={bundle.page.frontmatter}
            bodyHtml={bundle.bodyHtml}
            editBaseUrl={EDIT_BASE_URL}
            filePath={bundle.page.filePath}
            category={category}
            categoryLabel={categoryMeta.label}
            parentChain={parentChain}
            prereqItems={prereqItems}
            childItems={childItems}
          />
          <GiscusEmbed pathname={`/wiki/${fullSlug}`} />
        </>
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
  const bundle = await loadOnePage(slug.map(decodeURIComponent).join("/"));
  if (!bundle) return { title: "Not Found" };
  return { title: `${bundle.page.frontmatter.title} — VibeForge` };
}
```

- [ ] **Step 12.2: Run typecheck — confirm clean**

Run:
```bash
cd /d/Education && npm run typecheck 2>&1 | tail -10
```

Expected: PASS.

- [ ] **Step 12.3: Run dev server, visit a page, sanity check**

Run:
```bash
cd /d/Education && npm run dev > /tmp/vf-dev.log 2>&1 &
```

Wait briefly for startup, then:
```bash
sleep 8 && curl -s http://localhost:3000/wiki/concepts/SQL | grep -E '(breadcrumb|먼저 보면|이 개념을 더 깊게|Wiki ›)' | head -5
```

Expected: at minimum the breadcrumb HTML appears (`Wiki ›` or `aria-label="Breadcrumb"`). Prereq box and child list should NOT appear yet (no annotations). Stop the dev server:

```bash
kill $(jobs -p) 2>/dev/null; wait 2>/dev/null
```

If dev startup hangs or no port 3000 is available, skip to step 12.4 — the typecheck pass plus the unit tests are sufficient to commit.

- [ ] **Step 12.4: Run full test suite + lint**

Run:
```bash
cd /d/Education && npm test && npm run lint 2>&1 | tail -10
```

Expected: All tests pass, lint clean.

- [ ] **Step 12.5: Commit**

```bash
cd /d/Education && git add app/wiki/[...slug]/page.tsx components/wiki/WikiPage.tsx && git commit -m "feat(wiki): wire breadcrumb, prereqs, child list into WikiPage and slug route"
```

---

## Task 13: Update `/wiki` index to 2-level tree per category

**Files:**
- Modify: `lib/design/categories.ts`
- Modify: `app/wiki/page.tsx`

- [ ] **Step 13.0: Register `concepts/entities/people/sources` in `lib/design/categories.ts`**

The existing `KNOWN` list only contains the legacy `data-handling/code-flow/how-computers-work` categories — the LLM-vault folders (`concepts`, `entities`, `people`, `sources`) fall through `getCategoryMeta`'s default branch and render with the slug itself as the label (so the breadcrumb shows "concepts" instead of "Concepts"). Register them.

Open `lib/design/categories.ts`. Replace the `KNOWN` constant with:

```ts
const KNOWN: CategoryMeta[] = [
  { slug: "concepts", label: "Concepts", colorVar: "--cat-concepts" },
  { slug: "entities", label: "Entities", colorVar: "--cat-entities" },
  { slug: "people", label: "People", colorVar: "--cat-people" },
  { slug: "sources", label: "Sources", colorVar: "--cat-sources" },
  { slug: "data-handling", label: "데이터 다루기", colorVar: "--cat-data-handling" },
  { slug: "how-computers-work", label: "컴퓨터는 어떻게 일하나", colorVar: "--cat-how-computers-work" },
  { slug: "code-flow", label: "코드 흐름", colorVar: "--cat-code-flow" },
];
```

The new color vars (`--cat-concepts` etc.) may not exist yet in `lib/design/tokens.css`. The fallback `--cat-default` defined elsewhere keeps the dot rendering even if a specific var is undefined — visual polish is out of scope for this change.

- [ ] **Step 13.1: Replace `app/wiki/page.tsx` with 2-level tree rendering**

Replace `app/wiki/page.tsx` entirely with:

```tsx
import Link from "next/link";
import type { Route } from "next";
import { getAllPages, getHierarchy, getTitleMap } from "@/lib/wiki/page-loader";
import { listCategories, getCategoryMeta } from "@/lib/design/categories";
import { AppShell } from "@/components/layout/AppShell";
import { Sidebar } from "@/components/layout/Sidebar";
import { SearchBox } from "@/components/wiki/SearchBox";

export const metadata = {
  title: "Wiki — VibeForge",
};

export default async function WikiIndexPage() {
  const all = await getAllPages();
  const hierarchy = await getHierarchy();
  const titleMap = await getTitleMap();

  const sidebarPages = all.map((p) => ({
    slug: p.slug,
    title: p.frontmatter.title,
    category: p.slug.split("/")[0],
  }));

  // Categories present (preserve declared order, then any unknowns alphabetically)
  const knownOrder = listCategories().map((c) => c.slug);
  const allCats = Array.from(new Set(all.map((p) => p.slug.split("/")[0])));
  const orderedCats = [
    ...knownOrder.filter((c) => allCats.includes(c)),
    ...allCats.filter((c) => !knownOrder.includes(c)).sort(),
  ];

  return (
    <AppShell
      headerSearch={<SearchBox />}
      sidebar={<Sidebar pages={sidebarPages} tree={hierarchy} currentSlug={null} />}
      main={
        <div className="space-y-6">
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

          {orderedCats.map((cat) => {
            const meta = getCategoryMeta(cat);
            const folderTree = hierarchy[cat];
            const pagesInCat = all.filter((p) => p.slug.split("/")[0] === cat);

            // Determine roots and orphans (pages without parent)
            const roots = folderTree?.roots ?? pagesInCat.map((p) => p.slug);
            // "orphans" = parent-less pages that are also leaves (no children) and no prereqs
            // Treat them as the "아직 어디에도 못 붙인 개념" group
            const orphans = roots.filter((slug) => {
              const children = folderTree?.children[slug] ?? [];
              const hasChildren = children.length > 0;
              return !hasChildren;
            });
            const realRoots = roots.filter((slug) => {
              const children = folderTree?.children[slug] ?? [];
              return children.length > 0;
            });

            return (
              <section key={cat} className="vf-card p-6">
                <h2 className="flex items-center gap-2 text-xl font-semibold mb-4">
                  <span
                    aria-hidden
                    className="inline-block w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: `var(${meta.colorVar})` }}
                  />
                  {meta.label}
                </h2>

                <ul className="space-y-3">
                  {realRoots.map((rootSlug) => {
                    const children = folderTree?.children[rootSlug] ?? [];
                    return (
                      <li key={rootSlug}>
                        <Link
                          href={`/wiki/${rootSlug}` as Route}
                          className="font-medium text-[var(--text-primary)] hover:underline"
                        >
                          {titleMap[rootSlug] ?? rootSlug}
                        </Link>
                        {children.length > 0 && (
                          <div className="mt-1 text-sm text-[var(--text-secondary)] pl-3">
                            {children.map((c, i) => (
                              <span key={c}>
                                <Link
                                  href={`/wiki/${c}` as Route}
                                  className="hover:text-[var(--text-primary)]"
                                >
                                  {titleMap[c] ?? c}
                                </Link>
                                {i < children.length - 1 ? " · " : ""}
                              </span>
                            ))}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>

                {orphans.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-[var(--border-subtle,rgba(0,0,0,0.08))] text-sm text-[var(--text-secondary)]">
                    {orphans.map((s, i) => (
                      <span key={s}>
                        <Link
                          href={`/wiki/${s}` as Route}
                          className="hover:text-[var(--text-primary)]"
                        >
                          {titleMap[s] ?? s}
                        </Link>
                        {i < orphans.length - 1 ? " · " : ""}
                      </span>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      }
    />
  );
}
```

- [ ] **Step 13.2: Run typecheck**

Run:
```bash
cd /d/Education && npm run typecheck 2>&1 | tail -10
```

Expected: PASS.

- [ ] **Step 13.3: Visual sanity (optional dev server check)**

Start dev server, hit `/wiki`, confirm:
- Concepts card renders
- Without annotations, every page appears in the orphan group (the "parent 없는" stripe at the bottom)
- After Task 14 (annotation), the same page should show real roots with inline children

```bash
cd /d/Education && npm run dev > /tmp/vf-dev.log 2>&1 &
sleep 8
curl -s http://localhost:3000/wiki | grep -c 'class="vf-card'
kill $(jobs -p) 2>/dev/null; wait 2>/dev/null
```

Expected: a positive count of `.vf-card` (header + per-category cards). If dev startup is awkward, skip and rely on E2E in Task 15.

- [ ] **Step 13.4: Commit**

```bash
cd /d/Education && git add lib/design/categories.ts app/wiki/page.tsx && git commit -m "feat(wiki): index page 2-level tree + register vault categories"
```

---

## Task 14: Annotate `concepts/` (Phase 2 — content submodule)

**Files:**
- Modify (in `content/` submodule): `data/concepts/*.md` (subset)
- Modify (in `content/` submodule): `CONTRIBUTING.md`

This task touches the `content/` git submodule (separate repo `Yeounil/vibeforge-wiki`). Work in `D:/Education/content/` and commit + PR there.

- [ ] **Step 14.1: Generate the parent/prereq mapping draft**

For every file in `D:/Education/content/data/concepts/*.md`, read the body — particularly the `## 관련` section and the first-paragraph wiki-links — and produce a markdown table of proposed mappings:

| Page | Proposed `parent` | Proposed `prerequisites` | Reasoning |
|---|---|---|---|

Save this draft as `D:/Education/docs/superpowers/notes/concept-hierarchy-annotation-draft.md` (do NOT commit it to the wiki submodule). Submit it to the user for review.

Hint: pages that consistently appear in others' `## 관련` lists are likely roots. Pages that contain phrases like "X의 한 단원" or "X을 이해하려면" hint at parent/prereq relationships.

- [ ] **Step 14.2: Wait for user approval of mapping draft**

The user will edit the draft to accept/modify proposals. Apply only what they approve.

- [ ] **Step 14.3: Apply the approved mappings to `data/concepts/*.md`**

For each approved row in the draft, edit the corresponding file's frontmatter to add `parent:` and/or `prerequisites:` between the existing `aliases:` (if present) and the closing `---`. Match the style of the file (preserve existing indentation/quoting).

Example: for `data/concepts/3단계 스키마.md`, after `aliases: [3-Level Schema, ANSI/SPARC Architecture, 3단계 스키마 구조]` add:

```yaml
parent: DBMS
prerequisites:
  - 데이터 독립성
```

- [ ] **Step 14.4: Validate with `check:content`**

Run:
```bash
cd /d/Education && npm run check:content 2>&1 | tail -20
```

Expected: exit 0. If validation errors appear (cycle, cross-folder, missing), fix the offending annotation before continuing.

- [ ] **Step 14.5: Rebuild indexes and inspect tree.json**

Run:
```bash
cd /d/Education && npm run build:indexes 2>&1 | tail -5 && node -e "const t = require('./public/wiki-data/tree.json'); console.log('concepts roots:', t.concepts.roots); console.log('Database children:', t.concepts.children['concepts/데이터베이스'] || 'no Database root');"
```

Expected: a small set of root slugs (e.g. `concepts/데이터베이스`, `concepts/데이터마이닝`, `concepts/운영체제 영역`) and visible children under at least one root.

- [ ] **Step 14.6: Add a `parent` / `prerequisites` author guide to `CONTRIBUTING.md`**

Edit `D:/Education/content/CONTRIBUTING.md` (the wiki repo) and append a section. Keep it short and concrete:

```markdown
## 부모와 선수지식

페이지 frontmatter에 두 가지 관계를 표현할 수 있습니다.

- **`parent:`** — 같은 폴더 안에서 "이 페이지는 어떤 큰 개념의 한 단원인가". 단일 값. 예: `parent: DBMS`
- **`prerequisites:`** — "이 페이지를 이해하려면 먼저 알아야 하는 다른 페이지들". 배열. 다른 폴더의 페이지도 가능 (예: 도구·인물). 예:

  ```yaml
  prerequisites:
    - 데이터 독립성
    - 함수적 종속성
  ```

값은 wiki-link와 같은 규칙으로 적습니다 — 페이지의 `title` 또는 `aliases` 중 하나면 자동 해석됩니다.

판단 기준:

- "이게 X의 한 챕터/세부 주제다" → `parent: X`
- "X를 모르면 이 글을 못 읽는다" → `prerequisites: [X, ...]`

둘 다 해당하면 둘 다 적습니다. `parent`는 같은 top-level 폴더 안의 페이지여야 합니다 (cross-folder는 빌드 실패).
```

- [ ] **Step 14.7: Commit to the wiki submodule and open a PR**

```bash
cd /d/Education/content && git add data/concepts/ CONTRIBUTING.md && git status
```

If the file list looks correct, commit:

```bash
cd /d/Education/content && git commit -m "data: annotate concepts/ with parent and prerequisites + author guide"
```

Then push and open a PR against the upstream `Yeounil/vibeforge-wiki` repo. (Skip the push step if working locally only.)

- [ ] **Step 14.8: Bump the submodule pointer in the site repo**

Back in `D:/Education/`:

```bash
cd /d/Education && git add content && git commit -m "chore: bump wiki submodule with concepts hierarchy annotations"
```

(This commit only updates the submodule SHA pointer, not the content repo itself.)

- [ ] **Step 14.9: Sanity-rebuild the site repo + run all tests**

```bash
cd /d/Education && npm run build:indexes && npm test && npm run typecheck 2>&1 | tail -10
```

Expected: all green.

---

## Task 15: E2E test for the integrated experience

**Files:**
- Create: `tests/e2e/wiki-hierarchy.spec.ts`

This task assumes Task 14 produced annotations for at least: `concepts/데이터베이스` (root), `concepts/DBMS` (child of Database), `concepts/3단계 스키마` (child of DBMS, with `prerequisites: [데이터 독립성]`), `concepts/데이터 독립성` (in concepts).

If the actual annotation chosen different page names, adjust the slugs / titles in the spec to match.

- [ ] **Step 15.1: Write the spec**

Create `tests/e2e/wiki-hierarchy.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test.describe("wiki hierarchy", () => {
  test("sidebar tree expands and navigates from Database → DBMS", async ({ page }) => {
    await page.goto("/wiki/concepts/%EB%8D%B0%EC%9D%B4%ED%84%B0%EB%B2%A0%EC%9D%B4%EC%8A%A4");
    // Database is current → its (potentially empty) tree row is visible.
    // Click a sibling root or expand to find DBMS.
    const sidebar = page.getByRole("navigation", { name: "Categories" });
    // DBMS link is a child of Database; auto-expansion exposes it when on Database
    // page (DBMS itself isn't current, but its parent Database IS the current page,
    // which means *Database's* children — including DBMS — are rendered when the
    // user expands Database). Toggle Database open.
    const databaseToggle = sidebar.getByRole("button", { name: /데이터베이스/ });
    if ((await databaseToggle.getAttribute("aria-expanded")) !== "true") {
      await databaseToggle.click();
    }
    const dbmsLink = sidebar.getByRole("link", { name: "DBMS" });
    await expect(dbmsLink).toBeVisible();
    await dbmsLink.click();
    await page.waitForURL(/\/wiki\/concepts\/DBMS$/);
  });

  test("DBMS page shows breadcrumb Wiki › Concepts › 데이터베이스 › DBMS", async ({ page }) => {
    await page.goto("/wiki/concepts/DBMS");
    const breadcrumb = page.getByRole("navigation", { name: "Breadcrumb" });
    await expect(breadcrumb.getByRole("link", { name: "Wiki" })).toBeVisible();
    await expect(breadcrumb.getByRole("link", { name: "데이터베이스" })).toBeVisible();
    // current page is non-link text
    await expect(breadcrumb.getByText("DBMS", { exact: true })).toBeVisible();
  });

  test("3단계 스키마 page shows prereq box and links to 데이터 독립성", async ({ page }) => {
    await page.goto("/wiki/concepts/3%EB%8B%A8%EA%B3%84%20%EC%8A%A4%ED%82%A4%EB%A7%88");
    const prereq = page.getByRole("complementary", { name: "Prerequisites" });
    await expect(prereq).toBeVisible();
    await expect(prereq.getByText("먼저 보면 좋아요")).toBeVisible();
    const link = prereq.getByRole("link", { name: "데이터 독립성" });
    await expect(link).toBeVisible();
    await link.click();
    await page.waitForURL(/\/wiki\/concepts\/.+/);
  });

  test("데이터베이스 page shows child list with DBMS", async ({ page }) => {
    await page.goto("/wiki/concepts/%EB%8D%B0%EC%9D%B4%ED%84%B0%EB%B2%A0%EC%9D%B4%EC%8A%A4");
    const childSection = page.getByRole("region", { name: "Child pages" });
    await expect(childSection).toBeVisible();
    await expect(childSection.getByRole("link", { name: "DBMS" })).toBeVisible();
  });

  test("sidebar expansion state persists across reloads (localStorage)", async ({ page }) => {
    await page.goto("/wiki/concepts/%EB%8D%B0%EC%9D%B4%ED%84%B0%EB%B2%A0%EC%9D%B4%EC%8A%A4");
    const sidebar = page.getByRole("navigation", { name: "Categories" });
    const databaseToggle = sidebar.getByRole("button", { name: /데이터베이스/ });
    // Force-collapse if currently open (current page auto-expands its ancestors;
    // but Database itself is the current page, not an ancestor, so it should be
    // closed by default unless user previously opened it. Either way, force open.)
    const initial = await databaseToggle.getAttribute("aria-expanded");
    if (initial !== "true") {
      await databaseToggle.click();
    }
    await expect(databaseToggle).toHaveAttribute("aria-expanded", "true");
    await page.reload();
    const reloadedToggle = sidebar.getByRole("button", { name: /데이터베이스/ });
    await expect(reloadedToggle).toHaveAttribute("aria-expanded", "true");
  });
});
```

- [ ] **Step 15.2: Run the e2e spec**

Run:
```bash
cd /d/Education && npx playwright test tests/e2e/wiki-hierarchy.spec.ts 2>&1 | tail -30
```

Expected: all 5 tests pass. If a test fails, the most likely causes:
1. Slug mismatch — actual annotated page slug differs from spec assumption. Open `public/wiki-data/tree.json` and confirm the parent/child structure, then update the spec slugs.
2. Sidebar toggle initial state differs — adjust the click logic.
3. URL encoding mismatch — the test uses pre-encoded URLs because Korean slugs are URL-encoded by Next.

If a slug differs, update the test's `page.goto(...)` and link `name:` matchers to match the real annotation.

- [ ] **Step 15.3: Run all e2e specs to confirm no regression**

Run:
```bash
cd /d/Education && npm run test:e2e 2>&1 | tail -20
```

Expected: all suites pass.

- [ ] **Step 15.4: Commit**

```bash
cd /d/Education && git add tests/e2e/wiki-hierarchy.spec.ts && git commit -m "test(e2e): wiki hierarchy — sidebar tree, breadcrumb, prereqs, child list, persistence"
```

---

## Task 16: Final verification (typecheck · lint · unit · build)

**Files:** none (verification only)

- [ ] **Step 16.1: Run the full quality gate**

Run:
```bash
cd /d/Education && npm run typecheck && npm run lint && npm test && npm run build 2>&1 | tail -30
```

Expected: all four green. The `npm run build` should print `✓ Compiled successfully` and `[build-indexes] wrote 5 JSON files` near the end.

- [ ] **Step 16.2: Spot-check generated `tree.json`**

Run:
```bash
cd /d/Education && node -e "const t = require('./public/wiki-data/tree.json'); console.log('top folders:', Object.keys(t)); for (const f of Object.keys(t)) { console.log(f, 'roots:', t[f].roots.length, 'edges:', Object.keys(t[f].parents).length); }"
```

Expected: positive root counts and at least some non-zero parent edge count for `concepts` (proves Phase 2 annotation took effect).

- [ ] **Step 16.3: Run the full e2e suite once more**

Run:
```bash
cd /d/Education && npm run test:e2e 2>&1 | tail -10
```

Expected: all green.

- [ ] **Step 16.4: Summary**

You're done. The branch should now contain (in commit order):
1. `feat(wiki): add parent + prerequisites to PageFrontmatter`
2. `feat(wiki): hierarchy module (build, validate, lookups)`
3. `feat(wiki): generate tree.json and validate hierarchy at build time`
4. `feat(wiki): hierarchy validation in check-content with fixtures`
5. `feat(wiki): expose getHierarchy() and getTitleMap() from page-loader`
6. `feat(wiki): sidebar renders per-folder tree with localStorage expansion`
7. `feat(wiki): Breadcrumb component`
8. `feat(wiki): Prerequisites callout component`
9. `feat(wiki): ChildPages section component`
10. `feat(wiki): wire breadcrumb, prereqs, child list into WikiPage and slug route`
11. `feat(wiki): index page 2-level tree + register vault categories`
12. (in `content/` submodule) `data: annotate concepts/ with parent and prerequisites + author guide`
13. `chore: bump wiki submodule with concepts hierarchy annotations`
14. `test(e2e): wiki hierarchy — sidebar tree, breadcrumb, prereqs, child list, persistence`
