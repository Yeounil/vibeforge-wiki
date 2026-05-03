# Figma Design System Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate VibeForge's visual system to a 3-layer token+primitive architecture aligned with `docs/design.md` (Figma) — keeping the current purple/pink brand accent, adding a `prefers-color-scheme` dark mode, and enforcing component consistency through 6 reusable primitives.

**Architecture:** `lib/design/tokens.css` (CSS variables + Tailwind 4 `@theme` + dark `@media`) → `components/ui/*` primitives (variant-only props, no token values as props) → existing consumers (AppShell, forum, wiki) consume primitives. No JS theme provider, no toggle UI — system preference only.

**Tech Stack:** Next.js 15.1 / React 19 / TS 5.7 strict + Tailwind 4 + Vitest + Playwright. New: Geist sans/mono via `next/font/google`, Pretendard Variable self-hosted woff2.

**Spec:** `docs/superpowers/specs/2026-05-04-figma-design-system-design.md`

---

## File map

| File | Change |
|---|---|
| `package.json` + lockfile | No new runtime deps. `next/font/google` is built-in. |
| `public/fonts/PretendardVariable.woff2` | **Create** — self-hosted variable woff2 (download from Pretendard releases) |
| `app/layout.tsx` | **Modify** — load Geist + Geist_Mono via `next/font/google`, attach CSS vars to `<html>` |
| `lib/design/tokens.css` | **Full rewrite** — color/typo/spacing/radius tokens + `@theme` block + dark `@media` |
| `app/globals.css` | **Modify** — drop `--bg-gradient` body application; keep `.vf-card` as alias to `<Card>` until PR 5; map `.prose` color vars to new tokens |
| `components/ui/Pill.tsx` + test | **Create** |
| `components/ui/ColorBlock.tsx` + test | **Create** |
| `components/ui/Card.tsx` + test | **Create** |
| `components/ui/Eyebrow.tsx` | **Create** (no test — pure presentational, no logic) |
| `components/ui/IconButton.tsx` + test | **Create** |
| `components/ui/TextInput.tsx` + test | **Create** |
| `components/ui/index.ts` | **Create** — re-export |
| `components/wiki/GiscusEmbed.tsx:41` | **Modify** — `data-theme` from `"light"` → `"preferred_color_scheme"` |
| `components/wiki/GraphViewInner.tsx` | **Modify** — node/edge/label colors via CSS variable lookup at render time |
| `components/layout/AppShell.tsx` | **Modify** — drop `bg-[var(--bg-gradient)]` (now on body), use Card/ColorBlock for mobile sidebar |
| `components/layout/SiteHeader.tsx` | **Modify** — replace inline classes with `<Card>` + use `<Pill>` for nav CTAs (none currently, but AuthButton wraps a button) |
| `components/layout/AuthButton.tsx` | **Modify** — render `<Pill variant="primary\|secondary">` |
| `components/forum/PostCard.tsx`, `NewPostForm.tsx`, `CommentForm.tsx`, `PostList.tsx`, `RelatedWiki.tsx`, `CategoryBadge.tsx` | **Modify** — buttons → `<Pill>`, cards → `<Card>` |
| `components/wiki/Backlinks.tsx`, `RelatedQA.tsx` | **Modify** — wrap content in `<ColorBlock variant="lilac\|mint">` + `<Eyebrow>` |
| `components/wiki/TableOfContents.tsx`, `Breadcrumb.tsx`, `ChildPages.tsx`, `Prerequisites.tsx`, `SearchBox.tsx` | **Modify** — typography classes use new token names (text-body-sm, etc.) |
| `app/page.tsx` (landing) | **Modify** — `<Pill>` for hero CTA, optional `<ColorBlock>` for one section |
| `app/about/page.tsx` | **Modify** — `<Pill>` for any CTAs |
| `tests/e2e/visual-design.spec.ts` | **Create** — Playwright screenshots for 6 routes × {light, dark} |

---

## Task 1: Add Geist + Pretendard fonts and wire layout

**Files:**
- Create: `public/fonts/PretendardVariable.woff2`
- Modify: `app/layout.tsx`

- [ ] **Step 1.1: Download Pretendard Variable woff2**

Run:
```bash
curl -L https://github.com/orioncactus/pretendard/raw/main/packages/pretendard/dist/web/variable/woff2/PretendardVariable.woff2 -o public/fonts/PretendardVariable.woff2
```

Expected: file exists, size around 1.0–1.1 MB. Verify with `ls -lh public/fonts/PretendardVariable.woff2`.

- [ ] **Step 1.2: Update `app/layout.tsx` with next/font**

