# Mobile-First Responsive Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert VibeForge from desktop-only to mobile-first responsive — bottom tab bar nav, sticky-mini TOC, segmented related-content card, landing-page typography clamps — without changing data, routes, or desktop visuals.

**Architecture:** 4 phased commits ("PRs"). Phase 1 lays the foundation (tokens, prose responsive, AppShell rebuild, new `<BottomTabBar>` + `<MobileMenu>`). Phase 2 builds wiki-page mobile components (`<MobileStickyTOC>`, `<WikiPageMeta>`). Phase 3 mobile-fies forum components. Phase 4 polishes landing + accessibility + adds Playwright smoke. Each phase keeps desktop pixel-identical via clamp `max` = current fixed value and `lg:hidden` gating of mobile-only components.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Tailwind 4 (CSS-first config), Vitest + jsdom + React Testing Library (unit), Playwright (E2E). Token-driven design system in `lib/design/tokens.css`.

**Source spec:** `docs/superpowers/specs/2026-05-04-mobile-first-responsive-design.md`

**Branch strategy:** Work on `plan3/supabase-forum` (current). Each phase ends with a single commit. Friend-PR demo can pause between any two phases.

---

## File Structure

### Created
- `components/layout/BottomTabBar.tsx` + `BottomTabBar.test.tsx` — fixed bottom nav (Wiki/Forum/Graph/About), `lg:hidden`.
- `components/layout/MobileMenu.tsx` + `MobileMenu.test.tsx` — slide-in sheet for search/auth/about/admin.
- `components/layout/MobileHeaderControls.tsx` — client component holding menu open/close state; rendered inside server `SiteHeader`.
- `components/wiki/useActiveHeading.ts` + `useActiveHeading.test.ts` — IntersectionObserver hook tracking visible heading id.
- `components/wiki/MobileStickyTOC.tsx` + `MobileStickyTOC.test.tsx` — sticky bar + bottom sheet TOC for `<lg`.
- `components/wiki/WikiPageMeta.tsx` + `WikiPageMeta.test.tsx` — segmented control wrapping Backlinks / RelatedQA / Giscus for `<lg`.
- `tests/e2e/mobile.spec.ts` — Playwright smoke at viewport 375×667.

### Modified
- `lib/design/tokens.css` — clamp-based display/headline/body tokens, `--touch-target`.
- `app/globals.css` — `.prose` table/img responsive, `.btn-hero` group responsive.
- `components/brand/Wordmark.tsx` — `hero` config gains responsive `mark` size + `gap`.
- `components/layout/AppShell.tsx` — remove `<details>` sidebar, mount `BottomTabBar`, add bottom padding.
- `components/layout/SiteHeader.tsx` — mobile reduction (logo + search icon + hamburger via `<MobileHeaderControls>`); desktop nav `hidden lg:flex`.
- `components/wiki/WikiPage.tsx` — prop accepts mobile rail children; renders `<MobileStickyTOC>` above body and `<WikiPageMeta>` below body, `lg:hidden`.
- `app/wiki/[...slug]/page.tsx` — pass mobile-only related/Q&A/comments to WikiPage.
- `components/forum/PostCard.tsx` — flex-wrap meta, `min-h-[var(--touch-target)]`, focus-visible.
- `components/forum/CommentItem.tsx` — header flex-wrap, action tap targets.
- `components/forum/CommentForm.tsx` — submit button `w-full sm:w-auto`.
- `components/forum/NewPostForm.tsx` — button row `flex-col sm:flex-row`.
- `app/forum/post/[id]/page.tsx` — header `flex-col sm:flex-row`.
- `app/page.tsx` — remove `<br />`s, lower h2 clamp min, `text-balance`, button group responsive, padding adjustment.

### Deleted
None.

---

## Pre-flight Sanity (run once)

- [ ] **Step 0.1: Confirm clean tree on the right branch**

```bash
git status
git rev-parse --abbrev-ref HEAD
```

Expected: working tree clean; branch `plan3/supabase-forum`.

- [ ] **Step 0.2: Confirm baseline tests pass**

```bash
npm run typecheck
npm run lint
npm test
```

Expected: all three pass.

---

## Phase 1 — Foundation

Goal: tokens, Wordmark, prose responsive, new `BottomTabBar` + `MobileMenu`, AppShell + SiteHeader rebuild. No mobile-page-specific changes yet.

### Task 1.1: Update design tokens — clamp + touch target

**Files:**
- Modify: `lib/design/tokens.css:55-66` (display/body tokens) + insert new `--touch-target` near spacing.

- [ ] **Step 1.1.1: Edit `lib/design/tokens.css` — replace the typography block**

Replace lines 55–66 (the `/* === Typography size scale === */` block):

```css
  /* === Typography size scale (Figma display + body) === */
  /* Tokens use clamp(min, prefer, max) so they scale on mobile while
     remaining pixel-identical to the previous fixed value at desktop widths
     (the max). At 1280px viewport: 12vw = 153.6px, 11vw = 140.8px etc. — well
     above each max — so desktop hits the cap and visuals are unchanged. */
  --t-display-xl: clamp(40px, 12vw, 86px); /* hero headlines */
  --t-display-lg: clamp(40px, 11vw, 64px); /* section openers */
  --t-headline:   clamp(22px, 4.5vw, 26px); /* in-block titles */
  --t-subhead:    clamp(22px, 4.5vw, 26px); /* same size, different weight */
  --t-card-title: 24px;
  --t-body-lg:    clamp(17px, 4vw, 20px);
  --t-body:       18px;
  --t-body-sm:    16px;
  --t-button:     20px;
  --t-eyebrow:    18px;   /* mono uppercase */
  --t-caption:    12px;   /* mono uppercase */
```

- [ ] **Step 1.1.2: Add `--touch-target` token in spacing block**

In `lib/design/tokens.css`, locate the `/* === Spacing (8px base) === */` block and append before the closing of that group (around line 44, before `--s-section`):

```css
  /* === Touch target (WCAG 2.1 SC 2.5.5 minimum) === */
  --touch-target: 44px;
```

Place between `--s-xxl: 48px;` and `--s-section: 96px;` for grouping.

- [ ] **Step 1.1.3: Verify desktop renders identical**

```bash
npm run dev
```

Open `http://localhost:3000/` at viewport ≥1280px. The hero "VibeForge" wordmark and "배우고, 토론하고, 성장하세요" h2 must look identical to before (clamp `max` cap engaged).

Stop the dev server (Ctrl-C).

- [ ] **Step 1.1.4: Verify mobile shrinks**

```bash
npm run dev
```

Open `http://localhost:3000/` at viewport 375px (DevTools device toolbar). Wordmark hero should now be ~41px (was 64px); h2 should be ~21px (was 28px). Stop the dev server.

- [ ] **Step 1.1.5: Commit**

```bash
git add lib/design/tokens.css
git commit -m "feat(tokens): clamp display/body tokens for mobile, add --touch-target"
```

---

### Task 1.2: Wordmark `hero` responsive mark + gap

**Files:**
- Modify: `components/brand/Wordmark.tsx`.

The `hero` size's `mark: 56` is a fixed JS number, so it doesn't auto-scale with the clamped `--t-display-lg` font. Make the mark size scale alongside the wordmark.

- [ ] **Step 1.2.1: Replace SIZE_CONFIG and BrandMark usage**

Open `components/brand/Wordmark.tsx`. Replace its entire contents with:

```tsx
// components/brand/Wordmark.tsx — shared "VibeForge" wordmark + brand mark.
// Two-block geometric mark echoes color-block vocabulary; "Vibe" sits at the
// design-system display weight (340) and "Forge" picks up --brand-gradient at
// weight 700 — same single-voice-flex pattern across header and hero.

type WordmarkSize = "header" | "hero";

interface SizeCfg {
  font: string;
  /** Fixed mark px (header) or null when responsive (hero). */
  mark: number | null;
  /** When mark is null, BrandMark uses an em-based size instead. */
  markEm?: number;
  tracking: string;
  /** Tailwind gap class applied at base; overridden via the second value at sm: */
  gapBase: string;
  gapSm?: string;
}

const SIZE_CONFIG: Record<WordmarkSize, SizeCfg> = {
  header: {
    font: "var(--t-card-title)",
    mark: 22,
    tracking: "-0.02em",
    gapBase: "gap-2.5",
  },
  hero: {
    font: "var(--t-display-lg)",
    // mark scales with the clamped font: 0.875em → ≈ 35px @ 40px font, ≈ 56px @ 64px font.
    mark: null,
    markEm: 0.875,
    tracking: "-0.045em",
    gapBase: "gap-3",
    gapSm: "sm:gap-5",
  },
};

interface BrandMarkProps {
  size?: number;
  /** When provided, overrides numeric size with em-based sizing (font-relative). */
  sizeEm?: number;
}

export function BrandMark({ size = 22, sizeEm }: BrandMarkProps) {
  const style = sizeEm !== undefined
    ? { width: `${sizeEm}em`, height: `${sizeEm}em` }
    : undefined;
  return (
    <svg
      viewBox="0 0 24 24"
      width={sizeEm !== undefined ? undefined : size}
      height={sizeEm !== undefined ? undefined : size}
      style={style}
      aria-hidden="true"
      className="shrink-0"
    >
      <rect x="2.5" y="5.5" width="9" height="15" rx="1.6" fill="var(--brand-from)" />
      <rect x="12.5" y="2.5" width="9" height="15" rx="1.6" fill="var(--brand-to)" />
    </svg>
  );
}

interface WordmarkProps {
  size?: WordmarkSize;
  className?: string;
  showMark?: boolean;
}

export function Wordmark({
  size = "header",
  className = "",
  showMark = true,
}: WordmarkProps) {
  const cfg = SIZE_CONFIG[size];
  const gapClasses = [cfg.gapBase, cfg.gapSm].filter(Boolean).join(" ");
  return (
    <span
      aria-label="VibeForge"
      className={`inline-flex items-center ${gapClasses} leading-none ${className}`}
      style={{ fontSize: cfg.font, letterSpacing: cfg.tracking }}
    >
      {showMark && (
        cfg.mark !== null
          ? <BrandMark size={cfg.mark} />
          : <BrandMark sizeEm={cfg.markEm} />
      )}
      <span className="whitespace-nowrap">
        <span style={{ fontWeight: 340 }}>Vibe</span><span
          className="bg-clip-text text-transparent"
          style={{ backgroundImage: "var(--brand-gradient)", fontWeight: 700 }}
        >Forge</span>
      </span>
    </span>
  );
}
```

