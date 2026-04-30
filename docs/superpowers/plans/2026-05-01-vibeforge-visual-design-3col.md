# VibeForge Plan 2: Visual Design + 3-Column Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply `design.png` visual tone (purple/pink gradient bg, white rounded cards, gradient CTA, colored category dots) and a 3-column AppShell (sidebar / main / right panel) to the wiki routes built in Plan 1, without regressing functionality.

**Architecture:** Add a thin layout layer (`components/layout/`) and a design-token module (`lib/design/`) that compose with Plan 1's existing wiki components. Routes consume an `AppShell` wrapper and inject content/right-panel slots. No build-pipeline or vault-loader changes beyond exposing `getAllPages()` from the existing module-level cache to fix Plan 1's deferred double-scan.

**Tech Stack:** Next.js 15 App Router · React 19 · TypeScript strict · Tailwind v4 · Pretendard font (self-host) · Vitest + jsdom · Playwright.

**Branch:** Create `plan2/visual-design-3col` from tag `plan1-bootstrap-wiki-engine`.

**Out of scope (deferred to later plans):** Forum (Plan 3), Wiki ↔ Q&A backlinks (Plan 4), graph view + giscus + About (Plan 5). The right panel reserves a slot for `<RelatedQA>` but does not implement it.

---

## File Structure

**Create:**
- `lib/design/categories.ts` — single source of truth: `{ slug → { label, dotColor, accentClass } }`
- `lib/design/tokens.css` — CSS custom properties for gradient bg, surface, accents, category colors
- `components/layout/SiteHeader.tsx` — top bar (logo + nav + search slot + auth placeholder)
- `components/layout/AppShell.tsx` — 3-column shell with named slots
- `components/layout/Sidebar.tsx` — category tree (uses `getAllPages` cache + categories module)
- `components/layout/RightPanel.tsx` — right column container (TOC + Backlinks + future RelatedQA slot)
- `components/wiki/TableOfContents.tsx` — extracts `<h2>`/`<h3>` from rendered body HTML
- `components/wiki/CategoryBadge.tsx` — colored dot + label pill
- `public/fonts/Pretendard-Regular.woff2`, `Pretendard-SemiBold.woff2`, `Pretendard-Bold.woff2` — self-hosted weights (fetched from Pretendard CDN)
- `tests/e2e/visual-shell.spec.ts` — smoke test for 3-col + gradient + Pretendard
- Unit tests for each new component/module (colocated `*.test.tsx`)

**Modify:**
- `lib/wiki/page-loader.ts` — export `getAllPages()` (consumes existing cache)
- `app/layout.tsx` — apply gradient bg class + Pretendard font + import `tokens.css`
- `app/globals.css` — add `@font-face`, body styles, card utility, broken-link rules retained
- `app/page.tsx` — hero card homepage
- `app/wiki/page.tsx` — card grid by category, drop direct `loadVault` (use cache)
- `app/wiki/[...slug]/page.tsx` — wrap `WikiPage` in `AppShell` + `RightPanel`
- `app/wiki/tag/[tag]/page.tsx` — `AppShell` layout + `dynamicParams = false`
- `components/wiki/WikiPage.tsx` — card surface; remove inline `<Backlinks>` (now in RightPanel)
- `components/wiki/Backlinks.tsx` — compact right-panel variant
- `components/wiki/SearchBox.tsx` — pill-rounded input matching design.png