Replace the file contents:

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "VibeForge",
  description: "바이브코더를 위한 CS 학습·토론 사이트",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className={`${geist.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 1.3: Verify build still passes**

Run: `npm run build 2>&1 | tail -20`

Expected: build completes, no errors. The new fonts are downloaded by next/font at build time.

- [ ] **Step 1.4: Commit**

```bash
git add app/layout.tsx public/fonts/PretendardVariable.woff2
git commit -m "feat(fonts): add Geist + Pretendard Variable for Figma design system"
```

---

## Task 2: Rewrite `tokens.css` with full token system + dark mode

**Files:**
- Modify: `lib/design/tokens.css`

- [ ] **Step 2.1: Replace `tokens.css` contents**

```css
/* lib/design/tokens.css — VibeForge Figma design system tokens. */

@font-face {
  font-family: "Pretendard Variable";
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
  src: url("/fonts/PretendardVariable.woff2") format("woff2-variations");
}

:root {
  /* === Brand (purple/pink — current accent preserved) === */
  --brand-from: #7c3aed;
  --brand-to:   #3b82f6;
  --brand-gradient: linear-gradient(135deg, var(--brand-from), var(--brand-to));
  --accent-magenta: #ec4899;

  /* === Surface === */
  --canvas:        #ffffff;
  --surface-soft:  #f9fafb;
  --hairline:      #e5e7eb;
  --hairline-soft: #f3f4f6;

  /* === Ink === */
  --ink:         #1f2937;
  --ink-inverse: #ffffff;
  --ink-muted:   #6b7280;

  /* === Color blocks (light) === */
  --block-lilac: #ede9fe;
  --block-mint:  #d1fae5;
  --block-cream: #fef3c7;
  --block-pink:  #fce7f3;
  --block-navy:  #1e1b4b;

  /* === Semantic === */
  --semantic-success: #10b981;
  --overlay-scrim:    rgba(0,0,0,0.6);

  /* === Page background gradient (current site identity) === */
  --bg-gradient: linear-gradient(135deg, #f3e7fb 0%, #fde7f3 100%);

  /* === Spacing (8px base) === */
  --s-hair:    1px;
  --s-xxs:     4px;
  --s-xs:      8px;
  --s-sm:      12px;
  --s-md:      16px;
  --s-lg:      24px;
  --s-xl:      32px;
  --s-xxl:     48px;
  --s-section: 96px;

  /* === Radius === */
  --r-xs:   2px;
  --r-sm:   6px;
  --r-md:   8px;
  --r-lg:   24px;
  --r-xl:   32px;
  --r-pill: 50px;
  --r-full: 9999px;

  /* === Font weight === */
  --w-thin:     320;
  --w-light:    330;
  --w-regular:  340;
  --w-medium:   480;
  --w-semibold: 540;
  --w-bold:     700;

  /* === Font stack (Geist via next/font + Pretendard Variable for Korean) === */
  --font-sans: var(--font-geist, "Pretendard Variable"), "Pretendard Variable", system-ui, -apple-system, sans-serif;
  --font-mono: var(--font-geist-mono, ui-monospace), "JetBrains Mono", "SF Mono", monospace;

  /* === Legacy aliases — TODO remove in PR 5 cleanup === */
  --surface-card:    var(--canvas);
  --surface-shadow:  0 4px 24px rgba(124, 58, 237, 0.08);
  --text-primary:    var(--ink);
  --text-secondary:  var(--ink-muted);
  --accent-from:     var(--brand-from);
  --accent-to:       var(--brand-to);
  --accent-cta:      var(--brand-gradient);
  --radius-card:     var(--r-md);

  /* Category colors — keep existing */
  --cat-concepts: #3b82f6;
  --cat-entities: #ec4899;
  --cat-people:   #f59e0b;
  --cat-sources:  #f43f5e;
  --cat-default:  #f97316;
}

@media (prefers-color-scheme: dark) {
  :root {
    --canvas:        #14111e;
    --surface-soft:  #1c1828;
    --hairline:      rgba(255,255,255,0.08);
    --hairline-soft: rgba(255,255,255,0.04);

    --ink:         #ede8f5;
    --ink-inverse: #14111e;
    --ink-muted:   #9ca3af;

    --block-lilac: #3b2360;
    --block-mint:  #1f3d3a;
    --block-cream: #3d3520;
    --block-pink:  #4a1d3f;
    --block-navy:  #14111e;

    --semantic-success: #34d399;
    --overlay-scrim:    rgba(0,0,0,0.75);

    --bg-gradient: linear-gradient(135deg, #1a1325 0%, #2a1622 100%);

    /* Legacy alias overrides */
    --surface-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
  }
}

/* === Tailwind 4 @theme — exposes tokens as utilities === */
@theme {
  --color-canvas:       var(--canvas);
  --color-surface-soft: var(--surface-soft);
  --color-hairline:     var(--hairline);
  --color-ink:          var(--ink);
  --color-ink-inverse:  var(--ink-inverse);
  --color-ink-muted:    var(--ink-muted);
  --color-block-lilac:  var(--block-lilac);
  --color-block-mint:   var(--block-mint);
  --color-block-cream:  var(--block-cream);
  --color-block-pink:   var(--block-pink);
  --color-block-navy:   var(--block-navy);
  --color-brand-from:   var(--brand-from);
  --color-brand-to:     var(--brand-to);
  --color-magenta:      var(--accent-magenta);

  --radius-pill: var(--r-pill);
  --radius-lg:   var(--r-lg);
  --radius-md:   var(--r-md);

  --font-sans:  var(--font-sans);
  --font-mono:  var(--font-mono);
}
```

- [ ] **Step 2.2: Verify build passes**

Run: `npm run build 2>&1 | tail -10`

Expected: build completes. If Tailwind warns about unknown `@theme` properties, the warning is informational — proceed.

- [ ] **Step 2.3: Verify existing tests still pass**

Run: `npm test`

Expected: all existing tests pass (no token-name regressions because legacy aliases preserved).

- [ ] **Step 2.4: Commit**

```bash
git add lib/design/tokens.css
git commit -m "feat(tokens): full Figma token system with prefers-color-scheme dark"
```

---

## Task 3: Update `globals.css` body font + minor cleanup

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 3.1: Edit `app/globals.css`**

Replace lines 4-7:

```css
html, body {
  font-family: var(--font-sans);
  color: var(--ink);
}
```

Keep everything else (the `.vf-card`, `.prose`, `a[data-broken]`, wiki-link rules) — they consume legacy aliases that still resolve.

- [ ] **Step 3.2: Verify build + tests**

Run: `npm run build && npm test`

Expected: both pass.

- [ ] **Step 3.3: Commit**

```bash
git add app/globals.css
git commit -m "refactor(globals): use --font-sans and --ink tokens"
```

---

## Task 4: Pill primitive (TDD)

**Files:**
- Create: `components/ui/Pill.tsx`
- Create: `components/ui/Pill.test.tsx`

- [ ] **Step 4.1: Write failing tests first**

`components/ui/Pill.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Pill } from "./Pill";

describe("Pill", () => {
  it("renders a button by default with primary variant", () => {
    render(<Pill>Submit</Pill>);
    const btn = screen.getByRole("button", { name: "Submit" });
    expect(btn.tagName).toBe("BUTTON");
    expect(btn.className).toContain("bg-[var(--brand-gradient)]");
  });

  it("renders an anchor when href is provided", () => {
    render(<Pill href="/login">Login</Pill>);
    const link = screen.getByRole("link", { name: "Login" });
    expect(link.tagName).toBe("A");
    expect(link.getAttribute("href")).toBe("/login");
  });

  it("applies secondary variant classes", () => {
    render(<Pill variant="secondary">Cancel</Pill>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("bg-[var(--canvas)]");
    expect(btn.className).toContain("text-[var(--ink)]");
  });

  it("applies magenta variant classes", () => {
    render(<Pill variant="magenta">Promo</Pill>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("bg-[var(--accent-magenta)]");
  });

  it("forwards onClick", async () => {
    const onClick = vi.fn();
    render(<Pill onClick={onClick}>Click</Pill>);
    screen.getByRole("button").click();
    expect(onClick).toHaveBeenCalled();
  });
});
```

Add `import { vi } from "vitest";` at the top.

- [ ] **Step 4.2: Run tests to verify they fail**

Run: `npx vitest run components/ui/Pill.test.tsx`

Expected: FAIL — `Pill` not found.

- [ ] **Step 4.3: Implement `Pill.tsx`**

`components/ui/Pill.tsx`:

```tsx
import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type PillVariant = "primary" | "secondary" | "magenta";
type PillSize = "default" | "sm";

interface CommonProps {
  variant?: PillVariant;
  size?: PillSize;
  children: ReactNode;
  className?: string;
}

type PillProps =
  | (CommonProps & { href: string; onClick?: never })
  | (CommonProps & ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined });

const variantClass: Record<PillVariant, string> = {
  primary:   "bg-[var(--brand-gradient)] text-white",
  secondary: "bg-[var(--canvas)] text-[var(--ink)] border border-[var(--hairline)]",
  magenta:   "bg-[var(--accent-magenta)] text-white",
};

const sizeClass: Record<PillSize, string> = {
  default: "px-[var(--s-lg)] py-[var(--s-xs)] text-base",
  sm:      "px-[var(--s-md)] py-[var(--s-xxs)] text-sm",
};

const baseClass =
  "inline-flex items-center justify-center rounded-[var(--r-pill)] font-medium transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-from)] focus-visible:ring-offset-2";

export function Pill(props: PillProps) {
  const variant = props.variant ?? "primary";
  const size = props.size ?? "default";
  const merged = `${baseClass} ${variantClass[variant]} ${sizeClass[size]} ${props.className ?? ""}`;

  if ("href" in props && props.href) {
    return (
      <Link href={props.href} className={merged}>
        {props.children}
      </Link>
    );
  }

  const { variant: _v, size: _s, className: _c, children, ...rest } =
    props as CommonProps & ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button className={merged} {...rest}>
      {children}
    </button>
  );
}
```

- [ ] **Step 4.4: Run tests to verify they pass**

Run: `npx vitest run components/ui/Pill.test.tsx`

Expected: all 5 tests pass.

- [ ] **Step 4.5: Commit**

```bash
git add components/ui/Pill.tsx components/ui/Pill.test.tsx
git commit -m "feat(ui): Pill primitive (primary/secondary/magenta + href→Link)"
```

---

## Task 5: ColorBlock primitive (TDD)

**Files:**
- Create: `components/ui/ColorBlock.tsx`
- Create: `components/ui/ColorBlock.test.tsx`

- [ ] **Step 5.1: Write failing tests**

`components/ui/ColorBlock.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ColorBlock } from "./ColorBlock";

describe("ColorBlock", () => {
  it("renders as <section> by default", () => {
    render(<ColorBlock variant="lilac">content</ColorBlock>);
    const el = screen.getByText("content").parentElement!;
    expect(el.tagName).toBe("SECTION");
  });

  it("applies lilac background variant", () => {
    render(<ColorBlock variant="lilac">x</ColorBlock>);
    expect(screen.getByText("x").parentElement!.className).toContain(
      "bg-[var(--block-lilac)]"
    );
  });

  it("applies navy variant with inverse ink", () => {
    render(<ColorBlock variant="navy">x</ColorBlock>);
    const el = screen.getByText("x").parentElement!;
    expect(el.className).toContain("bg-[var(--block-navy)]");
    expect(el.className).toContain("text-[var(--ink-inverse)]");
  });

  it("renders as <div> when as='div'", () => {
    render(<ColorBlock variant="mint" as="div">x</ColorBlock>);
    expect(screen.getByText("x").parentElement!.tagName).toBe("DIV");
  });
});
```

- [ ] **Step 5.2: Run to verify failure**

Run: `npx vitest run components/ui/ColorBlock.test.tsx`
Expected: FAIL.

- [ ] **Step 5.3: Implement `ColorBlock.tsx`**

```tsx
import type { ReactNode } from "react";

type BlockVariant = "lilac" | "mint" | "cream" | "pink" | "navy";

interface Props {
  variant: BlockVariant;
  as?: "section" | "div";
  className?: string;
  children: ReactNode;
}

const variantClass: Record<BlockVariant, string> = {
  lilac: "bg-[var(--block-lilac)] text-[var(--ink)]",
  mint:  "bg-[var(--block-mint)]  text-[var(--ink)]",
  cream: "bg-[var(--block-cream)] text-[var(--ink)]",
  pink:  "bg-[var(--block-pink)]  text-[var(--ink)]",
  navy:  "bg-[var(--block-navy)]  text-[var(--ink-inverse)]",
};

const baseClass =
  "rounded-[var(--r-lg)] p-[var(--s-xxl)] md:rounded-[var(--r-lg)]";

export function ColorBlock({ variant, as = "section", className = "", children }: Props) {
  const Tag = as;
  return (
    <Tag className={`${baseClass} ${variantClass[variant]} ${className}`}>
      {children}
    </Tag>
  );
}
```

- [ ] **Step 5.4: Run tests to verify pass**

Run: `npx vitest run components/ui/ColorBlock.test.tsx`
Expected: all 4 tests pass.

- [ ] **Step 5.5: Commit**

```bash
git add components/ui/ColorBlock.tsx components/ui/ColorBlock.test.tsx
git commit -m "feat(ui): ColorBlock primitive (lilac/mint/cream/pink/navy)"
```

---

## Task 6: Card primitive (TDD)

**Files:**
- Create: `components/ui/Card.tsx`
- Create: `components/ui/Card.test.tsx`

- [ ] **Step 6.1: Write failing tests**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Card } from "./Card";

describe("Card", () => {
  it("renders default variant with canvas background and hairline border", () => {
    render(<Card>x</Card>);
    const el = screen.getByText("x");
    expect(el.className).toContain("bg-[var(--canvas)]");
    expect(el.className).toContain("border-[var(--hairline)]");
  });

  it("renders soft variant with surface-soft background", () => {
    render(<Card variant="soft">x</Card>);
    const el = screen.getByText("x");
    expect(el.className).toContain("bg-[var(--surface-soft)]");
  });

  it("forwards className", () => {
    render(<Card className="extra">x</Card>);
    expect(screen.getByText("x").className).toContain("extra");
  });
});
```

- [ ] **Step 6.2: Run to verify failure**

Run: `npx vitest run components/ui/Card.test.tsx`
Expected: FAIL.

- [ ] **Step 6.3: Implement `Card.tsx`**

```tsx
import type { ReactNode } from "react";

type CardVariant = "default" | "soft";

interface Props {
  variant?: CardVariant;
  className?: string;
  children: ReactNode;
}

const variantClass: Record<CardVariant, string> = {
  default: "bg-[var(--canvas)] border border-[var(--hairline)]",
  soft:    "bg-[var(--surface-soft)] border border-[var(--hairline-soft)]",
};

export function Card({ variant = "default", className = "", children }: Props) {
  return (
    <div className={`rounded-[var(--r-md)] p-[var(--s-lg)] ${variantClass[variant]} ${className}`}>
      {children}
    </div>
  );
}
```

- [ ] **Step 6.4: Run tests to verify pass**

Run: `npx vitest run components/ui/Card.test.tsx`
Expected: all 3 tests pass.

- [ ] **Step 6.5: Commit**

```bash
git add components/ui/Card.tsx components/ui/Card.test.tsx
git commit -m "feat(ui): Card primitive (default/soft variants)"
```

---

## Task 7: Eyebrow primitive (no test — pure presentation)

**Files:**
- Create: `components/ui/Eyebrow.tsx`

- [ ] **Step 7.1: Implement `Eyebrow.tsx`**

```tsx
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
}

export function Eyebrow({ children, className = "" }: Props) {
  return (
    <span
      className={`inline-block font-mono text-xs uppercase tracking-[0.08em] text-[var(--ink-muted)] ${className}`}
    >
      {children}
    </span>
  );
}
```

- [ ] **Step 7.2: Verify typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 7.3: Commit**

```bash
git add components/ui/Eyebrow.tsx
git commit -m "feat(ui): Eyebrow primitive (mono uppercase label)"
```

---

## Task 8: IconButton primitive (TDD)

**Files:**
- Create: `components/ui/IconButton.tsx`
- Create: `components/ui/IconButton.test.tsx`

- [ ] **Step 8.1: Write failing tests**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { IconButton } from "./IconButton";

describe("IconButton", () => {
  it("renders with aria-label", () => {
    render(<IconButton aria-label="Next">→</IconButton>);
    expect(screen.getByRole("button", { name: "Next" })).toBeTruthy();
  });

  it("default variant uses surface-soft background", () => {
    render(<IconButton aria-label="X">x</IconButton>);
    expect(screen.getByRole("button").className).toContain("bg-[var(--surface-soft)]");
  });

  it("inverse variant uses translucent white", () => {
    render(<IconButton variant="inverse" aria-label="X">x</IconButton>);
    expect(screen.getByRole("button").className).toContain("bg-white/10");
  });

  it("forwards onClick", () => {
    const onClick = vi.fn();
    render(<IconButton aria-label="X" onClick={onClick}>x</IconButton>);
    screen.getByRole("button").click();
    expect(onClick).toHaveBeenCalled();
  });
});
```

- [ ] **Step 8.2: Run to verify failure**

Run: `npx vitest run components/ui/IconButton.test.tsx`
Expected: FAIL.

- [ ] **Step 8.3: Implement `IconButton.tsx`**

```tsx
import type { ButtonHTMLAttributes, ReactNode } from "react";

type IconBtnVariant = "default" | "inverse";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: IconBtnVariant;
  "aria-label": string;
  children: ReactNode;
}