- [ ] **Step 1.2.2: Run typecheck**

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 1.2.3: Visual check**

```bash
npm run dev
```

Open `/` at 375px viewport — wordmark + mark should both be smaller, fitting inside the hero card. Open at 1440px — should look identical to before. Stop the dev server.

- [ ] **Step 1.2.4: Commit**

```bash
git add components/brand/Wordmark.tsx
git commit -m "feat(brand): scale Wordmark hero mark with clamped font (em-based)"
```

---

### Task 1.3: Wiki prose responsive — table/img/pre

**Files:**
- Modify: `app/globals.css` — append after the existing `.prose pre` rule (line ~94).

- [ ] **Step 1.3.1: Append responsive prose overrides**

Append the following block to `app/globals.css` (after the closing `}` of `.prose pre code` rule at ~line 94):

```css
/* Mobile-responsive prose elements. Tables become horizontally scrollable
   instead of pushing the viewport; images respect container width; long
   <pre> code overflows internally instead of breaking layout. */
.prose table {
  display: block;
  max-width: 100%;
  overflow-x: auto;
}
.prose pre {
  overflow-x: auto;
  max-width: 100%;
}
.prose img {
  max-width: 100%;
  height: auto;
}
```

- [ ] **Step 1.3.2: Visual check at 375px**

```bash
npm run dev
```

Visit a wiki page known to have a wide table, e.g. `/wiki/concepts/SQL` or any page with a `| col | col | col |` table. At 375px viewport the table area should scroll horizontally inside its container (no body horizontal scrollbar). Stop the dev server.

- [ ] **Step 1.3.3: Commit**

```bash
git add app/globals.css
git commit -m "feat(prose): mobile-responsive tables, code blocks, images"
```

---

### Task 1.4: Build `<BottomTabBar>` (TDD)

**Files:**
- Create: `components/layout/BottomTabBar.tsx`
- Test: `components/layout/BottomTabBar.test.tsx`

- [ ] **Step 1.4.1: Write the failing test**

Create `components/layout/BottomTabBar.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { BottomTabBar } from "./BottomTabBar";

const usePathnameMock = vi.fn<() => string>();

vi.mock("next/navigation", () => ({
  usePathname: () => usePathnameMock(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

describe("BottomTabBar", () => {
  beforeEach(() => {
    usePathnameMock.mockReset();
  });
  afterEach(() => cleanup());

  it("renders four tabs in order: Wiki, Forum, Graph, About", () => {
    usePathnameMock.mockReturnValue("/");
    render(<BottomTabBar />);
    const labels = screen.getAllByRole("link").map((a) => a.textContent);
    expect(labels).toEqual(["Wiki", "Forum", "Graph", "About"]);
  });

  it("marks Wiki active when path is /wiki", () => {
    usePathnameMock.mockReturnValue("/wiki");
    render(<BottomTabBar />);
    expect(screen.getByRole("link", { name: "Wiki" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Forum" })).not.toHaveAttribute("aria-current");
  });

  it("marks Wiki active for any /wiki/<sub> path", () => {
    usePathnameMock.mockReturnValue("/wiki/concepts/SQL");
    render(<BottomTabBar />);
    expect(screen.getByRole("link", { name: "Wiki" })).toHaveAttribute("aria-current", "page");
  });

  it("marks Graph active for /wiki/graph (more specific match wins over Wiki)", () => {
    usePathnameMock.mockReturnValue("/wiki/graph");
    render(<BottomTabBar />);
    expect(screen.getByRole("link", { name: "Graph" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Wiki" })).not.toHaveAttribute("aria-current");
  });

  it("marks Forum active for /forum/post/<id>", () => {
    usePathnameMock.mockReturnValue("/forum/post/abc-123");
    render(<BottomTabBar />);
    expect(screen.getByRole("link", { name: "Forum" })).toHaveAttribute("aria-current", "page");
  });

  it("hides on lg breakpoint via lg:hidden class", () => {
    usePathnameMock.mockReturnValue("/");
    render(<BottomTabBar />);
    const nav = screen.getByRole("navigation", { name: /bottom/i });
    expect(nav.className).toMatch(/lg:hidden/);
  });
});
```

- [ ] **Step 1.4.2: Run test — verify it fails**

```bash
npx vitest run components/layout/BottomTabBar.test.tsx
```

Expected: FAIL — `Cannot find module './BottomTabBar'`.

- [ ] **Step 1.4.3: Implement `BottomTabBar`**

Create `components/layout/BottomTabBar.tsx`:

```tsx
"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";

interface Tab {
  href: Route;
  label: string;
  icon: string;
  /** Path prefixes that count as "active" for this tab. Order matters: more
   *  specific entries (e.g. /wiki/graph) must be listed in their own tab,
   *  and resolveActive() checks specificity by length. */
  matches: string[];
}

const TABS: Tab[] = [
  { href: "/wiki" as Route,       label: "Wiki",  icon: "📖", matches: ["/wiki"] },
  { href: "/forum" as Route,      label: "Forum", icon: "💬", matches: ["/forum"] },
  { href: "/wiki/graph" as Route, label: "Graph", icon: "🕸",  matches: ["/wiki/graph"] },
  { href: "/about" as Route,      label: "About", icon: "ℹ️", matches: ["/about"] },
];

function resolveActive(pathname: string): Tab | null {
  // Pick the tab whose longest matching prefix is the longest among all matches.
  let best: { tab: Tab; len: number } | null = null;
  for (const tab of TABS) {
    for (const prefix of tab.matches) {
      if (pathname === prefix || pathname.startsWith(prefix + "/")) {
        if (!best || prefix.length > best.len) {
          best = { tab, len: prefix.length };
        }
      }
    }
  }
  return best?.tab ?? null;
}

export function BottomTabBar() {
  const pathname = usePathname() ?? "/";
  const active = resolveActive(pathname);
  return (
    <nav
      aria-label="Bottom navigation"
      className="lg:hidden fixed inset-x-0 bottom-0 z-40 bg-[var(--canvas)] border-t border-[var(--hairline)] pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="flex">
        {TABS.map((tab) => {
          const isActive = active === tab;
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex flex-col items-center justify-center gap-1 min-h-[var(--touch-target)] py-2 text-[11px] font-medium ${
                  isActive
                    ? "text-[var(--brand-from)]"
                    : "text-[var(--ink-muted)]"
                }`}
              >
                <span aria-hidden="true" className="text-base leading-none">
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
```

- [ ] **Step 1.4.4: Run test — verify pass**

```bash
npx vitest run components/layout/BottomTabBar.test.tsx
```

Expected: PASS — 6 tests pass.

- [ ] **Step 1.4.5: Commit**

```bash
git add components/layout/BottomTabBar.tsx components/layout/BottomTabBar.test.tsx
git commit -m "feat(layout): add BottomTabBar (Wiki/Forum/Graph/About) for <lg viewports"
```

---

### Task 1.5: Build `<MobileMenu>` (TDD)

**Files:**
- Create: `components/layout/MobileMenu.tsx`
- Test: `components/layout/MobileMenu.test.tsx`

- [ ] **Step 1.5.1: Write the failing test**

Create `components/layout/MobileMenu.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MobileMenu } from "./MobileMenu";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