**No changes:** `lib/wiki/{load,frontmatter,wiki-link,backlinks,render,search-index,slug,tags,types}.ts`, `scripts/build-indexes.ts`, `app/api/search/route.ts`. The `WIKI_LINK_RE` duplication (Plan 1 deferred #3) stays — Plan 2 does not touch that area.

---

## Design Tokens (concrete values from spec)

These are hardcoded into `lib/design/tokens.css` and `lib/design/categories.ts`. They come straight from the spec's Visual section. The frontend-design skill MAY be invoked during execution to refine these values against `design.png`; if invoked, the controller swaps the values into the same files (no structural change).

```
--bg-gradient:    linear-gradient(135deg, #f3e7fb 0%, #fde7f3 100%);
--surface-card:   #ffffff;
--surface-shadow: 0 4px 24px rgba(124, 58, 237, 0.08);
--accent-from:    #7c3aed;   /* purple */
--accent-to:      #3b82f6;   /* blue */
--accent-cta:     linear-gradient(135deg, #7c3aed, #3b82f6);
--text-primary:   #1f2937;
--text-secondary: #6b7280;
--radius-card:    14px;

Category colors:
  data-handling      → #7c3aed (purple)
  how-computers-work → #14b8a6 (teal)
  code-flow          → #22c55e (green)
  (fallback)         → #f97316 (orange)
```

---

## Phase A: Foundation (Tasks 2.1 – 2.3)

### Task 2.1: Create branch and self-hosted Pretendard font

**Files:**
- Create: `public/fonts/Pretendard-Regular.woff2`
- Create: `public/fonts/Pretendard-SemiBold.woff2`
- Create: `public/fonts/Pretendard-Bold.woff2`

- [ ] **Step 1: Create branch from Plan 1 tag**

```bash
git checkout -b plan2/visual-design-3col plan1-bootstrap-wiki-engine
```

- [ ] **Step 2: Download three Pretendard weights into `public/fonts/`**

Source (self-hosted, OFL): `https://github.com/orioncactus/pretendard/raw/main/packages/pretendard/dist/web/static/woff2/`. Filenames: `Pretendard-Regular.woff2`, `Pretendard-SemiBold.woff2`, `Pretendard-Bold.woff2`. Save under `public/fonts/` with those exact names.

```bash
mkdir -p public/fonts
curl -L -o public/fonts/Pretendard-Regular.woff2 \
  https://github.com/orioncactus/pretendard/raw/main/packages/pretendard/dist/web/static/woff2/Pretendard-Regular.woff2
curl -L -o public/fonts/Pretendard-SemiBold.woff2 \
  https://github.com/orioncactus/pretendard/raw/main/packages/pretendard/dist/web/static/woff2/Pretendard-SemiBold.woff2
curl -L -o public/fonts/Pretendard-Bold.woff2 \
  https://github.com/orioncactus/pretendard/raw/main/packages/pretendard/dist/web/static/woff2/Pretendard-Bold.woff2
```

- [ ] **Step 3: Verify all three files exist and are non-empty**

```bash
ls -la public/fonts/
```
Expected: each file present and >50KB.

- [ ] **Step 4: Commit**

```bash
git add public/fonts/
git commit -m "chore(fonts): self-host Pretendard regular/semibold/bold woff2"
```

---

### Task 2.2: Design tokens stylesheet

**Files:**
- Create: `lib/design/tokens.css`

- [ ] **Step 1: Create tokens.css with CSS variables and font-face**

```css
/* lib/design/tokens.css — VibeForge design tokens (Plan 2). */

@font-face {
  font-family: "Pretendard";
  font-weight: 400;
  font-style: normal;
  font-display: swap;
  src: url("/fonts/Pretendard-Regular.woff2") format("woff2");
}
@font-face {
  font-family: "Pretendard";
  font-weight: 600;
  font-style: normal;
  font-display: swap;
  src: url("/fonts/Pretendard-SemiBold.woff2") format("woff2");
}
@font-face {
  font-family: "Pretendard";
  font-weight: 700;
  font-style: normal;
  font-display: swap;
  src: url("/fonts/Pretendard-Bold.woff2") format("woff2");
}

:root {
  --bg-gradient: linear-gradient(135deg, #f3e7fb 0%, #fde7f3 100%);
  --surface-card: #ffffff;
  --surface-shadow: 0 4px 24px rgba(124, 58, 237, 0.08);
  --accent-from: #7c3aed;
  --accent-to: #3b82f6;
  --accent-cta: linear-gradient(135deg, #7c3aed, #3b82f6);
  --text-primary: #1f2937;
  --text-secondary: #6b7280;
  --radius-card: 14px;

  --cat-data-handling: #7c3aed;
  --cat-how-computers-work: #14b8a6;
  --cat-code-flow: #22c55e;
  --cat-default: #f97316;
}
```

- [ ] **Step 2: Verify file exists**

```bash
cat lib/design/tokens.css | head -5
```
Expected: shows `@font-face` for Pretendard.

- [ ] **Step 3: Commit**

```bash
git add lib/design/tokens.css
git commit -m "feat(design): tokens.css with Pretendard face + color/gradient vars"
```

---

### Task 2.3: Categories module + tests

**Files:**
- Create: `lib/design/categories.ts`
- Create: `lib/design/categories.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// lib/design/categories.test.ts
import { describe, it, expect } from "vitest";
import { getCategoryMeta, listCategories } from "./categories";

describe("categories", () => {
  it("returns label and color for known slug", () => {
    const m = getCategoryMeta("data-handling");
    expect(m.label).toBe("데이터 다루기");
    expect(m.colorVar).toBe("--cat-data-handling");
  });

  it("falls back to default color for unknown slug", () => {
    const m = getCategoryMeta("unknown-cat");
    expect(m.label).toBe("unknown-cat");
    expect(m.colorVar).toBe("--cat-default");
  });

  it("listCategories returns the three known categories in stable order", () => {
    const list = listCategories();
    expect(list.map((c) => c.slug)).toEqual([
      "data-handling",
      "how-computers-work",
      "code-flow",
    ]);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npx vitest run lib/design/categories.test.ts
```
Expected: FAIL "Cannot find module './categories'".

- [ ] **Step 3: Implement module**

```typescript
// lib/design/categories.ts
export interface CategoryMeta {
  slug: string;
  label: string;
  colorVar: string;
}

const KNOWN: CategoryMeta[] = [
  { slug: "data-handling", label: "데이터 다루기", colorVar: "--cat-data-handling" },
  { slug: "how-computers-work", label: "컴퓨터는 어떻게 일하나", colorVar: "--cat-how-computers-work" },
  { slug: "code-flow", label: "코드 흐름", colorVar: "--cat-code-flow" },
];

export function listCategories(): CategoryMeta[] {
  return KNOWN;
}

export function getCategoryMeta(slug: string): CategoryMeta {
  return KNOWN.find((c) => c.slug === slug) ?? {
    slug,
    label: slug,
    colorVar: "--cat-default",
  };
}
```

- [ ] **Step 4: Re-run; confirm pass**

```bash
npx vitest run lib/design/categories.test.ts
```
Expected: 3 pass.

- [ ] **Step 5: Commit**

```bash
git add lib/design/categories.ts lib/design/categories.test.ts
git commit -m "feat(design): categories module — single source for label + color"
```

---

## Phase B: Layout Primitives (Tasks 2.4 – 2.8)

### Task 2.4: SiteHeader component

**Files:**
- Create: `components/layout/SiteHeader.tsx`
- Create: `components/layout/SiteHeader.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// components/layout/SiteHeader.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SiteHeader } from "./SiteHeader";

describe("SiteHeader", () => {
  it("renders logo, nav links, and search slot", () => {
    render(<SiteHeader searchSlot={<input data-testid="s" />} />);
    expect(screen.getByRole("link", { name: "VibeForge" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Wiki" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Forum" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "About" })).toBeInTheDocument();
    expect(screen.getByTestId("s")).toBeInTheDocument();
  });

  it("renders without search slot", () => {
    render(<SiteHeader />);
    expect(screen.getByRole("link", { name: "VibeForge" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run; confirm fail**

```bash
npx vitest run components/layout/SiteHeader.test.tsx
```
Expected: FAIL "Cannot find module".

- [ ] **Step 3: Implement**

```tsx
// components/layout/SiteHeader.tsx
import Link from "next/link";

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
        <Link href="/forum" className="hover:text-[var(--text-primary)]">Forum</Link>
        <Link href="/about" className="hover:text-[var(--text-primary)]">About</Link>
      </nav>
      {searchSlot && <div className="flex-1 max-w-md">{searchSlot}</div>}
    </header>
  );
}
```

- [ ] **Step 4: Re-run; confirm pass**

```bash
npx vitest run components/layout/SiteHeader.test.tsx
```
Expected: 2 pass.

- [ ] **Step 5: Commit**

```bash
git add components/layout/SiteHeader.tsx components/layout/SiteHeader.test.tsx
git commit -m "feat(layout): SiteHeader with logo + nav + optional search slot"
```

---

### Task 2.5: AppShell 3-column container

**Files:**
- Create: `components/layout/AppShell.tsx`
- Create: `components/layout/AppShell.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// components/layout/AppShell.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppShell } from "./AppShell";