const variantClass: Record<IconBtnVariant, string> = {
  default: "bg-[var(--surface-soft)] text-[var(--ink)] hover:bg-[var(--hairline)]",
  inverse: "bg-white/10 text-[var(--ink-inverse)] hover:bg-white/20",
};

export function IconButton({ variant = "default", className = "", children, ...rest }: Props) {
  return (
    <button
      className={`inline-flex items-center justify-center w-10 h-10 rounded-[var(--r-full)] transition-colors ${variantClass[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 8.4: Run tests to verify pass**

Run: `npx vitest run components/ui/IconButton.test.tsx`
Expected: all 4 tests pass.

- [ ] **Step 8.5: Commit**

```bash
git add components/ui/IconButton.tsx components/ui/IconButton.test.tsx
git commit -m "feat(ui): IconButton primitive (default/inverse, 40px circle)"
```

---

## Task 9: TextInput primitive (TDD)

**Files:**
- Create: `components/ui/TextInput.tsx`
- Create: `components/ui/TextInput.test.tsx`

- [ ] **Step 9.1: Write failing tests**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { TextInput } from "./TextInput";

describe("TextInput", () => {
  it("renders an input with placeholder", () => {
    render(<TextInput placeholder="Search" />);
    expect(screen.getByPlaceholderText("Search")).toBeTruthy();
  });

  it("uses canvas background and hairline border", () => {
    render(<TextInput placeholder="x" />);
    const input = screen.getByPlaceholderText("x");
    expect(input.className).toContain("bg-[var(--canvas)]");
    expect(input.className).toContain("border-[var(--hairline)]");
  });

  it("forwards value and onChange", () => {
    render(<TextInput value="hello" onChange={() => {}} placeholder="x" />);
    expect((screen.getByPlaceholderText("x") as HTMLInputElement).value).toBe("hello");
  });
});
```

- [ ] **Step 9.2: Run to verify failure**

Run: `npx vitest run components/ui/TextInput.test.tsx`
Expected: FAIL.

- [ ] **Step 9.3: Implement `TextInput.tsx`**

```tsx
import type { InputHTMLAttributes } from "react";

export function TextInput({ className = "", ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`bg-[var(--canvas)] text-[var(--ink)] border border-[var(--hairline)] rounded-[var(--r-md)] px-[var(--s-sm)] py-[var(--s-xs)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-from)] focus:border-transparent ${className}`}
      {...rest}
    />
  );
}
```

- [ ] **Step 9.4: Run tests to verify pass**

Run: `npx vitest run components/ui/TextInput.test.tsx`
Expected: all 3 tests pass.

- [ ] **Step 9.5: Commit**

```bash
git add components/ui/TextInput.tsx components/ui/TextInput.test.tsx
git commit -m "feat(ui): TextInput primitive (focus ring, no fill change)"
```

---

## Task 10: Re-export barrel + verify all primitives

**Files:**
- Create: `components/ui/index.ts`

- [ ] **Step 10.1: Create `index.ts`**

```ts
export { Pill } from "./Pill";
export { ColorBlock } from "./ColorBlock";
export { Card } from "./Card";
export { Eyebrow } from "./Eyebrow";
export { IconButton } from "./IconButton";
export { TextInput } from "./TextInput";
```

- [ ] **Step 10.2: Run all primitive tests**

Run: `npx vitest run components/ui/`

Expected: all tests in components/ui/ pass (Pill 5 + ColorBlock 4 + Card 3 + IconButton 4 + TextInput 3 = 19 tests).

- [ ] **Step 10.3: Commit**

```bash
git add components/ui/index.ts
git commit -m "feat(ui): barrel re-export for ui primitives"
```

---

## Task 11: GiscusEmbed dark mode

**Files:**
- Modify: `components/wiki/GiscusEmbed.tsx:41`

- [ ] **Step 11.1: Edit GiscusEmbed**

In `components/wiki/GiscusEmbed.tsx`, line 41 currently reads:
```tsx
script.setAttribute("data-theme", "light");
```

Change to:
```tsx
script.setAttribute("data-theme", "preferred_color_scheme");
```

- [ ] **Step 11.2: Verify GiscusEmbed test still passes**

Run: `npx vitest run components/wiki/GiscusEmbed.test.tsx`

Expected: existing tests pass. If a test asserts `data-theme="light"`, update the assertion to `data-theme="preferred_color_scheme"`.

- [ ] **Step 11.3: Commit**

```bash
git add components/wiki/GiscusEmbed.tsx components/wiki/GiscusEmbed.test.tsx
git commit -m "feat(giscus): follow system theme via preferred_color_scheme"
```

---

## Task 12: GraphViewInner color tokenization

**Files:**
- Modify: `components/wiki/GraphViewInner.tsx`

- [ ] **Step 12.1: Read current node/edge color setup**

Run: `grep -n "color\|Color\|fill\|#[0-9a-f]" components/wiki/GraphViewInner.tsx | head -30`

Identify hard-coded color values (hex codes, `getCategoryMeta` calls, edge color literals).

- [ ] **Step 12.2: Replace literals with `getComputedStyle` lookups**

For each hard-coded label/edge/background color in `GraphViewInner.tsx`, replace with a runtime CSS variable read inside a helper called once on mount:

```tsx
function readDesignTokens() {
  if (typeof window === "undefined") return null;
  const cs = getComputedStyle(document.documentElement);
  return {
    edge:    cs.getPropertyValue("--hairline").trim() || "#e5e7eb",
    label:   cs.getPropertyValue("--ink").trim() || "#1f2937",
    bg:      cs.getPropertyValue("--canvas").trim() || "#ffffff",
  };
}
```

Use the returned values where the literals previously appeared. Category node colors (`--cat-*`) already work in dark because they're defined in `:root` only — keep as-is.

- [ ] **Step 12.3: Add a `prefers-color-scheme` listener to refresh on theme change**

```tsx
useEffect(() => {
  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = () => {
    // re-read tokens and force sigma re-render
    setThemeRev((r) => r + 1);
  };
  mql.addEventListener("change", handler);
  return () => mql.removeEventListener("change", handler);
}, []);
```

Add `const [themeRev, setThemeRev] = useState(0);` and key the sigma container or graph load on `themeRev` so colors refresh when the OS toggles dark.

- [ ] **Step 12.4: Verify build + manual check**

Run: `npm run build && npm run dev` then open `/wiki/graph` in browser. Toggle OS theme and confirm node labels/edges adapt.

- [ ] **Step 12.5: Commit**

```bash
git add components/wiki/GraphViewInner.tsx
git commit -m "feat(graph): tokenize colors so dark mode auto-applies"
```

---

## Task 13: Playwright dark screenshot baselines

**Files:**
- Create: `tests/e2e/visual-design.spec.ts`

- [ ] **Step 13.1: Confirm seed wiki slug exists**

Run: `ls content/data/concepts/데이터베이스.md && ls content/data/sources/ | head -1`

Expected: file exists. If not, substitute another known slug in the test below.

- [ ] **Step 13.2: Create the spec file**

```ts
// tests/e2e/visual-design.spec.ts
import { test, expect } from "@playwright/test";

const ROUTES = [
  { name: "landing",       path: "/" },
  { name: "wiki-index",    path: "/wiki" },
  { name: "wiki-page",     path: "/wiki/concepts/%EB%8D%B0%EC%9D%B4%ED%84%B0%EB%B2%A0%EC%9D%B4%EC%8A%A4" },
  { name: "forum-index",   path: "/forum" },
  { name: "forum-qa",      path: "/forum/qa" },
  { name: "about",         path: "/about" },
];

for (const scheme of ["light", "dark"] as const) {
  test.describe(`visual baseline (${scheme})`, () => {
    test.use({ colorScheme: scheme });
    for (const route of ROUTES) {
      test(`${route.name}`, async ({ page }) => {
        await page.goto(route.path);
        await page.waitForLoadState("networkidle");
        await expect(page).toHaveScreenshot(`${route.name}-${scheme}.png`, {
          fullPage: true,
          maxDiffPixelRatio: 0.02,
        });
      });
    }
  });
}
```

- [ ] **Step 13.3: Generate baselines**

Run: `npx playwright test tests/e2e/visual-design.spec.ts --update-snapshots`

Expected: 12 baseline PNGs written to `tests/e2e/visual-design.spec.ts-snapshots/`.

- [ ] **Step 13.4: Re-run without `--update-snapshots` to verify**

Run: `npx playwright test tests/e2e/visual-design.spec.ts`

Expected: all 12 tests pass.

- [ ] **Step 13.5: Commit**

```bash
git add tests/e2e/visual-design.spec.ts tests/e2e/visual-design.spec.ts-snapshots/
git commit -m "test(e2e): visual baseline for 6 routes × {light, dark}"
```

---

## Task 14: AppShell + SiteHeader + AuthButton — adopt primitives

**Files:**
- Modify: `components/layout/AppShell.tsx`
- Modify: `components/layout/SiteHeader.tsx`
- Modify: `components/layout/AuthButton.tsx`

- [ ] **Step 14.1: Edit AppShell**

In `components/layout/AppShell.tsx`, line 13:
- Replace `<div className="min-h-screen p-4 md:p-6 bg-[var(--bg-gradient)]">` with `<div className="min-h-screen p-4 md:p-6">` (gradient now on body via globals).

Replace `<details className="mt-4 md:hidden vf-card">` with `<details className="mt-4 md:hidden bg-[var(--canvas)] rounded-[var(--r-md)] border border-[var(--hairline)]">`.

- [ ] **Step 14.2: Edit SiteHeader to use Card**

Replace `components/layout/SiteHeader.tsx` body (the `<header>` element):

```tsx
import Link from "next/link";
import type { Route } from "next";
import { AuthButton } from "./AuthButton";
import { Card } from "@/components/ui";

interface Props { searchSlot?: React.ReactNode; }

export function SiteHeader({ searchSlot }: Props) {
  return (
    <Card className="!p-0 px-6 py-4 flex items-center gap-6">
      <Link href="/" className="font-bold text-lg text-[var(--ink)]">
        VibeForge
      </Link>
      <nav className="flex gap-4 text-sm text-[var(--ink-muted)]">
        <Link href="/wiki" className="hover:text-[var(--ink)]">Wiki</Link>
        <Link href={"/forum" as Route} className="hover:text-[var(--ink)]">Forum</Link>
        <Link href={"/about" as Route} className="hover:text-[var(--ink)]">About</Link>
      </nav>
      {searchSlot && <div className="flex-1 max-w-md">{searchSlot}</div>}
      <div className={searchSlot ? "" : "ml-auto"}>
        <AuthButton />
      </div>
    </Card>
  );
}
```

The `!p-0` overrides Card's default `p-[var(--s-lg)]` so the existing `px-6 py-4` rhythm is preserved.

- [ ] **Step 14.3: Edit AuthButton to use Pill**

Read `components/layout/AuthButton.tsx` first to understand its current shape. Replace any `<button className="...">` JSX with `<Pill variant="primary">시작하기</Pill>` for the sign-in CTA and `<Pill variant="secondary">로그아웃</Pill>` for sign-out (or the equivalent existing labels).

```tsx
import { Pill } from "@/components/ui";
// inside:
return signedIn
  ? <Pill variant="secondary" onClick={handleSignOut}>로그아웃</Pill>
  : <Pill variant="primary" onClick={handleSignIn}>로그인</Pill>;
```

- [ ] **Step 14.4: Run AppShell test + manual check**

Run: `npx vitest run components/layout/`

Expected: all layout tests pass.

- [ ] **Step 14.5: Commit**

```bash
git add components/layout/
git commit -m "refactor(layout): AppShell+SiteHeader+AuthButton use primitives"
```

---

## Task 15: Forum components — adopt Pill + Card

**Files:**
- Modify: `components/forum/PostCard.tsx`
- Modify: `components/forum/PostList.tsx`
- Modify: `components/forum/NewPostForm.tsx`
- Modify: `components/forum/CommentForm.tsx`
- Modify: `components/forum/RelatedWiki.tsx`
- Modify: `components/forum/CategoryBadge.tsx`

- [ ] **Step 15.1: Sweep replacements**

For each file above:
- Replace `<button className="...">` JSX with `<Pill variant="primary|secondary">...</Pill>` (pick variant by visual prominence).
- Replace `<div className="vf-card ...">` with `<Card>...</Card>`. If extra padding/margin classes were on the div, move them to `className` on `<Card>`.
- For `<input>` fields, swap with `<TextInput>`.
- For `<textarea>`: leave as-is (no Textarea primitive). Apply `bg-[var(--canvas)] border border-[var(--hairline)] rounded-[var(--r-md)] px-[var(--s-sm)] py-[var(--s-xs)]` inline so it visually matches TextInput.

Add `import { Pill, Card, TextInput } from "@/components/ui";` at the top of each modified file.

- [ ] **Step 15.2: Run forum + related tests**

Run: `npx vitest run components/forum/`

Expected: all tests pass. `PostCard.test.tsx` may need assertion updates if it queried the old `vf-card` class — adjust to query by role/text instead.

- [ ] **Step 15.3: Verify typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 15.4: Commit**

```bash
git add components/forum/
git commit -m "refactor(forum): adopt Pill+Card+TextInput primitives"
```

---

## Task 16: Wiki Backlinks + RelatedQA — wrap in ColorBlock

**Files:**
- Modify: `components/wiki/Backlinks.tsx`
- Modify: `components/wiki/RelatedQA.tsx`

- [ ] **Step 16.1: Wrap Backlinks in ColorBlock + Eyebrow**

Read current `Backlinks.tsx` first. Replace its outer `<section>` or `<aside>` with:

```tsx
import { ColorBlock, Eyebrow } from "@/components/ui";

// inside the return, when there are backlinks:
return (
  <ColorBlock variant="lilac" className="mt-8">
    <Eyebrow>BACKLINKS</Eyebrow>
    <h2 className="text-xl font-medium mt-2 mb-4">이 페이지를 인용한 글</h2>
    <ul className="space-y-2">
      {/* existing list rendering */}
    </ul>
  </ColorBlock>
);
```

Preserve the empty-state branch (return `null` or empty card if zero backlinks).

- [ ] **Step 16.2: Wrap RelatedQA in ColorBlock variant=mint**

Same pattern for `RelatedQA.tsx`:
```tsx
<ColorBlock variant="mint" className="mt-8">
  <Eyebrow>RELATED Q&amp;A</Eyebrow>
  <h2 className="text-xl font-medium mt-2 mb-4">관련 질문</h2>
  {/* existing list */}
</ColorBlock>
```

- [ ] **Step 16.3: Run wiki tests**

Run: `npx vitest run components/wiki/`

Expected: all tests pass. `Backlinks.test.tsx` may need updates if it queries by old DOM structure — adjust to query by role/text.

- [ ] **Step 16.4: Commit**

```bash
git add components/wiki/Backlinks.tsx components/wiki/RelatedQA.tsx
git commit -m "refactor(wiki): Backlinks(lilac) + RelatedQA(mint) use ColorBlock"
```

---

## Task 17: Landing + About — adopt Pill (and optionally one ColorBlock)

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/about/page.tsx`

- [ ] **Step 17.1: Edit landing**

In `app/page.tsx`, find any hero CTA button or link styled inline. Replace with:
```tsx
import { Pill, ColorBlock, Eyebrow } from "@/components/ui";

// hero CTA
<Pill href="/wiki" size="default">위키 둘러보기</Pill>
<Pill href="/forum" variant="secondary">포럼 보기</Pill>
```

Optionally wrap one feature section in `<ColorBlock variant="lilac">...<ColorBlock>` to demonstrate the new pattern.

- [ ] **Step 17.2: Edit about**

In `app/about/page.tsx`, replace any link-styled-as-button with `<Pill href=... variant="secondary">`.

- [ ] **Step 17.3: Run typecheck + start dev to verify routes load**

Run: `npm run typecheck`
Run: `npm run dev` then visit `/` and `/about` in browser.

Expected: typecheck passes, both pages render without runtime errors.

- [ ] **Step 17.4: Commit**

```bash
git add app/page.tsx app/about/page.tsx
git commit -m "refactor(pages): landing+about adopt Pill (and ColorBlock on landing)"
```

---

## Task 18: Cleanup — remove `vf-card`, legacy aliases, update visual baselines

**Files:**
- Modify: `app/globals.css`
- Modify: `lib/design/tokens.css`
- Modify: any consumer still referencing legacy `--surface-card`, `--text-primary`, `--accent-from`, `vf-card`

- [ ] **Step 18.1: Find remaining usages**

Run:
```bash
grep -rn "vf-card\|--surface-card\|--text-primary\|--accent-from\|--accent-to\|--accent-cta\|--text-secondary\|--radius-card" components/ app/ --include="*.tsx" --include="*.ts" --include="*.css"
```

For each hit, replace with the new token equivalent:
- `vf-card` → `<Card>` if a component, or inline `bg-[var(--canvas)] border border-[var(--hairline)] rounded-[var(--r-md)]` for one-off cases
- `--surface-card` → `--canvas`
- `--text-primary` → `--ink`
- `--text-secondary` → `--ink-muted`
- `--accent-from` → `--brand-from`
- `--accent-to` → `--brand-to`
- `--accent-cta` → `--brand-gradient`
- `--radius-card` → `--r-md`

- [ ] **Step 18.2: Remove the `.vf-card` rule from globals.css**

Delete lines 16-20 (the `.vf-card { ... }` block) from `app/globals.css`.

- [ ] **Step 18.3: Remove the legacy aliases block from tokens.css**

In `lib/design/tokens.css`, delete the comment block labeled `=== Legacy aliases — TODO remove in PR 5 cleanup ===` and the variables under it (`--surface-card`, `--surface-shadow`, `--text-primary`, `--text-secondary`, `--accent-from`, `--accent-to`, `--accent-cta`, `--radius-card`). Also remove the `--surface-shadow` override in the dark `@media` block.

- [ ] **Step 18.4: Run typecheck + tests**

Run: `npm run typecheck && npm test && npm run build`

Expected: all pass. If anything breaks, the grep in 18.1 missed a usage — find and fix.

- [ ] **Step 18.5: Re-generate Playwright baselines (intentional)**

Visual changes from removing `vf-card` shadow + cleaner styling will diff against PR 3 baselines.

Run: `npx playwright test tests/e2e/visual-design.spec.ts --update-snapshots`

Expected: 12 baselines refreshed.

- [ ] **Step 18.6: Verify all primitives + e2e + lint**

Run: `npm run lint && npm test && npx playwright test tests/e2e/visual-design.spec.ts`

Expected: all green.

- [ ] **Step 18.7: Commit**

```bash
git add -A
git commit -m "chore(cleanup): remove vf-card and legacy token aliases"
```

---

## Self-Review (run after writing the plan)

**Spec coverage check:**

| Spec section | Task(s) |
|---|---|
| Layer 1 token (color/typo/spacing/radius) | T2 |
| Layer 1 dark `@media` block | T2 |
| Layer 1 Tailwind 4 `@theme` integration | T2 |
| Geist + Pretendard Variable font loading | T1 |
| Layer 2 primitive: Pill | T4 |
| Layer 2 primitive: ColorBlock | T5 |
| Layer 2 primitive: Card | T6 |
| Layer 2 primitive: Eyebrow | T7 |
| Layer 2 primitive: IconButton | T8 |
| Layer 2 primitive: TextInput | T9 |
| Layer 2 barrel re-export | T10 |
| GiscusEmbed dark adoption | T11 |
| GraphViewInner color tokenization | T12 |
| Playwright {light,dark} baselines | T13 (initial), T18.5 (refresh) |
| Consumer migration: AppShell+SiteHeader+AuthButton | T14 |
| Consumer migration: forum components | T15 |
| Consumer migration: wiki Backlinks+RelatedQA | T16 |
| Consumer migration: landing + about | T17 |
| Cleanup: remove vf-card + legacy aliases | T18 |

All spec sections covered. ✓

**Placeholder scan:** No "TBD"/"TODO"/"implement later" remain. Each step shows actual code or exact commands.

**Type consistency:** `Pill`/`ColorBlock`/`Card`/`Eyebrow`/`IconButton`/`TextInput` exports match across barrel and consumers. Variant prop names match across tasks (`"primary" | "secondary" | "magenta"` for Pill, `"default" | "soft"` for Card, `"default" | "inverse"` for IconButton, `"lilac" | "mint" | "cream" | "pink" | "navy"` for ColorBlock).

**Out of scope held:** No page redesign, no toggle UI, no new modals — matches spec.