describe("MobileMenu", () => {
  afterEach(() => cleanup());

  it("renders nothing when closed", () => {
    render(
      <MobileMenu open={false} onClose={() => {}} isAdmin={false}>
        <span data-testid="search-slot" />
      </MobileMenu>
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renders dialog with search slot, About, login when open", () => {
    render(
      <MobileMenu open={true} onClose={() => {}} isAdmin={false}>
        <span data-testid="search-slot">SEARCH</span>
      </MobileMenu>
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByTestId("search-slot")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /About/i })).toBeInTheDocument();
  });

  it("renders Admin link only when isAdmin=true", () => {
    const { rerender } = render(
      <MobileMenu open={true} onClose={() => {}} isAdmin={false}>
        <span />
      </MobileMenu>
    );
    expect(screen.queryByRole("link", { name: /Admin/i })).toBeNull();

    rerender(
      <MobileMenu open={true} onClose={() => {}} isAdmin={true}>
        <span />
      </MobileMenu>
    );
    expect(screen.getByRole("link", { name: /Admin/i })).toBeInTheDocument();
  });

  it("calls onClose when backdrop is clicked", () => {
    const onClose = vi.fn();
    render(
      <MobileMenu open={true} onClose={onClose} isAdmin={false}>
        <span />
      </MobileMenu>
    );
    const backdrop = screen.getByTestId("mobilemenu-backdrop");
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when Escape is pressed", () => {
    const onClose = vi.fn();
    render(
      <MobileMenu open={true} onClose={onClose} isAdmin={false}>
        <span />
      </MobileMenu>
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("does not call onClose on Escape when closed", () => {
    const onClose = vi.fn();
    render(
      <MobileMenu open={false} onClose={onClose} isAdmin={false}>
        <span />
      </MobileMenu>
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 1.5.2: Run test — verify it fails**

```bash
npx vitest run components/layout/MobileMenu.test.tsx
```

Expected: FAIL — `Cannot find module './MobileMenu'`.

- [ ] **Step 1.5.3: Implement `MobileMenu`**

Create `components/layout/MobileMenu.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import Link from "next/link";
import type { Route } from "next";
import { AuthButton } from "./AuthButton";

interface Props {
  open: boolean;
  onClose: () => void;
  isAdmin: boolean;
  /** Search component injected by SiteHeader (typically <SearchBox />). */
  children: React.ReactNode;
}

export function MobileMenu({ open, onClose, isAdmin, children }: Props) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Mobile menu"
      className="lg:hidden fixed inset-0 z-50 flex justify-end"
    >
      <button
        type="button"
        aria-label="Close menu"
        data-testid="mobilemenu-backdrop"
        className="absolute inset-0 bg-[var(--overlay-scrim)]"
        onClick={onClose}
      />
      <div className="relative w-[80%] max-w-sm bg-[var(--canvas)] border-l border-[var(--hairline)] shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--hairline)]">
          <span className="font-mono uppercase text-[11px] tracking-[0.22em] text-[var(--ink-muted)]">
            메뉴
          </span>
          <button
            type="button"
            aria-label="Close menu"
            onClick={onClose}
            className="min-h-[var(--touch-target)] min-w-[var(--touch-target)] flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink)]"
          >
            ✕
          </button>
        </div>

        <div className="px-4 py-3 border-b border-[var(--hairline)]">
          {children}
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-2">
          <ul className="space-y-1">
            <li>
              <Link
                href={"/about" as Route}
                onClick={onClose}
                className="flex items-center min-h-[var(--touch-target)] px-3 rounded-[var(--r-md)] text-[var(--ink)] hover:bg-[var(--hairline-soft)]"
              >
                ℹ️&nbsp; About
              </Link>
            </li>
            {isAdmin && (
              <li>
                <Link
                  href={"/admin" as Route}
                  onClick={onClose}
                  className="flex items-center min-h-[var(--touch-target)] px-3 rounded-[var(--r-md)] text-[var(--ink)] hover:bg-[var(--hairline-soft)]"
                >
                  🛡️&nbsp; Admin
                </Link>
              </li>
            )}
          </ul>
        </nav>

        <div className="px-4 py-3 border-t border-[var(--hairline)]">
          <AuthButton />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 1.5.4: Run test — verify pass**

```bash
npx vitest run components/layout/MobileMenu.test.tsx
```

Expected: PASS — 6 tests pass.

- [ ] **Step 1.5.5: Commit**

```bash
git add components/layout/MobileMenu.tsx components/layout/MobileMenu.test.tsx
git commit -m "feat(layout): add MobileMenu sheet (search/About/Admin/Auth) for <lg viewports"
```

---

### Task 1.6: Add `<MobileHeaderControls>` (client wrapper)

**Files:**
- Create: `components/layout/MobileHeaderControls.tsx`

This is a client component that holds the menu open/close state and renders the hamburger button + `<MobileMenu>`. It's rendered by the server `SiteHeader`, which passes `isAdmin` and the `<SearchBox />` instance as `searchSlot`.

- [ ] **Step 1.6.1: Create the file**

Create `components/layout/MobileHeaderControls.tsx`:

```tsx
"use client";

import { useState } from "react";
import { MobileMenu } from "./MobileMenu";

interface Props {
  isAdmin: boolean;
  searchSlot: React.ReactNode;
}

export function MobileHeaderControls({ isAdmin, searchSlot }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="lg:hidden min-h-[var(--touch-target)] min-w-[var(--touch-target)] flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink)]"
      >
        <span aria-hidden="true" className="text-xl leading-none">☰</span>
      </button>
      <MobileMenu open={open} onClose={() => setOpen(false)} isAdmin={isAdmin}>
        {searchSlot}
      </MobileMenu>
    </>
  );
}
```

- [ ] **Step 1.6.2: Typecheck**

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 1.6.3: Commit**

```bash
git add components/layout/MobileHeaderControls.tsx
git commit -m "feat(layout): add MobileHeaderControls client wrapper for hamburger + sheet"
```

---

### Task 1.7: Restructure `SiteHeader` for mobile

**Files:**
- Modify: `components/layout/SiteHeader.tsx` (full replace).

Mobile (`<lg`): logo + hamburger only — search and nav move into the sheet.
Desktop (`lg+`): unchanged from current — logo + tagline + nav + search + auth in one row.

- [ ] **Step 1.7.1: Replace `SiteHeader.tsx`**

Replace the entire contents of `components/layout/SiteHeader.tsx`:

```tsx
// components/layout/SiteHeader.tsx
import Link from "next/link";
import type { Route } from "next";
import { AuthButton } from "./AuthButton";
import { MobileHeaderControls } from "./MobileHeaderControls";
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
    <Card className="px-4 sm:px-6 lg:px-8 py-3 lg:py-4 flex items-center gap-3 lg:gap-7">
      <div className="flex items-center gap-3 flex-1 lg:flex-initial">
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

      {/* Desktop divider + nav + search + auth — hidden on mobile/tablet. */}
      <span
        aria-hidden="true"
        className="hidden lg:block h-6 w-px bg-[var(--hairline)]"
      />
      <nav
        aria-label="Primary"
        className="hidden lg:flex gap-5 text-[15px] text-[var(--ink-muted)]"
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
      {searchSlot && (
        <div className="hidden lg:block flex-1 max-w-md">{searchSlot}</div>
      )}
      <div className="hidden lg:block">
        <AuthButton />
      </div>

      {/* Mobile/tablet — hamburger that opens the sheet. */}
      <MobileHeaderControls isAdmin={isAdmin} searchSlot={searchSlot} />
    </Card>
  );
}
```

- [ ] **Step 1.7.2: Typecheck**

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 1.7.3: Manual check**

```bash
npm run dev
```

- 1440px viewport: header looks identical to before (logo + tagline + nav + search + auth in row).
- 375px viewport: header shows logo + hamburger ☰. Tap hamburger → sheet slides in from right with search box, About link, login button. Tap backdrop or ✕ → sheet closes.

Stop the dev server.

- [ ] **Step 1.7.4: Commit**

```bash
git add components/layout/SiteHeader.tsx
git commit -m "feat(header): mobile reduction to logo+hamburger; nav stays on lg+"
```

---

### Task 1.8: Restructure `AppShell` — remove `<details>`, mount `BottomTabBar`

**Files:**
- Modify: `components/layout/AppShell.tsx` (full replace).

- [ ] **Step 1.8.1: Replace `AppShell.tsx`**

Replace the entire contents of `components/layout/AppShell.tsx`:

```tsx
// components/layout/AppShell.tsx
import { SiteHeader } from "./SiteHeader";
import { BottomTabBar } from "./BottomTabBar";

interface Props {
  sidebar: React.ReactNode;
  main: React.ReactNode;
  right?: React.ReactNode;
  headerSearch?: React.ReactNode;
}

export function AppShell({ sidebar, main, right, headerSearch }: Props) {
  return (
    <div className="min-h-screen p-4 md:p-6 pb-[calc(64px+env(safe-area-inset-bottom))] lg:pb-6">
      <SiteHeader searchSlot={headerSearch} />

      <div className="mt-6 grid gap-6 grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)_280px]">
        <aside className="hidden lg:block" data-testid="appshell-sidebar">{sidebar}</aside>
        <main data-testid="appshell-main">{main}</main>
        {right && (
          <aside className="hidden lg:block" data-testid="appshell-right">{right}</aside>
        )}
      </div>

      <BottomTabBar />
    </div>
  );
}
```

Notes:
- `<details>` mobile sidebar removed entirely.
- Sidebar visibility moves from `md:block` to `lg:block` — so the desktop 3-col layout activates only at ≥1024px. md (768–1023px) gets single-column main + bottom tab bar (matches the spec's "tablet still gets bottom tab bar" decision).
- The grid no longer has an `md:` middle layout; it goes straight from 1-col to 3-col at lg.
- Bottom padding compensates for the fixed `BottomTabBar` (~56px tab cells + safe-area).

- [ ] **Step 1.8.2: Typecheck + lint**

```bash
npm run typecheck
npm run lint
```

Expected: both PASS.

- [ ] **Step 1.8.3: Manual check**

```bash
npm run dev
```

- 1440px: layout 3-col (sidebar / main / right) — identical to before.
- 1024px: same 3-col (`lg` = 1024px breakpoint).
- 800px: single-column main, bottom tab bar visible at bottom.
- 375px: same single-column main + bottom tab bar; tap "Forum" tab → navigates to `/forum`.

Stop the dev server.

- [ ] **Step 1.8.4: Run all tests**

```bash
npm test
```

Expected: all pre-existing tests PASS, plus the two new test files (BottomTabBar, MobileMenu) PASS.

- [ ] **Step 1.8.5: Commit**

```bash
git add components/layout/AppShell.tsx
git commit -m "feat(layout): mount BottomTabBar in AppShell, drop <details> mobile sidebar"
```

---

### Task 1.9: Phase 1 — final regression sweep

- [ ] **Step 1.9.1: Run full test + lint + typecheck**

```bash
npm run typecheck && npm run lint && npm test
```

Expected: all PASS.

- [ ] **Step 1.9.2: Manual desktop regression at 1440px**

```bash
npm run dev
```

Visit each page and confirm visually unchanged from main:
- `/`
- `/wiki`
- `/wiki/concepts/SQL` (or any wiki page)
- `/forum`
- `/forum/qa`
- `/forum/post/<existing id>`
- `/about`

Stop the dev server. If anything has shifted at 1440px, fix before proceeding.

---

## Phase 2 — Wiki page (mobile sticky TOC + segmented related card)

### Task 2.1: `useActiveHeading` hook (TDD)

**Files:**
- Create: `components/wiki/useActiveHeading.ts`
- Test: `components/wiki/useActiveHeading.test.ts`

The hook observes `<h2>` and `<h3>` elements inside a container ref and returns the id of the first heading currently intersecting the viewport top region.

- [ ] **Step 2.1.1: Write the failing test**

Create `components/wiki/useActiveHeading.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useActiveHeading } from "./useActiveHeading";

type Cb = (entries: IntersectionObserverEntry[]) => void;

class MockIO {
  static last: MockIO | null = null;
  cb: Cb;
  observed: Element[] = [];
  constructor(cb: Cb) {
    this.cb = cb;
    MockIO.last = this;
  }
  observe(el: Element) { this.observed.push(el); }
  unobserve() {}
  disconnect() {}
  trigger(visibleIds: string[]) {
    const entries = this.observed.map((el) => ({
      target: el,
      isIntersecting: visibleIds.includes((el as HTMLElement).id),
    })) as unknown as IntersectionObserverEntry[];
    this.cb(entries);
  }
}

describe("useActiveHeading", () => {
  beforeEach(() => {
    (globalThis as unknown as { IntersectionObserver: typeof IntersectionObserver })
      .IntersectionObserver = MockIO as unknown as typeof IntersectionObserver;
  });
  afterEach(() => {
    MockIO.last = null;
  });

  it("returns null when container has no headings", () => {
    const container = document.createElement("div");
    const { result } = renderHook(() =>
      useActiveHeading({ current: container })
    );
    expect(result.current).toBeNull();
  });

  it("returns first heading id on initial mount when intersecting", () => {
    const container = document.createElement("div");
    container.innerHTML = `
      <h2 id="intro">Intro</h2>
      <h2 id="middle">Middle</h2>
      <h2 id="end">End</h2>
    `;
    const { result } = renderHook(() => useActiveHeading({ current: container }));
    act(() => MockIO.last!.trigger(["intro"]));
    expect(result.current).toBe("intro");
  });

  it("updates active heading when intersection changes", () => {
    const container = document.createElement("div");
    container.innerHTML = `
      <h2 id="a">A</h2>
      <h3 id="b">B</h3>
      <h2 id="c">C</h2>
    `;
    const { result } = renderHook(() => useActiveHeading({ current: container }));
    act(() => MockIO.last!.trigger(["a"]));
    expect(result.current).toBe("a");
    act(() => MockIO.last!.trigger(["c"]));
    expect(result.current).toBe("c");
  });

  it("falls back to last-seen heading when nothing intersects", () => {
    const container = document.createElement("div");
    container.innerHTML = `<h2 id="a">A</h2><h2 id="b">B</h2>`;
    const { result } = renderHook(() => useActiveHeading({ current: container }));
    act(() => MockIO.last!.trigger(["a"]));
    expect(result.current).toBe("a");
    act(() => MockIO.last!.trigger([])); // user scrolled past last heading
    expect(result.current).toBe("a"); // sticks with last-active
  });
});
```

- [ ] **Step 2.1.2: Run test — verify it fails**

```bash
npx vitest run components/wiki/useActiveHeading.test.ts
```

Expected: FAIL — `Cannot find module './useActiveHeading'`.

- [ ] **Step 2.1.3: Implement the hook**

Create `components/wiki/useActiveHeading.ts`:

```ts
"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

/**
 * Tracks which `<h2>` or `<h3>` inside `containerRef` is currently visible at
 * the top of the viewport. Returns the id of that heading, or null if no
 * heading has been seen yet. Once a heading has been "seen" we keep returning
 * the most recent one even when the user scrolls past — a small UX nicety so
 * the sticky bar doesn't flash empty when between headings.
 */
export function useActiveHeading(
  containerRef: RefObject<HTMLElement | null>
): string | null {
  const [activeId, setActiveId] = useState<string | null>(null);
  const lastSeenRef = useRef<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const headings = Array.from(
      container.querySelectorAll<HTMLElement>("h2[id], h3[id]")
    );
    if (headings.length === 0) {
      setActiveId(null);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleIds: string[] = [];
        // Walk in document order so the *first* visible heading wins.
        const idToIntersect = new Map<string, boolean>();
        for (const e of entries) {
          idToIntersect.set((e.target as HTMLElement).id, e.isIntersecting);
        }
        for (const h of headings) {
          // Only consider headings whose state is known from this batch.
          const known = idToIntersect.get(h.id);
          if (known === true) visibleIds.push(h.id);
        }
        if (visibleIds.length > 0) {
          lastSeenRef.current = visibleIds[0];
          setActiveId(visibleIds[0]);
          return;
        }
        // Nothing visible in this batch — keep last seen (or null).
        if (lastSeenRef.current) setActiveId(lastSeenRef.current);
      },
      {
        // Top region: anything between 0 (top of viewport) and 70% down counts
        // as "currently being read". rootMargin offsets the top so the active
        // entry flips when the heading reaches ~25% from the top.
        rootMargin: "-25% 0px -70% 0px",
        threshold: 0,
      }
    );

    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [containerRef]);

  return activeId;
}
```

- [ ] **Step 2.1.4: Run test — verify pass**

```bash
npx vitest run components/wiki/useActiveHeading.test.ts
```

Expected: PASS — 4 tests pass.

- [ ] **Step 2.1.5: Commit**

```bash
git add components/wiki/useActiveHeading.ts components/wiki/useActiveHeading.test.ts
git commit -m "feat(wiki): useActiveHeading hook (IntersectionObserver) for mobile sticky TOC"
```

---

### Task 2.2: `<MobileStickyTOC>` (TDD)

**Files:**
- Create: `components/wiki/MobileStickyTOC.tsx`
- Test: `components/wiki/MobileStickyTOC.test.tsx`

- [ ] **Step 2.2.1: Write the failing test**

Create `components/wiki/MobileStickyTOC.test.tsx`:

```tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MobileStickyTOC } from "./MobileStickyTOC";