describe("AppShell", () => {
  it("renders all three slots and header", () => {
    render(
      <AppShell
        sidebar={<div>SIDE</div>}
        main={<div>MAIN</div>}
        right={<div>RIGHT</div>}
      />
    );
    expect(screen.getByText("SIDE")).toBeInTheDocument();
    expect(screen.getByText("MAIN")).toBeInTheDocument();
    expect(screen.getByText("RIGHT")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "VibeForge" })).toBeInTheDocument();
  });

  it("omits right column when not provided", () => {
    render(<AppShell sidebar={<div>SIDE</div>} main={<div>MAIN</div>} />);
    expect(screen.queryByTestId("appshell-right")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run; confirm fail**

```bash
npx vitest run components/layout/AppShell.test.tsx
```
Expected: FAIL.

- [ ] **Step 3: Implement**

```tsx
// components/layout/AppShell.tsx
import { SiteHeader } from "./SiteHeader";

interface Props {
  sidebar: React.ReactNode;
  main: React.ReactNode;
  right?: React.ReactNode;
  headerSearch?: React.ReactNode;
}

export function AppShell({ sidebar, main, right, headerSearch }: Props) {
  return (
    <div className="min-h-screen p-4 md:p-6 bg-[var(--bg-gradient)]">
      <SiteHeader searchSlot={headerSearch} />
      <div className="mt-6 grid gap-6 grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] lg:grid-cols-[220px_minmax(0,1fr)_280px]">
        <aside className="hidden md:block" data-testid="appshell-sidebar">{sidebar}</aside>
        <main data-testid="appshell-main">{main}</main>
        {right && (
          <aside className="hidden lg:block" data-testid="appshell-right">{right}</aside>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Re-run; confirm pass**

```bash
npx vitest run components/layout/AppShell.test.tsx
```
Expected: 2 pass.

- [ ] **Step 5: Commit**

```bash
git add components/layout/AppShell.tsx components/layout/AppShell.test.tsx
git commit -m "feat(layout): AppShell 3-column responsive grid"
```

---

### Task 2.6: Sidebar (category tree)

**Files:**
- Create: `components/layout/Sidebar.tsx`
- Create: `components/layout/Sidebar.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// components/layout/Sidebar.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Sidebar } from "./Sidebar";

const PAGES = [
  { slug: "data-handling/what-is-an-index", title: "인덱스가 뭐예요?", category: "data-handling" },
  { slug: "how-computers-work/what-is-a-process", title: "프로세스가 뭐예요?", category: "how-computers-work" },
  { slug: "code-flow/what-is-an-array", title: "배열이 뭐예요?", category: "code-flow" },
];

describe("Sidebar", () => {
  it("renders category labels and child pages grouped", () => {
    render(<Sidebar pages={PAGES} currentSlug={null} />);
    expect(screen.getByText("데이터 다루기")).toBeInTheDocument();
    expect(screen.getByText("컴퓨터는 어떻게 일하나")).toBeInTheDocument();
    expect(screen.getByText("코드 흐름")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "인덱스가 뭐예요?" })).toBeInTheDocument();
  });

  it("marks the current page with aria-current=page", () => {
    render(<Sidebar pages={PAGES} currentSlug="data-handling/what-is-an-index" />);
    const link = screen.getByRole("link", { name: "인덱스가 뭐예요?" });
    expect(link).toHaveAttribute("aria-current", "page");
  });
});
```

- [ ] **Step 2: Run; confirm fail**

```bash
npx vitest run components/layout/Sidebar.test.tsx
```
Expected: FAIL.

- [ ] **Step 3: Implement**

```tsx
// components/layout/Sidebar.tsx
import Link from "next/link";
import type { Route } from "next";
import { listCategories, getCategoryMeta } from "@/lib/design/categories";

export interface SidebarPage {
  slug: string;
  title: string;
  category: string;
}

interface Props {
  pages: SidebarPage[];
  currentSlug: string | null;
}

export function Sidebar({ pages, currentSlug }: Props) {
  const order = listCategories().map((c) => c.slug);
  const byCat = new Map<string, SidebarPage[]>();
  for (const p of pages) {
    if (!byCat.has(p.category)) byCat.set(p.category, []);
    byCat.get(p.category)!.push(p);
  }
  const knownThenRest = [
    ...order.filter((c) => byCat.has(c)),
    ...Array.from(byCat.keys()).filter((c) => !order.includes(c)),
  ];
  return (
    <nav
      aria-label="Categories"
      className="bg-[var(--surface-card)] rounded-[var(--radius-card)] shadow-[var(--surface-shadow)] p-4"
    >
      {knownThenRest.map((cat) => {
        const meta = getCategoryMeta(cat);
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
            <ul className="pl-4 space-y-1 text-sm text-[var(--text-secondary)]">
              {byCat.get(cat)!.map((p) => {
                const isCurrent = p.slug === currentSlug;
                return (
                  <li key={p.slug}>
                    <Link
                      href={`/wiki/${p.slug}` as Route}
                      aria-current={isCurrent ? "page" : undefined}
                      className={
                        isCurrent
                          ? "text-[var(--text-primary)] font-medium"
                          : "hover:text-[var(--text-primary)]"
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

- [ ] **Step 4: Re-run; confirm pass**

```bash
npx vitest run components/layout/Sidebar.test.tsx
```
Expected: 2 pass.

- [ ] **Step 5: Commit**

```bash
git add components/layout/Sidebar.tsx components/layout/Sidebar.test.tsx
git commit -m "feat(layout): Sidebar with category dots and current-page hilite"
```

---

### Task 2.7: TableOfContents component

**Files:**
- Create: `components/wiki/TableOfContents.tsx`
- Create: `components/wiki/TableOfContents.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// components/wiki/TableOfContents.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TableOfContents } from "./TableOfContents";

const HTML = `
  <h2 id="intro">Intro</h2>
  <p>x</p>
  <h2 id="part-one">Part One</h2>
  <h3 id="detail">Detail</h3>
  <h2 id="conclusion">Conclusion</h2>
`;

describe("TableOfContents", () => {
  it("extracts h2 and h3 with anchor links", () => {
    render(<TableOfContents bodyHtml={HTML} />);
    expect(screen.getByRole("link", { name: "Intro" })).toHaveAttribute("href", "#intro");
    expect(screen.getByRole("link", { name: "Part One" })).toHaveAttribute("href", "#part-one");
    expect(screen.getByRole("link", { name: "Detail" })).toHaveAttribute("href", "#detail");
    expect(screen.getByRole("link", { name: "Conclusion" })).toHaveAttribute("href", "#conclusion");
  });

  it("renders nothing when there are no headings", () => {
    const { container } = render(<TableOfContents bodyHtml="<p>no headings</p>" />);
    expect(container.firstChild).toBeNull();
  });
});
```

- [ ] **Step 2: Run; confirm fail**

```bash
npx vitest run components/wiki/TableOfContents.test.tsx
```
Expected: FAIL.

- [ ] **Step 3: Implement**

```tsx
// components/wiki/TableOfContents.tsx
interface Heading {
  id: string;
  text: string;
  level: 2 | 3;
}

function extractHeadings(html: string): Heading[] {
  const re = /<h([23])\s+id="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/g;
  const out: Heading[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const level = Number(m[1]) as 2 | 3;
    const id = m[2];
    const text = m[3].replace(/<[^>]+>/g, "").trim();
    out.push({ id, text, level });
  }
  return out;
}

interface Props {
  bodyHtml: string;
}

export function TableOfContents({ bodyHtml }: Props) {
  const items = extractHeadings(bodyHtml);
  if (items.length === 0) return null;
  return (
    <nav aria-label="Table of contents" className="text-sm">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-2">
        목차
      </h2>
      <ul className="space-y-1">
        {items.map((h) => (
          <li key={h.id} className={h.level === 3 ? "pl-3" : ""}>
            <a
              href={`#${h.id}`}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
```

- [ ] **Step 4: Re-run; confirm pass**

```bash
npx vitest run components/wiki/TableOfContents.test.tsx
```
Expected: 2 pass.

- [ ] **Step 5: Commit**

```bash
git add components/wiki/TableOfContents.tsx components/wiki/TableOfContents.test.tsx
git commit -m "feat(wiki): TableOfContents extracts h2/h3 anchors from body HTML"
```

---

### Task 2.8: RightPanel container

**Files:**
- Create: `components/layout/RightPanel.tsx`
- Create: `components/layout/RightPanel.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// components/layout/RightPanel.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RightPanel } from "./RightPanel";

describe("RightPanel", () => {
  it("renders children inside a card surface", () => {
    render(<RightPanel><div>contents</div></RightPanel>);
    expect(screen.getByText("contents")).toBeInTheDocument();
    const region = screen.getByLabelText("Page context");
    expect(region).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run; confirm fail**

```bash
npx vitest run components/layout/RightPanel.test.tsx
```
Expected: FAIL.

- [ ] **Step 3: Implement**

```tsx
// components/layout/RightPanel.tsx
interface Props {
  children: React.ReactNode;
}

export function RightPanel({ children }: Props) {
  return (
    <section
      aria-label="Page context"
      className="bg-[var(--surface-card)] rounded-[var(--radius-card)] shadow-[var(--surface-shadow)] p-4 space-y-6"
    >
      {children}
    </section>
  );
}
```

- [ ] **Step 4: Re-run; confirm pass**

```bash
npx vitest run components/layout/RightPanel.test.tsx
```
Expected: 1 pass.

- [ ] **Step 5: Commit**

```bash
git add components/layout/RightPanel.tsx components/layout/RightPanel.test.tsx
git commit -m "feat(layout): RightPanel card container for TOC + Backlinks"
```

---

## Phase C: Page-loader cache exposure (Plan 1 deferred #1)

### Task 2.9: Expose `getAllPages()` from page-loader

**Files:**
- Modify: `lib/wiki/page-loader.ts:43-46` (add export below `getAllSlugs`)
- Create: `lib/wiki/page-loader.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// lib/wiki/page-loader.test.ts
import { describe, it, expect } from "vitest";
import { getAllPages, getAllSlugs } from "./page-loader";

describe("page-loader cache", () => {
  it("getAllPages returns the same array reference across calls (single scan)", async () => {
    const a = await getAllPages();
    const b = await getAllPages();
    expect(a).toBe(b);
  });

  it("getAllPages includes title and slug for every page", async () => {
    const pages = await getAllPages();
    expect(pages.length).toBeGreaterThan(0);
    for (const p of pages) {
      expect(typeof p.slug).toBe("string");
      expect(typeof p.frontmatter.title).toBe("string");
    }
  });

  it("getAllSlugs returns same length as getAllPages", async () => {
    const slugs = await getAllSlugs();
    const pages = await getAllPages();
    expect(slugs.length).toBe(pages.length);
  });
});
```

- [ ] **Step 2: Run; confirm fail**

```bash
npx vitest run lib/wiki/page-loader.test.ts
```
Expected: FAIL "getAllPages is not a function".

- [ ] **Step 3: Add export to page-loader**

Open `lib/wiki/page-loader.ts` and append below the existing `getAllSlugs`:

```typescript
export async function getAllPages(): Promise<Page[]> {
  const { all } = await ensureCache();
  return all;
}
```

- [ ] **Step 4: Re-run; confirm pass**

```bash
npx vitest run lib/wiki/page-loader.test.ts
```
Expected: 3 pass.

- [ ] **Step 5: Commit**

```bash
git add lib/wiki/page-loader.ts lib/wiki/page-loader.test.ts
git commit -m "feat(wiki): expose getAllPages from page-loader cache"
```

---

## Phase D: Apply layout to routes (Tasks 2.10 – 2.13)

### Task 2.10: Wire tokens.css into root layout

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Update `app/globals.css` to import tokens and set body styles**

Replace the entire file contents with:

```css
@import "tailwindcss";
@import "../lib/design/tokens.css";

html, body {
  font-family: "Pretendard", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  color: var(--text-primary);
}

body {
  background: var(--bg-gradient);
  background-attachment: fixed;
  min-height: 100vh;
}

/* Card utility for content surfaces */
.vf-card {
  background: var(--surface-card);
  border-radius: var(--radius-card);
  box-shadow: var(--surface-shadow);
}

/* Broken wiki-link styling (Plan 1, Task 1.11) */
a[data-broken="true"] {
  color: #999;
  text-decoration: line-through;
  cursor: not-allowed;
}
a[data-broken="true"]::after {
  content: " (broken)";
  font-size: 0.85em;
  opacity: 0.6;
}
```

- [ ] **Step 2: Verify root layout has the lang attribute (no change needed)**

`app/layout.tsx` already has `<html lang="ko">`. No edit. Confirm by reading it.

- [ ] **Step 3: Run typecheck and dev server smoke**

```bash
npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add app/globals.css
git commit -m "style(global): apply Pretendard + gradient bg + .vf-card utility"
```

---

### Task 2.11: Refactor `/wiki/[...slug]` to use AppShell + RightPanel

**Files:**
- Modify: `app/wiki/[...slug]/page.tsx`
- Modify: `components/wiki/WikiPage.tsx`

- [ ] **Step 1: Update `WikiPage.tsx` to drop inline `<Backlinks>` and apply card surface**

Replace the entire component body with:

```tsx
// components/wiki/WikiPage.tsx
import type { PageFrontmatter } from "@/lib/wiki/types";

interface Props {
  slug: string;
  frontmatter: PageFrontmatter;
  bodyHtml: string;
  /** GitHub URL prefix for "Edit on GitHub" — pass null to hide */
  editBaseUrl: string | null;
  /** filePath relative to wiki repo root, e.g. "data/cat-a/page.md" */
  filePath: string;
}

export function WikiPage({
  slug,
  frontmatter,
  bodyHtml,
  editBaseUrl,
  filePath,
}: Props) {
  return (
    <article className="vf-card p-6 md:p-8">
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

      <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: bodyHtml }} />

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

Note: `Backlinks` and `titleMap` props are removed. The `slug` and `frontmatter` props are kept — the route now passes only what `WikiPage` consumes.

- [ ] **Step 2: Update the route to wrap in AppShell + RightPanel**

Replace the entire `app/wiki/[...slug]/page.tsx` with:

```tsx
import { notFound } from "next/navigation";
import { loadOnePage, getAllSlugs, getAllPages } from "@/lib/wiki/page-loader";
import { WikiPage } from "@/components/wiki/WikiPage";
import { AppShell } from "@/components/layout/AppShell";
import { Sidebar } from "@/components/layout/Sidebar";
import { RightPanel } from "@/components/layout/RightPanel";
import { TableOfContents } from "@/components/wiki/TableOfContents";
import { Backlinks } from "@/components/wiki/Backlinks";
import { SearchBox } from "@/components/wiki/SearchBox";

const EDIT_BASE_URL = process.env.NEXT_PUBLIC_WIKI_REPO_URL ?? null;

export const dynamicParams = true;

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

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit
```
Expected: 0 errors. (Removed `backlinks`/`titleMap` props from WikiPage call.)

- [ ] **Step 4: Run unit tests — existing WikiPage consumers must still pass**

```bash
npx vitest run
```
Expected: all green. (No existing test imports WikiPage with the removed props because Plan 1 had no WikiPage unit test.)

- [ ] **Step 5: Commit**

```bash
git add components/wiki/WikiPage.tsx app/wiki/[...slug]/page.tsx
git commit -m "refactor(wiki): wrap slug page in AppShell + RightPanel; WikiPage as card"
```

---

### Task 2.12: Refactor `/wiki` index — card grid + drop direct loadVault

**Files:**
- Modify: `app/wiki/page.tsx`

- [ ] **Step 1: Replace the file with AppShell-wrapped card grid using cached pages**

```tsx
// app/wiki/page.tsx
import Link from "next/link";
import type { Route } from "next";
import { getAllPages } from "@/lib/wiki/page-loader";
import { listCategories, getCategoryMeta } from "@/lib/design/categories";
import { AppShell } from "@/components/layout/AppShell";
import { Sidebar } from "@/components/layout/Sidebar";
import { SearchBox } from "@/components/wiki/SearchBox";

export const metadata = {
  title: "Wiki — VibeForge",
};

export default async function WikiIndexPage() {
  const all = await getAllPages();
  const sidebarPages = all.map((p) => ({
    slug: p.slug,
    title: p.frontmatter.title,
    category: p.slug.split("/")[0],
  }));

  const groups = new Map<string, { slug: string; title: string }[]>();
  for (const p of all) {
    const cat = p.slug.split("/")[0];
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat)!.push({ slug: p.slug, title: p.frontmatter.title });
  }
  const order = listCategories().map((c) => c.slug);
  const orderedKeys = [
    ...order.filter((c) => groups.has(c)),
    ...Array.from(groups.keys()).filter((c) => !order.includes(c)),
  ];

  return (
    <AppShell
      headerSearch={<SearchBox />}
      sidebar={<Sidebar pages={sidebarPages} currentSlug={null} />}
      main={
        <div className="space-y-6">
          <header className="vf-card p-6">
            <h1 className="text-3xl font-bold">Wiki</h1>
            <p className="mt-2 text-[var(--text-secondary)]">
              바이브코더가 알아두면 좋은 CS 지식. 카테고리별로 정리되어 있어요.
            </p>
          </header>
          {orderedKeys.map((cat) => {
            const meta = getCategoryMeta(cat);
            return (
              <section key={cat} className="vf-card p-6">
                <h2 className="flex items-center gap-2 text-xl font-semibold mb-3">
                  <span
                    aria-hidden
                    className="inline-block w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: `var(${meta.colorVar})` }}
                  />
                  {meta.label}
                </h2>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {groups.get(cat)!.map((p) => (
                    <li key={p.slug}>
                      <Link
                        href={`/wiki/${p.slug}` as Route}
                        className="block px-3 py-2 rounded-md hover:bg-black/5 text-[var(--text-primary)]"
                      >
                        {p.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      }
    />
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add app/wiki/page.tsx
git commit -m "refactor(wiki): /wiki index uses AppShell + getAllPages cache (no double scan)"
```

---

### Task 2.13: Refactor `/wiki/tag/[tag]` and add `dynamicParams = false`

**Files:**
- Modify: `app/wiki/tag/[tag]/page.tsx`

- [ ] **Step 1: Replace the file**

```tsx
// app/wiki/tag/[tag]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Route } from "next";
import type { TagMap } from "@/lib/wiki/types";
import { getAllPages } from "@/lib/wiki/page-loader";
import { AppShell } from "@/components/layout/AppShell";
import { Sidebar } from "@/components/layout/Sidebar";
import { SearchBox } from "@/components/wiki/SearchBox";

interface ManifestEntry {
  slug: string;
  title: string;
  tags: string[];
  updated: string;
}

async function loadIndexes() {
  const dataDir = path.resolve(process.cwd(), "public", "wiki-data");
  const tags = JSON.parse(await readFile(path.join(dataDir, "tags.json"), "utf-8")) as TagMap;
  const manifest = JSON.parse(
    await readFile(path.join(dataDir, "manifest.json"), "utf-8")
  ) as ManifestEntry[];
  const titleBySlug: Record<string, string> = {};
  for (const m of manifest) titleBySlug[m.slug] = m.title;
  return { tags, titleBySlug };
}

export const dynamicParams = false;

export async function generateStaticParams() {
  const { tags } = await loadIndexes();
  return Object.keys(tags).map((tag) => ({ tag: encodeURIComponent(tag) }));
}

export default async function TagPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag: rawTag } = await params;
  const tag = decodeURIComponent(rawTag);
  const { tags, titleBySlug } = await loadIndexes();
  const slugs = tags[tag];
  if (!slugs || slugs.length === 0) notFound();

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
        <div className="vf-card p-6">
          <h1 className="text-2xl font-bold mb-1">#{tag}</h1>
          <p className="text-sm text-[var(--text-secondary)] mb-4">{slugs.length}개 페이지</p>
          <ul className="space-y-2">
            {slugs.map((s) => (
              <li key={s}>
                <Link
                  href={`/wiki/${s}` as Route}
                  className="block px-3 py-2 rounded-md hover:bg-black/5 text-[var(--text-primary)]"
                >
                  {titleBySlug[s] ?? s}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm">
            <Link href="/wiki" className="underline hover:text-[var(--text-primary)]">
              ← Wiki 홈
            </Link>
          </p>
        </div>
      }
    />
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add app/wiki/tag/[tag]/page.tsx
git commit -m "refactor(wiki): tag page uses AppShell + dynamicParams=false (Plan 1 deferred)"
```

---

### Task 2.14: Hero homepage

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Replace the file**

```tsx
// app/page.tsx
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen p-4 md:p-6 bg-[var(--bg-gradient)]">
      <div className="max-w-4xl mx-auto mt-12 md:mt-24 vf-card p-8 md:p-12 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">VibeForge</h1>
        <p className="text-lg text-[var(--text-secondary)] mb-8">
          바이브코더를 위한 CS 학습·토론 사이트.
          <br />
          AI에게 시키는 단계에서 한 걸음 더 나아가도록.
        </p>
        <Link
          href="/wiki"
          className="inline-block px-6 py-3 rounded-full font-semibold text-white shadow-md hover:opacity-90 transition"
          style={{ background: "var(--accent-cta)" }}
        >
          Wiki 둘러보기 →
        </Link>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/page.tsx
git commit -m "feat(home): hero card with gradient CTA matching design.png"
```

---

## Phase E: Component restyle (Tasks 2.15 – 2.16)

### Task 2.15: Restyle Backlinks for right panel

**Files:**
- Modify: `components/wiki/Backlinks.tsx`

- [ ] **Step 1: Replace component to drop the border-top and tighten typography**

```tsx
// components/wiki/Backlinks.tsx
import Link from "next/link";
import type { Route } from "next";

interface Props {
  slugs: string[];
  titleMap: Record<string, string>;
}

export function Backlinks({ slugs, titleMap }: Props) {
  if (slugs.length === 0) return null;
  return (
    <nav aria-label="Backlinks" className="text-sm">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-2">
        이 페이지를 인용한 곳
      </h2>
      <ul className="space-y-1">
        {slugs.map((slug) => (
          <li key={slug}>
            <Link
              href={`/wiki/${slug}` as Route}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              {titleMap[slug] ?? slug}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add components/wiki/Backlinks.tsx
git commit -m "style(wiki): Backlinks compact for right panel"
```

---

### Task 2.16: Restyle SearchBox to match design.png pill

**Files:**
- Modify: `components/wiki/SearchBox.tsx`

- [ ] **Step 1: Replace input class names + popover styling**

Replace just the JSX `return` block with:

```tsx
  return (
    <div className="relative">
      <input
        type="search"
        placeholder="위키 검색…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full bg-white/70 backdrop-blur rounded-full px-4 py-2 text-sm border border-black/5 focus:outline-none focus:ring-2 focus:ring-[var(--accent-from)]/30"
        aria-label="Search wiki"
      />
      {loading && (
        <p className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-secondary)]">
          검색 중…
        </p>
      )}
      {hits.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full vf-card divide-y divide-black/5 max-h-80 overflow-auto">
          {hits.map((h) => (
            <li key={h.slug} className="p-3 hover:bg-black/5">
              <Link
                href={`/wiki/${h.slug}` as Route}
                className="text-[var(--text-primary)] font-medium"
              >
                {h.title}
              </Link>
              <span className="text-xs text-[var(--text-secondary)] ml-2">{h.slug}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
```

Keep the imports and the `useState`/`useEffect` block above unchanged.

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add components/wiki/SearchBox.tsx
git commit -m "style(wiki): SearchBox pill input + popover dropdown"
```

---

## Phase F: Mobile responsive (Task 2.17)

### Task 2.17: Sidebar drawer for mobile

The AppShell's sidebar is hidden below `md` breakpoint. We add a "메뉴" button in `SiteHeader` that toggles a `<details>`-based drawer above the main content for mobile only. Pure CSS toggle keeps it server-renderable; no client component needed.

**Files:**
- Modify: `components/layout/AppShell.tsx`

- [ ] **Step 1: Replace the AppShell file with the mobile-drawer-aware version**

```tsx
// components/layout/AppShell.tsx
import { SiteHeader } from "./SiteHeader";

interface Props {
  sidebar: React.ReactNode;
  main: React.ReactNode;
  right?: React.ReactNode;
  headerSearch?: React.ReactNode;
}

export function AppShell({ sidebar, main, right, headerSearch }: Props) {
  return (
    <div className="min-h-screen p-4 md:p-6 bg-[var(--bg-gradient)]">
      <SiteHeader searchSlot={headerSearch} />

      <details className="mt-4 md:hidden vf-card">
        <summary className="px-4 py-3 cursor-pointer text-sm font-semibold">
          카테고리
        </summary>
        <div className="px-2 pb-3">{sidebar}</div>
      </details>

      <div className="mt-6 grid gap-6 grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] lg:grid-cols-[220px_minmax(0,1fr)_280px]">
        <aside className="hidden md:block" data-testid="appshell-sidebar">{sidebar}</aside>
        <main data-testid="appshell-main">{main}</main>
        {right && (
          <aside className="hidden lg:block" data-testid="appshell-right">{right}</aside>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run AppShell unit tests — must still pass (the existing tests check for slots, not breakpoints)**

```bash
npx vitest run components/layout/AppShell.test.tsx
```
Expected: 2 pass.

- [ ] **Step 3: Commit**

```bash
git add components/layout/AppShell.tsx
git commit -m "feat(layout): mobile <details> drawer for sidebar"
```

---

## Phase G: E2E + final sanity (Tasks 2.18 – 2.20)

### Task 2.18: Update existing e2e for new selectors

**Files:**
- Modify: `tests/e2e/wiki-render.spec.ts`

The existing tests check role/text selectors that survive the refactor — heading "Wiki", links with seed page titles, search box, etc. The one risky assertion is the backlinks test that checks `getByRole("heading", { name: "이 페이지를 인용한 곳" })`. Backlinks is now an `<h2>` inside a `<nav>`, still rendered, still discoverable by name. No edits required.

- [ ] **Step 1: Run existing e2e to verify it still passes**

```bash
npx playwright test
```
Expected: 6/6 pass. If "이 페이지를 인용한 곳" test fails because it's now visually hidden behind `lg:` breakpoint:

- [ ] **Step 2 (only if Step 1 fails on backlinks visibility): widen the Playwright viewport**

Edit `playwright.config.ts` `use` block to add:

```typescript
    viewport: { width: 1280, height: 800 },
```

Re-run:

```bash
npx playwright test
```
Expected: 6/6 pass.

- [ ] **Step 3: Commit (only if config edited)**

```bash
git add playwright.config.ts
git commit -m "test(e2e): widen viewport to 1280 so right panel is visible in tests"
```

---

### Task 2.19: New e2e — visual shell smoke

**Files:**
- Create: `tests/e2e/visual-shell.spec.ts`

- [ ] **Step 1: Write the test**

```typescript
// tests/e2e/visual-shell.spec.ts
import { test, expect } from "@playwright/test";

test.describe("visual shell", () => {
  test("homepage hero shows VibeForge title and CTA", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "VibeForge", level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: /Wiki 둘러보기/ })).toBeVisible();
  });

  test("wiki page renders sidebar with category dots and right panel TOC", async ({ page }) => {
    await page.goto("/wiki/data-handling/what-is-an-index");
    await expect(page.getByRole("navigation", { name: "Categories" })).toBeVisible();
    await expect(page.getByText("데이터 다루기").first()).toBeVisible();
    // TOC may be empty if the page has no h2 — skip strict assertion. Backlinks always present here.
    await expect(page.getByRole("navigation", { name: "Backlinks" })).toBeVisible();
  });

  test("Pretendard font is applied to body", async ({ page }) => {
    await page.goto("/");
    const family = await page.evaluate(() =>
      window.getComputedStyle(document.body).fontFamily
    );
    expect(family).toMatch(/Pretendard/);
  });
});
```

- [ ] **Step 2: Run the new spec**

```bash
npx playwright test tests/e2e/visual-shell.spec.ts
```
Expected: 3/3 pass.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/visual-shell.spec.ts
git commit -m "test(e2e): visual shell smoke (hero, sidebar, TOC, font)"
```

---

### Task 2.20: Final sanity baseline + tag

**Files:** none (verification + tag only)

- [ ] **Step 1: Typecheck**

```bash
npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 2: Unit tests**

```bash
npx vitest run
```
Expected: all suites green. New: SiteHeader (2), AppShell (2), Sidebar (2), TableOfContents (2), RightPanel (1), categories (3), page-loader (3) = 15 new tests on top of Plan 1's 35 → 50 total.

- [ ] **Step 3: Build**

```bash
npm run build
```
Expected: prerenders the same 9 routes as Plan 1 (3 wiki pages, 5 tag pages, 1 wiki index, plus `/`, `/api/search`). 0 errors.

- [ ] **Step 4: All e2e**

```bash
npx playwright test
```
Expected: 9/9 pass (6 from Plan 1 + 3 new from Task 2.19).

- [ ] **Step 5: Tag the branch**

```bash
git tag plan2-visual-design-3col
```

- [ ] **Step 6: Verify branch and tag**

```bash
git log --oneline -1
git tag -l plan2-*
```
Expected: latest commit on `plan2/visual-design-3col`, tag `plan2-visual-design-3col` present.

---

## Self-Review Notes

**Spec coverage check:**
- 3-column layout → Tasks 2.5, 2.10–2.13 ✓
- Purple/pink gradient bg → Tasks 2.2, 2.10 ✓
- White rounded cards → `.vf-card` utility (Task 2.10) applied throughout ✓
- Gradient CTA → Task 2.14 (homepage hero) ✓
- Category color coding → Tasks 2.3, 2.6, 2.12 ✓
- Pretendard self-host → Tasks 2.1, 2.2, 2.10 ✓
- SiteHeader (logo + nav + search + auth state) → Task 2.4 (auth state shown as placeholder; auth wiring is Plan 3) ✓
- Sidebar category tree with current-page hilite → Task 2.6 ✓
- RightPanel TOC + Backlinks → Tasks 2.7, 2.8, 2.11 ✓
- Mobile drawer → Task 2.17 ✓
- Wiki page card / index card grid / tag page card / homepage hero → Tasks 2.11–2.14 ✓
- Plan 1 deferred #1 (double vault scan) → Tasks 2.9, 2.12 ✓
- Plan 1 deferred #2 (`dynamicParams = false`) → Task 2.13 ✓
- Plan 1 deferred #3 (`WIKI_LINK_RE` duplication) → not addressed; Plan 2 does not touch wiki-link/backlinks modules. Defer to a later plan that does.

**Out-of-scope verified absent from plan:**
- Forum, Q&A backlinks, graph view, giscus, About page — none implemented. ✓
- Auth (Supabase) — not wired; SiteHeader shows no auth widget. ✓

**Frontend-design skill:** The plan ships with concrete tokens from the spec. If the controller wishes to invoke `superpowers:frontend-design` against `design.png` during execution, do it before Task 2.2 and overwrite the values in `lib/design/tokens.css` and `lib/design/categories.ts` — no structural change needed.

**Risk:** Playwright viewport may need to be 1280+ for the right panel to appear; Task 2.18 Step 2 covers this contingency.

---

## Execution Handoff

This plan is ready for `superpowers:subagent-driven-development`. Each task is self-contained with full code; the implementer subagent does not need to read this file or the spec — the controller passes the task text verbatim.