vi.mock("./useActiveHeading", () => ({
  useActiveHeading: () => "section-2",
}));

describe("MobileStickyTOC", () => {
  afterEach(() => cleanup());

  const headings = [
    { id: "section-1", text: "Intro", level: 2 as const },
    { id: "section-2", text: "Middle", level: 2 as const },
    { id: "section-3", text: "End", level: 2 as const },
  ];

  it("renders nothing when fewer than 3 headings", () => {
    const containerRef = { current: document.createElement("div") };
    render(
      <MobileStickyTOC
        title="Page"
        headings={headings.slice(0, 2)}
        containerRef={containerRef}
      />
    );
    expect(screen.queryByRole("navigation", { name: /목차/i })).toBeNull();
  });

  it("renders title and active heading text", () => {
    const containerRef = { current: document.createElement("div") };
    render(
      <MobileStickyTOC
        title="바이너리 트리"
        headings={headings}
        containerRef={containerRef}
      />
    );
    expect(screen.getByText("바이너리 트리")).toBeInTheDocument();
    expect(screen.getByText("Middle")).toBeInTheDocument();
  });

  it("opens sheet on toggle button click and lists all headings", () => {
    const containerRef = { current: document.createElement("div") };
    render(
      <MobileStickyTOC
        title="Page"
        headings={headings}
        containerRef={containerRef}
      />
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /목차 열기|expand/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Intro" })).toHaveAttribute(
      "href",
      "#section-1"
    );
    expect(screen.getByRole("link", { name: "Middle" })).toHaveAttribute(
      "href",
      "#section-2"
    );
    expect(screen.getByRole("link", { name: "End" })).toHaveAttribute(
      "href",
      "#section-3"
    );
  });

  it("closes sheet when a TOC link is clicked", () => {
    const containerRef = { current: document.createElement("div") };
    render(
      <MobileStickyTOC
        title="Page"
        headings={headings}
        containerRef={containerRef}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /목차 열기|expand/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("link", { name: "Intro" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("hides on lg viewports via lg:hidden class", () => {
    const containerRef = { current: document.createElement("div") };
    render(
      <MobileStickyTOC
        title="Page"
        headings={headings}
        containerRef={containerRef}
      />
    );
    const nav = screen.getByRole("navigation", { name: /목차/i });
    expect(nav.className).toMatch(/lg:hidden/);
  });
});
```

- [ ] **Step 2.2.2: Run test — verify it fails**

```bash
npx vitest run components/wiki/MobileStickyTOC.test.tsx
```

Expected: FAIL — `Cannot find module './MobileStickyTOC'`.

- [ ] **Step 2.2.3: Implement `MobileStickyTOC`**

Create `components/wiki/MobileStickyTOC.tsx`:

```tsx
"use client";

import { useState, type RefObject } from "react";
import { useActiveHeading } from "./useActiveHeading";

interface Heading {
  id: string;
  text: string;
  level: 2 | 3;
}

interface Props {
  /** Wiki page title shown in the sticky bar's left crumb. */
  title: string;
  headings: Heading[];
  /** Ref to the article element containing the rendered headings. */
  containerRef: RefObject<HTMLElement | null>;
}

/** Bar height in px — used by content to compensate top spacing. */
const BAR_H = 36;

export function MobileStickyTOC({ title, headings, containerRef }: Props) {
  const activeId = useActiveHeading(containerRef);
  const [open, setOpen] = useState(false);

  if (headings.length < 3) return null;

  const active = headings.find((h) => h.id === activeId) ?? headings[0];

  return (
    <nav
      aria-label="목차 (모바일)"
      className="lg:hidden sticky top-0 z-30 -mx-6 sm:-mx-8 mb-4 bg-[var(--canvas)]/95 backdrop-blur border-b border-[var(--hairline)]"
      style={{ height: BAR_H }}
    >
      <button
        type="button"
        aria-label="목차 열기"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="flex items-center justify-between w-full h-full px-4 text-[13px] gap-3"
      >
        <span className="truncate text-[var(--ink-muted)]">
          {title} <span aria-hidden="true">›</span>
        </span>
        <span className="flex items-center gap-1 text-[var(--brand-from)] font-medium truncate min-w-0">
          <span className="truncate">{active.text}</span>
          <span aria-hidden="true">▼</span>
        </span>
      </button>

      {open && (
        <div role="dialog" aria-modal="true" aria-label="목차">
          <button
            type="button"
            aria-label="Close TOC"
            data-testid="mobiletoc-backdrop"
            className="fixed inset-0 z-40 bg-[var(--overlay-scrim)]"
            onClick={() => setOpen(false)}
          />
          <div className="fixed left-0 right-0 bottom-0 z-50 max-h-[60vh] overflow-y-auto bg-[var(--canvas)] border-t border-[var(--hairline)] rounded-t-2xl shadow-2xl pb-[env(safe-area-inset-bottom)]">
            <div className="flex justify-center pt-2 pb-1" aria-hidden="true">
              <span className="block w-10 h-1 rounded-full bg-[var(--hairline)]" />
            </div>
            <h2 className="px-4 pt-1 pb-2 text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
              목차
            </h2>
            <ul className="px-2 pb-2">
              {headings.map((h) => (
                <li key={h.id} className={h.level === 3 ? "pl-4" : ""}>
                  <a
                    href={`#${h.id}`}
                    onClick={() => setOpen(false)}
                    aria-current={h.id === active.id ? "location" : undefined}
                    className={`block min-h-[var(--touch-target)] px-3 flex items-center rounded-[var(--r-md)] text-sm ${
                      h.id === active.id
                        ? "text-[var(--brand-from)] font-medium"
                        : "text-[var(--ink-muted)]"
                    }`}
                  >
                    {h.text}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </nav>
  );
}
```

- [ ] **Step 2.2.4: Run test — verify pass**

```bash
npx vitest run components/wiki/MobileStickyTOC.test.tsx
```

Expected: PASS — 5 tests pass.

- [ ] **Step 2.2.5: Commit**

```bash
git add components/wiki/MobileStickyTOC.tsx components/wiki/MobileStickyTOC.test.tsx
git commit -m "feat(wiki): MobileStickyTOC sticky bar + bottom sheet (auto-hide <3 headings)"
```

---

### Task 2.3: `<WikiPageMeta>` (TDD)

**Files:**
- Create: `components/wiki/WikiPageMeta.tsx`
- Test: `components/wiki/WikiPageMeta.test.tsx`

This component renders a single mobile card with three tabs: 관련 위키 / Q&A / 댓글. Each panel slot is passed in as a prop. The Comments slot lazy-mounts: it stays unmounted until the user activates the Comments tab, then stays mounted (so re-clicks don't re-fetch).

- [ ] **Step 2.3.1: Write the failing test**

Create `components/wiki/WikiPageMeta.test.tsx`:

```tsx
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { WikiPageMeta } from "./WikiPageMeta";

describe("WikiPageMeta", () => {
  afterEach(() => cleanup());

  it("renders three tabs with default = 관련 위키", () => {
    render(
      <WikiPageMeta
        backlinksCount={4}
        relatedQACount={7}
        backlinksSlot={<div data-testid="bl">BL</div>}
        relatedQASlot={<div data-testid="qa">QA</div>}
        commentsSlot={<div data-testid="cm">CM</div>}
      />
    );
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(3);
    expect(tabs[0]).toHaveTextContent("관련 위키");
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("bl")).toBeInTheDocument();
  });

  it("includes counts in tab labels", () => {
    render(
      <WikiPageMeta
        backlinksCount={4}
        relatedQACount={7}
        backlinksSlot={<div />}
        relatedQASlot={<div />}
        commentsSlot={<div />}
      />
    );
    expect(screen.getByRole("tab", { name: /관련 위키.*4/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Q&A.*7/ })).toBeInTheDocument();
  });

  it("does NOT mount comments slot until comments tab is activated", () => {
    render(
      <WikiPageMeta
        backlinksCount={1}
        relatedQACount={1}
        backlinksSlot={<div data-testid="bl">BL</div>}
        relatedQASlot={<div data-testid="qa">QA</div>}
        commentsSlot={<div data-testid="cm">CM</div>}
      />
    );
    expect(screen.queryByTestId("cm")).toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: /댓글/ }));
    expect(screen.getByTestId("cm")).toBeInTheDocument();
  });

  it("keeps comments mounted after first activation (lazy-once semantics)", () => {
    render(
      <WikiPageMeta
        backlinksCount={1}
        relatedQACount={1}
        backlinksSlot={<div data-testid="bl">BL</div>}
        relatedQASlot={<div data-testid="qa">QA</div>}
        commentsSlot={<div data-testid="cm">CM</div>}
      />
    );
    fireEvent.click(screen.getByRole("tab", { name: /댓글/ }));
    expect(screen.getByTestId("cm")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: /관련 위키/ }));
    // Comments still in DOM but hidden via aria-hidden / display.
    const cm = screen.getByTestId("cm");
    expect(cm).toBeInTheDocument();
  });

  it("hides on lg viewports via lg:hidden class on the wrapper", () => {
    const { container } = render(
      <WikiPageMeta
        backlinksCount={0}
        relatedQACount={0}
        backlinksSlot={<div />}
        relatedQASlot={<div />}
        commentsSlot={<div />}
      />
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toMatch(/lg:hidden/);
  });
});
```

- [ ] **Step 2.3.2: Run test — verify it fails**

```bash
npx vitest run components/wiki/WikiPageMeta.test.tsx
```

Expected: FAIL — `Cannot find module './WikiPageMeta'`.

- [ ] **Step 2.3.3: Implement `WikiPageMeta`**

Create `components/wiki/WikiPageMeta.tsx`:

```tsx
"use client";

import { useState } from "react";

type TabId = "backlinks" | "qa" | "comments";

interface Props {
  backlinksCount: number;
  relatedQACount: number;
  backlinksSlot: React.ReactNode;
  relatedQASlot: React.ReactNode;
  commentsSlot: React.ReactNode;
}

export function WikiPageMeta({
  backlinksCount,
  relatedQACount,
  backlinksSlot,
  relatedQASlot,
  commentsSlot,
}: Props) {
  const [active, setActive] = useState<TabId>("backlinks");
  // Lazy-once: comments stays unmounted until first activation, then sticks.
  const [commentsMounted, setCommentsMounted] = useState(false);

  function activate(tab: TabId) {
    setActive(tab);
    if (tab === "comments") setCommentsMounted(true);
  }

  return (
    <section
      aria-label="페이지 관련 정보"
      className="lg:hidden mt-8 bg-[var(--canvas)] border border-[var(--hairline)] rounded-[var(--r-md)] overflow-hidden"
    >
      <div role="tablist" aria-label="페이지 관련 정보" className="flex border-b border-[var(--hairline)]">
        <TabButton
          id="backlinks"
          active={active === "backlinks"}
          onClick={() => activate("backlinks")}
        >
          관련 위키 ({backlinksCount})
        </TabButton>
        <TabButton
          id="qa"
          active={active === "qa"}
          onClick={() => activate("qa")}
        >
          Q&amp;A ({relatedQACount})
        </TabButton>
        <TabButton
          id="comments"
          active={active === "comments"}
          onClick={() => activate("comments")}
        >
          댓글
        </TabButton>
      </div>
      <div className="p-4">
        <div role="tabpanel" hidden={active !== "backlinks"}>
          {backlinksSlot}
        </div>
        <div role="tabpanel" hidden={active !== "qa"}>
          {relatedQASlot}
        </div>
        <div role="tabpanel" hidden={active !== "comments"}>
          {commentsMounted ? commentsSlot : null}
        </div>
      </div>
    </section>
  );
}

function TabButton({
  id,
  active,
  onClick,
  children,
}: {
  id: TabId;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      id={`wpm-tab-${id}`}
      aria-selected={active}
      onClick={onClick}
      className={`flex-1 min-h-[var(--touch-target)] px-3 text-sm border-b-2 transition-colors ${
        active
          ? "border-[var(--brand-from)] text-[var(--ink)] font-medium"
          : "border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]"
      }`}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 2.3.4: Run test — verify pass**

```bash
npx vitest run components/wiki/WikiPageMeta.test.tsx
```

Expected: PASS — 5 tests pass.

- [ ] **Step 2.3.5: Commit**

```bash
git add components/wiki/WikiPageMeta.tsx components/wiki/WikiPageMeta.test.tsx
git commit -m "feat(wiki): WikiPageMeta segmented control (Backlinks/Q&A/comments) for <lg"
```

---

### Task 2.4: Wire `MobileStickyTOC` and `WikiPageMeta` into `WikiPage`

**Files:**
- Modify: `components/wiki/WikiPage.tsx`
- Modify: `app/wiki/[...slug]/page.tsx` (verify; no changes if existing data already provided)

The mobile components need data the desktop version already has — `<Backlinks>`, `<RelatedQA>`, `<GiscusEmbed>`, plus the headings list and counts. The `WikiPage` component currently receives the body HTML; the page route owns the related data. Easiest path: extend `WikiPage` props to accept the three render slots and counts; pass them from the page route.

- [ ] **Step 2.4.1: Re-read the current wiki page route (already known shape)**

The route's relevant locals are already known:

```ts
const { slug } = await params;
const fullSlug = slug.map(decodeURIComponent).join("/");
const bundle = await loadOnePage(fullSlug);   // bundle.bodyHtml, bundle.backlinks, bundle.titleMap
let relatedQA: Awaited<ReturnType<typeof listPostsByWikiSlug>> = [];
// ...
<AppShell
  headerSearch={<SearchBox />}
  main={
    <>
      <WikiPage ... bodyHtml={bundle.bodyHtml} ... />
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
```

Notes for the steps below:
- `<TableOfContents>`, `<Backlinks>`, `<RelatedQA>` already live inside `<RightPanel>`, which AppShell wraps in `<aside className="hidden lg:block">` — they're already gated to lg+ and need no further hiding.
- `<GiscusEmbed>` is rendered **inline below** `<WikiPage>` — not in the rail. **This** is the duplicate to gate on desktop-only.

- [ ] **Step 2.4.2: Replace `components/wiki/WikiPage.tsx`**

Add the new slots and integration. Replace the entire file:

```tsx
// components/wiki/WikiPage.tsx
"use client";

import { useRef } from "react";
import type { PageFrontmatter } from "@/lib/wiki/types";
import { Breadcrumb } from "./Breadcrumb";
import { Prerequisites } from "./Prerequisites";
import { ChildPages } from "./ChildPages";
import { MobileStickyTOC } from "./MobileStickyTOC";
import { WikiPageMeta } from "./WikiPageMeta";

interface Heading {
  id: string;
  text: string;
  level: 2 | 3;
}

interface Props {
  slug: string;
  frontmatter: PageFrontmatter;
  bodyHtml: string;
  /** GitHub URL prefix for "Edit on GitHub" — pass null to hide */
  editBaseUrl: string | null;
  filePath: string;
  category: string;
  categoryLabel: string;
  parentChain: { slug: string; title: string }[];
  prereqItems: { slug: string; title: string }[];
  childItems: { slug: string; title: string }[];
  /** Pre-extracted headings from bodyHtml (server-side) for the mobile sticky TOC. */
  headings: Heading[];
  /** Mobile-only related/Q&A/comments rendering — passed already-rendered nodes
   *  so this client component never duplicates server logic. */
  mobileBacklinksSlot: React.ReactNode;
  mobileRelatedQASlot: React.ReactNode;
  mobileCommentsSlot: React.ReactNode;
  backlinksCount: number;
  relatedQACount: number;
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
  headings,
  mobileBacklinksSlot,
  mobileRelatedQASlot,
  mobileCommentsSlot,
  backlinksCount,
  relatedQACount,
}: Props) {
  const articleRef = useRef<HTMLElement | null>(null);

  const breadcrumbChain = [
    ...parentChain.map((node) => ({ slug: node.slug as string | null, title: node.title })),
    { slug: null as string | null, title: frontmatter.title },
  ];

  return (
    <article
      ref={articleRef}
      className="bg-[var(--canvas)] border border-[var(--hairline)] rounded-[var(--r-md)] p-6 md:p-8"
    >
      <MobileStickyTOC
        title={frontmatter.title}
        headings={headings}
        containerRef={articleRef}
      />

      <Breadcrumb category={category} categoryLabel={categoryLabel} chain={breadcrumbChain} />
      <header className="mb-6">
        <h1 className="text-3xl font-bold">{frontmatter.title}</h1>
        <div className="text-sm text-[var(--ink-muted)] mt-1">
          updated {frontmatter.updated}
          {frontmatter.tags.length > 0 && (
            <>
              {" · tags: "}
              {frontmatter.tags.map((t, i) => (
                <span key={t}>
                  <a
                    href={`/wiki/tag/${encodeURIComponent(t)}`}
                    className="underline hover:text-[var(--ink)]"
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

      <WikiPageMeta
        backlinksCount={backlinksCount}
        relatedQACount={relatedQACount}
        backlinksSlot={mobileBacklinksSlot}
        relatedQASlot={mobileRelatedQASlot}
        commentsSlot={mobileCommentsSlot}
      />

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

      <p className="mt-2 text-xs text-[var(--ink-muted)] opacity-60">slug: {slug}</p>
    </article>
  );
}
```

- [ ] **Step 2.4.3: Update `app/wiki/[...slug]/page.tsx` to pass new props**

Open the file and find the `<WikiPage ... />` invocation. Add these props:
- `headings` — extract using the same regex `TableOfContents.tsx` already uses. To keep DRY, extract that logic into a shared module.

First, refactor `TableOfContents.tsx` to export the extractor:

Edit `components/wiki/TableOfContents.tsx` and **change** the file so `extractHeadings` (and the `Heading` type) are exported:

```ts
// at the top of TableOfContents.tsx, near the existing types:
export interface Heading {
  id: string;
  text: string;
  level: 2 | 3;
}

// change:
//   function extractHeadings(html: string): Heading[] { ... }
// to:
export function extractHeadings(html: string): Heading[] { ... }
```

(Leave the rest of `TableOfContents.tsx` unchanged — the local `interface Heading` definition becomes the exported one; the rest of the component keeps using it.)

Now in `app/wiki/[...slug]/page.tsx`, add the imports near the top (next to existing `Backlinks` / `RelatedQA` / `GiscusEmbed` imports — those are already there):

```ts
import { extractHeadings } from "@/components/wiki/TableOfContents";
```

Inside `WikiSlugPage()`, after `relatedQA` is loaded and **before** the `return (`, add:

```ts
const headings = extractHeadings(bundle.bodyHtml);

// Mobile-only slot nodes. Re-use the same components used in the desktop
// right rail / inline below — server-rendered JSX gets passed as props to the
// (client) WikiPage which renders them inside <WikiPageMeta>.
const mobileBacklinksSlot = (
  <Backlinks slugs={bundle.backlinks} titleMap={bundle.titleMap} />
);
const mobileRelatedQASlot = <RelatedQA posts={relatedQA} />;
const mobileCommentsSlot = <GiscusEmbed pathname={`/wiki/${fullSlug}`} />;
```

In the existing `<WikiPage ... />` invocation inside the `main` slot, add the new props (keep all existing props unchanged):

```tsx
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
  headings={headings}
  mobileBacklinksSlot={mobileBacklinksSlot}
  mobileRelatedQASlot={mobileRelatedQASlot}
  mobileCommentsSlot={mobileCommentsSlot}
  backlinksCount={bundle.backlinks.length}
  relatedQACount={relatedQA.length}
/>
```

- [ ] **Step 2.4.4: Gate inline `<GiscusEmbed>` to desktop-only**

In `app/wiki/[...slug]/page.tsx`, the inline `<GiscusEmbed>` rendered in the `main` slot would duplicate the one rendered inside `<WikiPageMeta>` on mobile. Gate it so it's only mounted on desktop.

Find this block:

```tsx
main={
  <>
    <WikiPage ... />
    <GiscusEmbed pathname={`/wiki/${fullSlug}`} />
  </>
}
```

Change to:

```tsx
main={
  <>
    <WikiPage ... />
    <div className="hidden lg:block">
      <GiscusEmbed pathname={`/wiki/${fullSlug}`} />
    </div>
  </>
}
```

`<Backlinks>`, `<RelatedQA>`, `<TableOfContents>` already live in `<RightPanel>` (wrapped in `aside className="hidden lg:block"` by AppShell) — no change needed for those.

- [ ] **Step 2.4.5: Typecheck + lint + tests**

```bash
npm run typecheck && npm run lint && npm test
```

Expected: all PASS. The new `<WikiPage>` props are required, so any callers passing the old prop set must now also pass the new props.

If typecheck flags missing props on a `<WikiPage>` use somewhere, locate that call site and add the four new props (most likely only one caller: the wiki slug route).

- [ ] **Step 2.4.6: Manual check at 375px**

```bash
npm run dev
```

Visit `/wiki/concepts/<a doc with ≥3 H2 headings>` at 375px viewport.
- Sticky bar at top of article shows `Page › Section ▼`.
- Tap → bottom sheet with full TOC; tap an item scrolls + closes sheet.
- Below article: single card with three tabs (관련 위키 / Q&A / 댓글). Default = 관련 위키.
- Tap 댓글 → Giscus iframe loads (first time only).
- Switch back to 관련 위키 — Giscus stays mounted (DOM intact).

Visit at 1440px — no sticky bar, no segmented card. Existing right-rail TOC + below-article behavior unchanged.

Stop the dev server.

- [ ] **Step 2.4.7: Commit**

```bash
git add components/wiki/WikiPage.tsx components/wiki/TableOfContents.tsx app/wiki/[...slug]/page.tsx
git commit -m "feat(wiki): wire MobileStickyTOC + WikiPageMeta into wiki page (<lg only)"
```

---

### Task 2.5: Phase 2 regression sweep

- [ ] **Step 2.5.1: Run full validation**

```bash
npm run typecheck && npm run lint && npm test
```

Expected: all PASS.

- [ ] **Step 2.5.2: Desktop visual check at 1440px**

```bash
npm run dev
```

Visit `/wiki`, `/wiki/<doc>`, `/wiki/tag/<tag>`. Confirm 1440px experience identical to before Phase 2.

Stop dev server.

---

## Phase 3 — Forum mobile responsive

### Task 3.1: `PostCard` mobile-first

**Files:**
- Modify: `components/forum/PostCard.tsx`.

- [ ] **Step 3.1.1: Replace `PostCard.tsx`**

Replace the entire contents of `components/forum/PostCard.tsx`:

```tsx
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
      className="
        block rounded-[var(--r-md)] p-4
        min-h-[var(--touch-target)]
        bg-[var(--canvas)] border border-[var(--hairline)]
        transition
        hover:shadow-lg
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-from)]
        active:bg-[var(--hairline-soft)]
      "
    >
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <CategoryBadge category={post.category} />
        <span className="text-xs text-[var(--ink-muted)]">{authorName}</span>
        <span className="text-xs text-[var(--ink-muted)] sm:ml-auto">
          {post.created_at.slice(0, 10)}
        </span>
      </div>
      <h3 className="font-semibold text-[var(--ink)] break-words">{post.title}</h3>
      {post.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {post.tags.map((t) => (
            <span key={t} className="text-xs text-[var(--ink-muted)] px-1.5 py-0.5 rounded bg-black/5">
              #{t}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
```

Changes:
- Header row uses `flex-wrap` so date wraps to its own line on narrow widths instead of pushing the title.
- `sm:ml-auto` keeps the date right-aligned at sm+ viewports, but at <640px it sits naturally after author.
- `break-words` on title prevents long titles from forcing horizontal scroll.
- Adds `focus-visible:ring` and `active:bg` so tap/keyboard users get feedback (no hover state on touch).

- [ ] **Step 3.1.2: Typecheck + run any forum tests**

```bash
npm run typecheck
npx vitest run components/forum
```

Expected: PASS.

- [ ] **Step 3.1.3: Visual check**

```bash
npm run dev
```

`/forum` at 375px — long titles wrap; tapping a card highlights it briefly.
`/forum` at 1440px — visually unchanged from main.

Stop dev server.

- [ ] **Step 3.1.4: Commit**

```bash
git add components/forum/PostCard.tsx
git commit -m "feat(forum): PostCard responsive — flex-wrap meta, focus/active states, break-words"
```

---

### Task 3.2: Post detail page header responsive

**Files:**
- Modify: `app/forum/post/[id]/page.tsx` — only the article header `flex` row containing CategoryBadge + author + date.

- [ ] **Step 3.2.1: Edit the header row**

In `app/forum/post/[id]/page.tsx`, locate this block:

```tsx
<div className="flex items-center gap-2 mb-3">
  <CategoryBadge category={post.category} />
  <span className="text-sm text-[var(--ink-muted)]">{authorName}</span>
  <span className="text-sm text-[var(--ink-muted)] ml-auto">
    {post.created_at.slice(0, 10)}
  </span>
</div>
```

Replace with:

```tsx
<div className="flex flex-wrap items-center gap-2 mb-3">
  <CategoryBadge category={post.category} />
  <span className="text-sm text-[var(--ink-muted)]">{authorName}</span>
  <span className="text-sm text-[var(--ink-muted)] sm:ml-auto">
    {post.created_at.slice(0, 10)}
  </span>
</div>
```

Same pattern as PostCard — `flex-wrap` allows date to drop to next line on narrow widths.

- [ ] **Step 3.2.2: Verify the title and prose handle width**

The `<h1>` and `<div className="prose max-w-none">` already inherit width-fluid behavior. Add `break-words` to the h1 just in case a single very long word appears:

In the same file, change:

```tsx
<h1 className="text-2xl font-bold mb-4">{post.title}</h1>
```

to:

```tsx
<h1 className="text-2xl font-bold mb-4 break-words">{post.title}</h1>
```

- [ ] **Step 3.2.3: Manual check**

```bash
npm run dev
```

Open any `/forum/post/<id>` at 375px. Long titles wrap cleanly; date doesn't push button hangs.

Stop dev server.

- [ ] **Step 3.2.4: Commit**

```bash
git add app/forum/post/[id]/page.tsx
git commit -m "feat(forum): post detail header flex-wrap; break-words on title"
```

---

### Task 3.3: `CommentItem` tap targets + indent

**Files:**
- Modify: `components/forum/CommentItem.tsx`.

- [ ] **Step 3.3.1: Replace the action-bar block in `CommentItem.tsx`**

Find this block (around the visible-actions group):

```tsx
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
```

Replace with:

```tsx
{(canEdit || canDelete) && !isEditing && (
  <span className="basis-full sm:basis-auto sm:ml-auto flex gap-2 text-xs -mx-2">
    {canEdit && (
      <button
        type="button"
        className="px-2 min-h-[var(--touch-target)] inline-flex items-center text-[var(--ink-muted)] hover:text-[var(--ink)] focus-visible:text-[var(--ink)] underline rounded-[var(--r-sm)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-from)]"
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
        className="px-2 min-h-[var(--touch-target)] inline-flex items-center text-[var(--ink-muted)] hover:text-red-600 focus-visible:text-red-600 underline disabled:opacity-50 rounded-[var(--r-sm)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
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
```

Changes:
- `basis-full sm:basis-auto sm:ml-auto` — at <640px the actions wrap to their own line; at sm+ they sit on the right of the author/date row.
- `-mx-2` paired with `px-2` per button keeps visible spacing identical while expanding the actual hit area.
- Each button now `min-h-[var(--touch-target)]` (44px tap target) + `focus-visible:ring`.

Also change the header `flex` to allow wrapping. Find:

```tsx
<div className="flex items-center gap-2 mb-1">
```

Change to:

```tsx
<div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1">
```

- [ ] **Step 3.3.2: Typecheck**

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 3.3.3: Manual check**

```bash
npm run dev
```

On a forum post you authored at 375px — comment header wraps; 수정/삭제 buttons sit on a second line; tapping is comfortable.
At 1440px — visually unchanged.

Stop dev server.

- [ ] **Step 3.3.4: Commit**

```bash
git add components/forum/CommentItem.tsx
git commit -m "feat(forum): CommentItem touch-target action buttons, wrap-aware header"
```

---

### Task 3.4: `CommentForm` mobile-friendly submit

**Files:**
- Modify: `components/forum/CommentForm.tsx`.

The current `<Pill size="sm">` is below 44px and the form sits flush. Make the submit `w-full sm:w-auto` and bump rows to 4 so users have more room.

- [ ] **Step 3.4.1: Edit `CommentForm.tsx`**

Open `components/forum/CommentForm.tsx` and change two lines.

Change:
```tsx
        rows={3}
```
to:
```tsx
        rows={4}
```

Change:
```tsx
      <Pill type="submit" variant="primary" size="sm" disabled={isPending} className="disabled:opacity-50">
        {isPending ? "올리는 중…" : "댓글 달기"}
      </Pill>
```
to:
```tsx
      <Pill type="submit" variant="primary" size="sm" disabled={isPending} className="disabled:opacity-50 w-full sm:w-auto min-h-[var(--touch-target)]">
        {isPending ? "올리는 중…" : "댓글 달기"}
      </Pill>
```

- [ ] **Step 3.4.2: Visual check**

```bash
npm run dev
```

Sign in (or use the existing dev session) and visit a forum post at 375px. Comment textarea is taller; submit button is full-width. At 1440px button sits at its natural width.

Stop dev server.

- [ ] **Step 3.4.3: Commit**

```bash
git add components/forum/CommentForm.tsx
git commit -m "feat(forum): CommentForm w-full submit on mobile, larger textarea"
```

---

### Task 3.5: `NewPostForm` mobile-friendly

**Files:**
- Modify: `components/forum/NewPostForm.tsx`.

- [ ] **Step 3.5.1: Edit `NewPostForm.tsx`**

Replace the contents:

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
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Pill
            type="submit"
            variant="primary"
            size="sm"
            disabled={isPending}
            className="disabled:opacity-50 w-full sm:w-auto min-h-[var(--touch-target)]"
          >
            {isPending ? "올리는 중…" : "올리기"}
          </Pill>
        </div>
      </Card>
    </form>
  );
}
```

`PostFormFields` only contains form fields (no buttons). The new flex wrapper around `<Pill>` is for forward-compat: when a Cancel button is later added next to Submit, it'll stack correctly on mobile without further refactor.

- [ ] **Step 3.5.2: Manual check**

```bash
npm run dev
```

Visit `/forum/new` (signed in) at 375px. Textareas are full-width; submit is full-width pill. At 1440px button sits at its natural width on the left.

Stop dev server.

- [ ] **Step 3.5.3: Commit**

```bash
git add components/forum/NewPostForm.tsx
git commit -m "feat(forum): NewPostForm submit w-full on mobile, button row stacks"
```

---

### Task 3.6: Phase 3 regression sweep

- [ ] **Step 3.6.1: Run full validation**

```bash
npm run typecheck && npm run lint && npm test
```

Expected: all PASS.

- [ ] **Step 3.6.2: Desktop visual check at 1440px**

```bash
npm run dev
```

Visit `/forum`, `/forum/qa`, `/forum/post/<id>`, `/forum/new`. Confirm experience identical to before Phase 3.

Stop dev server.

---

## Phase 4 — Landing polish + a11y + Playwright smoke

### Task 4.1: Landing page copy + padding fix

**Files:**
- Modify: `app/page.tsx`.

- [ ] **Step 4.1.1: Replace `app/page.tsx`**

Replace the entire contents:

```tsx
import Link from "next/link";
import type { Route } from "next";
import { ColorBlock } from "@/components/ui";
import { Wordmark } from "@/components/brand/Wordmark";

export default function HomePage() {
  return (
    <main className="min-h-screen p-4 md:p-6 bg-[var(--bg-gradient)]">
      <section className="max-w-4xl mx-auto mt-10 md:mt-24 bg-[var(--canvas)] border border-[var(--hairline)] rounded-[var(--r-lg)] p-6 sm:p-10 md:p-16 text-center">
        <p
          className="font-mono uppercase text-[var(--ink-muted)] mb-6"
          style={{ fontSize: 13, letterSpacing: "0.28em" }}
        >
          CS · 위키 · 포럼
        </p>

        <h1 className="mb-8 inline-block">
          <Wordmark size="hero" />
        </h1>

        <p
          className="text-[var(--ink)] max-w-2xl mx-auto mb-10 text-pretty"
          style={{ fontSize: "var(--t-body-lg)", fontWeight: 330, lineHeight: 1.5 }}
        >
          바이브코더를 위한 CS 학습·토론 사이트. AI에게 시키는 단계에서 한 걸음 더 나아가도록.
        </p>

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:justify-center">
          <Link href={"/wiki" as Route} className="btn-hero btn-hero-primary">
            위키 둘러보기
            <span aria-hidden="true" className="btn-arrow">→</span>
          </Link>
          <Link href={"/forum" as Route} className="btn-hero btn-hero-secondary">
            포럼 보기
          </Link>
        </div>
      </section>

      <section className="max-w-4xl mx-auto mt-8">
        <ColorBlock variant="lilac" as="section" className="text-center">
          <p
            className="font-mono uppercase text-[var(--ink-muted)] mb-5"
            style={{ fontSize: 12, letterSpacing: "0.28em" }}
          >
            WHY VIBEFORGE
          </p>
          <h2
            className="text-[var(--ink)] mb-6 text-balance"
            style={{
              fontSize: "clamp(22px, 5.5vw, 44px)",
              fontWeight: 540,
              letterSpacing: "-0.025em",
              lineHeight: 1.15,
            }}
          >
            배우고, 토론하고, 성장하세요
          </h2>
          <p
            className="text-[var(--ink)] max-w-xl mx-auto text-pretty"
            style={{
              fontSize: "var(--t-body-lg)",
              fontWeight: 330,
              lineHeight: 1.55,
              opacity: 0.78,
            }}
          >
            위키에서 Vibe Coding에 필요한 기본 CS 지식을 탐색하고, 포럼에서 질문하며 함께 성장해보세요!
          </p>
        </ColorBlock>
      </section>
    </main>
  );
}
```

Changes:
- Hero card padding `p-8 md:p-16` → `p-6 sm:p-10 md:p-16` (more room on mobile).
- Hero `mt-12` → `mt-10` (slightly tighter vertical rhythm on mobile).
- Hero subtitle `<br />` removed; added `text-pretty` so the browser balances naturally.
- "Why VibeForge" body `<br />` removed; added `text-pretty`.
- "배우고, 토론하고, 성장하세요" h2: `clamp(28px, 4.5vw, 44px)` → `clamp(22px, 5.5vw, 44px)` (375px ≈ 22.5px, fits one line); added `text-balance` to prevent widow.
- CTA group `flex flex-wrap gap-3 justify-center` → `flex flex-col sm:flex-row gap-2 sm:gap-3 sm:justify-center` (buttons stack on mobile).

- [ ] **Step 4.1.2: Make `.btn-hero` fluid-width on mobile**

In `app/globals.css`, find the `.btn-hero` rule (~line 99). Add `width: 100%;` and `justify-content: center;` to mobile, and clamp it back at sm+. Insert the responsive overrides near the existing `.btn-hero` block:

```css
/* On mobile, hero CTAs stretch to full width inside their stacked column. */
.btn-hero {
  width: 100%;
  justify-content: center;
}
@media (min-width: 640px) {
  .btn-hero {
    width: auto;
  }
}
```

Place these rules **after** the existing `.btn-hero { ... }` definition so the latter declarations win on the cascade.

- [ ] **Step 4.1.3: Manual viewport check**

```bash
npm run dev
```

At 375px:
- Hero "VibeForge" wordmark fits inside the card with margin (Wordmark + tokens + Wordmark mark all scaled).
- Subtitle reads as one or two natural lines (no awkward `한 걸음 더 나아가/도록.` break).
- Buttons stacked vertically, full-width.
- "배우고, 토론하고, 성장하세요" sits on a single line (with `text-balance` allowing graceful balancing).

At 1440px: pixel-identical to main.

Stop dev server.

- [ ] **Step 4.1.4: Commit**

```bash
git add app/page.tsx app/globals.css
git commit -m "feat(landing): mobile-fit hero — clamp h2, drop hard breaks, w-full CTAs"
```

---

### Task 4.2: Accessibility pass — global focus-visible safety net

**Files:**
- Modify: `app/globals.css`.

Different components have inconsistent focus styles. Establish a global default for `:focus-visible` so anything we missed still gets a visible ring.

- [ ] **Step 4.2.1: Append global `:focus-visible` style**

Append to `app/globals.css`:

```css
/* a11y: ensure every keyboard-focused interactive element has a visible ring,
   even if the component itself didn't add one. Components may override with
   their own focus-visible styles. */
:where(a, button, [role="button"], input, select, textarea, summary):focus-visible {
  outline: 2px solid var(--brand-from);
  outline-offset: 2px;
}
```

`:where(...)` keeps specificity at 0 so any per-component focus rule wins. This is purely a safety net.

- [ ] **Step 4.2.2: Verify with keyboard tab**

```bash
npm run dev
```

At 1440px on `/`, press Tab repeatedly. Each link/button shows a purple ring. Same on `/forum` and `/wiki`.

Stop dev server.

- [ ] **Step 4.2.3: Commit**

```bash
git add app/globals.css
git commit -m "feat(a11y): global :focus-visible ring as safety net (specificity-0)"
```

---

### Task 4.3: Playwright mobile smoke spec

**Files:**
- Create: `tests/e2e/mobile.spec.ts`.

Browse known-good pages at 375×667. Verify the bottom tab bar mounts, the hero h2 fits one line, and the wiki sticky TOC mounts on a long page.

- [ ] **Step 4.3.1: Identify a wiki page with ≥3 H2 headings**

```bash
npm run dev
```

In another terminal:

```bash
node -e "
  const fs = require('fs');
  const path = require('path');
  function walk(d, files=[]) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p, files);
      else if (e.name.endsWith('.md')) files.push(p);
    }
    return files;
  }
  const md = walk('content/data');
  const slugs = md
    .map((f) => ({ f, h2: (fs.readFileSync(f, 'utf8').match(/^##\s+/gm) || []).length }))
    .filter((x) => x.h2 >= 3)
    .sort((a, b) => b.h2 - a.h2)
    .slice(0, 5)
    .map((x) => '/wiki/' + x.f.replace(/^content[\\\\/]data[\\\\/]/, '').replace(/\\.md\$/, '').replace(/\\\\/g, '/'));
  console.log(JSON.stringify(slugs, null, 2));
"
```

This prints up to 5 wiki page URLs that have at least 3 H2 headings. Pick the **first one** for the test fixture URL. Stop the dev server.

(If no slug returns ≥3 H2s, lower the threshold to 2 and adjust the test's TOC assertion to `> 0` rather than `>= 3`.)

- [ ] **Step 4.3.2: Write the Playwright spec**

Create `tests/e2e/mobile.spec.ts`:

```ts
// tests/e2e/mobile.spec.ts
// Smoke pass at 375×667 (iPhone SE viewport). Verifies the mobile shell
// renders, the bottom tab bar works, the landing hero h2 sits on one line,
// and the wiki sticky TOC is wired up on long-form documents.
import { test, expect, devices } from "@playwright/test";

// REPLACE WITH THE SLUG FROM STEP 4.3.1 (must have ≥3 H2 headings)
const LONG_WIKI_SLUG = "/wiki/concepts/SQL";

test.use({ ...devices["iPhone SE"] });

test.describe("mobile shell", () => {
  test("homepage renders without horizontal overflow", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "VibeForge", level: 1 })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(1); // allow 1px sub-pixel
  });

  test("hero h2 in lilac block fits one line", async ({ page }) => {
    await page.goto("/");
    const h2 = page.getByRole("heading", { name: "배우고, 토론하고, 성장하세요" });
    await expect(h2).toBeVisible();
    const lineHeight = await h2.evaluate((el) => parseFloat(getComputedStyle(el).lineHeight));
    const height = await h2.evaluate((el) => (el as HTMLElement).getBoundingClientRect().height);
    // Single line: actual height < 1.6× line-height (allows for some descender).
    expect(height).toBeLessThan(lineHeight * 1.6);
  });

  test("bottom tab bar is visible and active matches /wiki", async ({ page }) => {
    await page.goto("/wiki");
    const tabBar = page.getByRole("navigation", { name: "Bottom navigation" });
    await expect(tabBar).toBeVisible();
    await expect(tabBar.getByRole("link", { name: "Wiki" })).toHaveAttribute("aria-current", "page");
    await tabBar.getByRole("link", { name: "Forum" }).click();
    await expect(page).toHaveURL(/\/forum$/);
    await expect(tabBar.getByRole("link", { name: "Forum" })).toHaveAttribute("aria-current", "page");
  });

  test("hamburger opens mobile menu sheet", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Open menu" }).click();
    const dialog = page.getByRole("dialog", { name: "Mobile menu" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("link", { name: /About/i })).toBeVisible();
    // Backdrop click closes
    await dialog.getByRole("button", { name: "Close menu" }).first().click();
    await expect(dialog).toBeHidden();
  });

  test("wiki long page shows sticky TOC bar", async ({ page }) => {
    await page.goto(LONG_WIKI_SLUG);
    const stickyNav = page.getByRole("navigation", { name: /목차 \(모바일\)/i });
    await expect(stickyNav).toBeVisible();
    await stickyNav.getByRole("button", { name: "목차 열기" }).click();
    await expect(page.getByRole("dialog", { name: "목차" })).toBeVisible();
  });

  test("forum post header does not overflow on mobile", async ({ page }) => {
    await page.goto("/forum");
    // Pick the first post link in the list.
    const firstPost = page.getByRole("link", { name: /^.+/ }).first();
    await firstPost.click();
    await page.waitForURL(/\/forum\/post\//);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
```

Replace the `LONG_WIKI_SLUG` constant with the slug you picked in Step 4.3.1.

- [ ] **Step 4.3.3: Run Playwright**

```bash
npx playwright install chromium # if not already installed
npm run test:e2e -- tests/e2e/mobile.spec.ts
```

Expected: PASS — 6 tests pass.

If "wiki long page sticky TOC" fails because the chosen slug's headings render differently than expected, swap to another candidate from Step 4.3.1's output and re-run.

- [ ] **Step 4.3.4: Commit**

```bash
git add tests/e2e/mobile.spec.ts
git commit -m "test(e2e): mobile smoke at 375×667 — bottom tab bar, sticky TOC, no overflow"
```

---

### Task 4.4: Phase 4 regression sweep

- [ ] **Step 4.4.1: Run full validation**

```bash
npm run typecheck && npm run lint && npm test && npm run test:e2e -- tests/e2e/mobile.spec.ts
```

Expected: all PASS.

- [ ] **Step 4.4.2: Final manual desktop regression at 1440px**

```bash
npm run dev
```

Visit `/`, `/wiki`, `/wiki/<long-doc>`, `/forum`, `/forum/qa`, `/forum/post/<id>`, `/forum/new`, `/about`, `/admin` (if admin). Confirm 1440px experience identical to main pre-redesign.

Stop dev server.

---

## Self-Review (do not skip)

Before treating the implementation as done, run this checklist:

1. **Spec coverage** — every section in `2026-05-04-mobile-first-responsive-design.md`:
   - Token clamps + `--touch-target` ✓ (Task 1.1)
   - Wordmark hero responsive ✓ (Task 1.2)
   - Prose responsive ✓ (Task 1.3)
   - `<BottomTabBar>` ✓ (Task 1.4)
   - `<MobileMenu>` ✓ (Task 1.5–1.6)
   - SiteHeader mobile ✓ (Task 1.7)
   - AppShell rebuild + remove `<details>` ✓ (Task 1.8)
   - `<MobileStickyTOC>` ✓ (Task 2.2)
   - `<WikiPageMeta>` (segmented control, lazy comments) ✓ (Task 2.3)
   - WikiPage wiring ✓ (Task 2.4)
   - PostCard responsive ✓ (Task 3.1)
   - Post detail header ✓ (Task 3.2)
   - CommentItem tap targets ✓ (Task 3.3)
   - CommentForm mobile submit ✓ (Task 3.4)
   - NewPostForm mobile ✓ (Task 3.5)
   - Landing page copy + h2 clamp + button stack ✓ (Task 4.1)
   - Global focus-visible ✓ (Task 4.2)
   - Playwright smoke ✓ (Task 4.3)

2. **Symbols and signatures consistent across tasks**:
   - `extractHeadings` exported from `components/wiki/TableOfContents.tsx` (Task 2.4) → consumed by route.
   - `Heading` type re-used between `TableOfContents.tsx` and `MobileStickyTOC.tsx`.
   - `MobileMenu` props: `open`, `onClose`, `isAdmin`, `children` — used identically in test and `MobileHeaderControls`.
   - `WikiPageMeta` props: `backlinksCount`, `relatedQACount`, three slot nodes — match test expectations and `WikiPage` integration.

3. **Desktop preserved at every step**:
   - All new components gated `lg:hidden`.
   - Token clamps' `max` value = previous fixed value (e.g., `clamp(40px, 11vw, 64px)` caps at 64px).
   - SiteHeader desktop branch wrapped `hidden lg:flex` / `hidden lg:block`.
   - AppShell sidebar visibility moved from `md:block` to `lg:block` — *intentional change*, since desktop layout is defined as `lg+` (1024px+) per spec; tablet (768–1023px) gets mobile shell. If this is unwanted, revisit AppShell's grid breakpoint.

4. **Frequent commits** — one commit per task, ~15 commits total across 4 phases. Each phase is independently mergeable.

5. **Risks from spec accounted for**:
   - Scroll-jank: `useActiveHeading` uses one IntersectionObserver, no DOM mutation in callback (Task 2.1).
   - safe-area-inset: `pb-[env(safe-area-inset-bottom)]` on `BottomTabBar` and AppShell padding (Tasks 1.4, 1.8).
   - Lazy Giscus: `commentsMounted` state in `WikiPageMeta` (Task 2.3).
   - `text-balance` graceful degradation: older Safari just falls back to natural wrapping (no error).

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-04-mobile-first-responsive.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. Good for this plan because each task is genuinely independent post-Phase-1.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints. Good if you want to watch each step land in real time.

Which approach?
