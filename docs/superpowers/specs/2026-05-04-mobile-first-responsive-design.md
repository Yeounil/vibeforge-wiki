# Mobile-First Responsive Redesign — Design

**Date:** 2026-05-04
**Branch:** plan3/supabase-forum (will fork dedicated `mobile-first/*` branches per PR)
**Status:** Draft → review

## Problem

VibeForge ships with **no real mobile support**. The audit (see `components/layout/AppShell.tsx`, `components/layout/SiteHeader.tsx`, `lib/design/tokens.css`, `app/page.tsx`) confirmed:

- **SiteHeader (BLOCKER)** — Wordmark + tagline + nav + search + auth crammed into one flex row. Below 640px the search input and auth button have no room.
- **Graph view** — confirmed by user to work via touch gestures; no fallback needed.
- **Wiki TOC** — `<TableOfContents>` is in the right rail, gated `hidden lg:` → completely invisible <1024px on long-form docs.
- **Wiki prose** — `.prose table` and `.prose pre` lack `overflow-x` handling; wide tables / long code lines push the viewport.
- **Forum** — `Post detail` header uses `flex items-center justify-between` (category+title vs button) → button hangs at <640px. `CommentItem` action links are ~16px tall, well below WCAG 44×44.
- **Landing page** — `Wordmark size="hero"` uses fixed `--t-display-lg: 64px` → overflows ≤375px viewports. Hard `<br />` tags break body copy mid-clause. h2 `clamp(28px, 4.5vw, 44px)` floors at 28px, forcing "배우고, 토론하고, 성장하세요" to wrap with the trailing "요" alone on a second line.
- **Token scale** — display tokens (`--t-display-xl: 86px`, `--t-display-lg: 64px`) are fixed pixels, not responsive.
- **Tailwind usage** — desktop-first throughout. Only ~6 components use breakpoints; pattern is "base styles assume desktop, `md:`/`lg:` adjust upward."

## Goals

1. **Mobile-first base styles**: every component renders correctly at 320–639px without breakpoint overrides.
2. **No data/route changes**: pure presentation layer (CSS, tokens, layout components, new mobile-only components).
3. **Desktop preserved**: ≥1024px experience unchanged after each PR.
4. **Phased delivery**: 4 independent PRs, each independently mergeable and reviewable, with desktop regression check at each step.

## Non-goals (YAGNI)

- Custom touch-gesture implementation for the graph view — user confirmed default gestures work.
- Mobile-specific dark mode toggle.
- Native app shell, PWA install prompt, service worker.
- Per-device A/B testing infrastructure.
- Visual-regression test suite (not currently in repo; out of scope).
- Refactoring the wiki rendering pipeline, Supabase clients, or RLS migrations.

## Decisions

User choices captured during brainstorming:

| # | Decision | Choice |
|---|---|---|
| 1 | Mobile navigation pattern | **B**: bottom tab bar (app-style) |
| 2 | Bottom tab content | **B**: Wiki / Forum / Graph / About; search as header icon |
| 3 | Mobile wiki TOC pattern | **C**: sticky mini-TOC showing current section, tap to expand full list |
| 4 | Related Wiki / Q&A / Comments on mobile | **A**: bottom segmented control (single card, three tabs) |
| 5 | Graph view mobile fallback | None — keep current force-graph; touch gestures verified |
| 6 | Execution approach | **B**: 4-PR phased delivery |

## Architecture

### Breakpoint convention

Tailwind defaults retained: `sm 640 / md 768 / lg 1024 / xl 1280`. **Authoring rule**: every component's base styles target mobile (<640px). Larger viewports use `sm:` `md:` `lg:` to enhance. Existing `md:hidden` patterns that hide *desktop* affordances on mobile get inverted — mobile shows by default, desktop overrides upward.

### Token changes (`lib/design/tokens.css`)

| Token | Current | New |
|---|---|---|
| `--t-display-xl` | `86px` | `clamp(40px, 12vw, 86px)` |
| `--t-display-lg` | `64px` | `clamp(40px, 11vw, 64px)` |
| `--t-headline` | `26px` | `clamp(22px, 4.5vw, 26px)` |
| `--t-body-lg` | `20px` | `clamp(17px, 4vw, 20px)` |
| `--touch-target` | (new) | `44px` |

Spacing tokens unchanged (8px base is already mobile-appropriate).

### PR breakdown

#### PR1 — Foundation
- Token changes above (clamp + new `--touch-target`).
- `Wordmark` component: `hero` config gains responsive `mark` size and `gap` (e.g., `gap-3 sm:gap-5`, mark `36 → 56` via clamp or two configs).
- `AppShell` rebuilt:
  - Header (mobile): logo + search-toggle icon + hamburger. Existing nav/search/auth move into mobile menu sheet on small viewports.
  - New `<BottomTabBar>` component: `position: fixed; inset-x-0 bottom-0; z-40; lg:hidden`. 4 cells (Wiki/Forum/Graph/About), `min-h-[var(--touch-target)]`, active-tab via `usePathname()` prefix match, `pb-[env(safe-area-inset-bottom)]`.
  - Main element gets `pb-[64px] lg:pb-0` to clear the fixed bar.
  - Existing `<details>` mobile sidebar removed.
  - Right rail unchanged (`lg:` only).
- New `<MobileMenu>` sheet: reuses existing search component (no duplicate implementation), login/logout, About, Admin (when applicable), external links.
- Wiki prose responsive in `app/globals.css`:
  - `.prose table` → `display: block; overflow-x: auto; max-width: 100%;`
  - `.prose pre` → `overflow-x: auto;` (verify; add if missing)
  - `.prose img` → `max-width: 100%; height: auto;`
  - `.prose h1/h2/h3` → use clamped display tokens.

#### PR2 — Wiki page (`/wiki/[...slug]`)
- New `<MobileStickyTOC>` (replaces hidden `<TableOfContents>` on mobile):
  - `IntersectionObserver` tracks visible `<h2>`/`<h3>`.
  - Sticky bar at top of article: `「page title › current section ▼」`.
  - Tap → bottom sheet (≈50% viewport height) with full TOC; backdrop click or sheet handle drag closes.
  - Auto-hide when article has fewer than 3 headings.
  - `lg:hidden` (desktop keeps right-rail TOC).
- New `<WikiPageMeta>` component:
  - Single card after main article body.
  - Segmented control: **관련 위키 / Q&A / 댓글**. Default tab = 관련 위키.
  - Internally renders existing `<Backlinks>`, `<RelatedQA>`, `<GiscusEmbed>` as the three tab panels (no logic duplication).
  - Comments panel lazy-mounts (`<GiscusEmbed>` iframe is heavy; mount only when its tab activates).
  - Mobile-only (`lg:hidden`); desktop keeps current right-rail + below-article layout.

#### PR3 — Forum
- `PostCard`: stack badge → title → meta on mobile; whole card tappable; `min-h-[var(--touch-target)]`; add `:active` and `:focus-visible` states everywhere hover-only feedback exists today.
- Post detail (`app/forum/post/[id]/page.tsx`):
  - Header `flex-col gap-2 sm:flex-row sm:items-center sm:justify-between`.
  - Owner-only edit/delete actions: row above body, right-aligned, `min-h-[var(--touch-target)]`.
- `CommentItem`:
  - Header `flex-wrap`; action links `min-h-[var(--touch-target)] px-2`.
  - Reply indent `pl-3` on mobile (currently larger), keep left border line for thread continuity.
- `CommentForm`: `<textarea rows={4}>`; submit button `w-full sm:w-auto`.
- `NewPostForm`: all inputs `w-full`; button group `flex-col sm:flex-row gap-2`; cancel/submit `w-full sm:w-auto`.

#### PR4 — Landing page polish + a11y
- `app/page.tsx`:
  - Remove `<br />` tags from hero copy and "Why VibeForge" body. Add `text-pretty` (or `text-balance` on h2).
  - Hero h2 unchanged in content; depends on token clamps from PR1 — verify on physical 375px width.
  - "배우고, 토론하고, 성장하세요" h2: change inline `clamp(28px, 4.5vw, 44px)` → `clamp(22px, 5.5vw, 44px)`. Add `text-balance` to the h2 to auto-prevent the trailing-character widow.
  - Hero section padding `p-8 md:p-16` → `p-6 md:p-16`. ColorBlock receives equivalent reduction via its own padding.
  - `.btn-hero` group `flex-col gap-2 sm:flex-row sm:gap-3 sm:justify-center`. Buttons `w-full sm:w-auto`.
- Accessibility pass: ensure every interactive element has `:focus-visible`; bottom-tab cells include `aria-current="page"` when active; mobile menu sheet uses `<dialog>` or proper `role="dialog"` + focus trap.
- Playwright smoke spec at viewport 375×667 (`tests/e2e/mobile.spec.ts`): verifies bottom tab bar visible, hero h2 single-line, wiki sticky TOC appears on long doc, forum post header doesn't overflow.

## Files touched (cumulative)

- `lib/design/tokens.css` — token clamps, `--touch-target`.
- `app/globals.css` — `.prose` responsive overrides, button responsive utilities.
- `components/brand/Wordmark.tsx` — responsive hero size.
- `components/layout/AppShell.tsx` — header restructure, bottom-tab integration, sidebar removal.
- `components/layout/SiteHeader.tsx` — mobile reduction (logo + icons), nav moves to MobileMenu.
- `components/layout/BottomTabBar.tsx` *(new)*.
- `components/layout/MobileMenu.tsx` *(new)*.
- `components/wiki/MobileStickyTOC.tsx` *(new)*.
- `components/wiki/WikiPageMeta.tsx` *(new)*.
- `components/wiki/WikiPage.tsx` — wire `<WikiPageMeta>` for `<lg`, keep current right-rail/inline for desktop.
- `components/forum/PostCard.tsx`, `CommentItem.tsx`, `CommentForm.tsx`, `NewPostForm.tsx` — responsive.
- `app/forum/post/[id]/page.tsx` — header layout.
- `app/page.tsx` — landing copy/padding.
- `tests/e2e/mobile.spec.ts` *(new)*.

## Testing

Each PR runs:
1. `npm run typecheck`
2. `npm run lint`
3. `npm test` (existing unit suite must pass)
4. Manual viewport check at 320 / 375 / 414 / 768 / 1024 / 1440px in DevTools.
5. Desktop visual regression: open `/`, `/wiki`, `/wiki/<sample-long-doc>`, `/forum`, `/forum/post/<id>` at ≥1280px and confirm no visible difference vs. main.

PR4 adds the Playwright mobile spec.

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| `<MobileStickyTOC>` IntersectionObserver causes scroll jank on long pages | Throttle, only observe `h2`/`h3`, no DOM mutation in callback |
| Bottom tab bar overlaps content on iOS Safari (URL bar collapse) | `pb-[env(safe-area-inset-bottom)]`; main element `pb-[64px]` |
| Token clamps shift desktop typography unintentionally | clamp `max` set to current fixed value → desktop pixel-identical |
| Lazy-mounting Giscus breaks comment-count display on the Q&A tab | Pre-fetch comment count at server level (not iframe) — out of scope; show iframe placeholder on Comments tab only |
| `text-balance` not supported on older Safari | Graceful degradation to natural wrapping; copy still readable |
| Forum reply indent reduction breaks thread visual hierarchy at deep nesting | Keep left border + small indent; cap visible nesting depth on mobile if needed (tracked, not fixed in this scope) |
| Bottom tab bar conflicts with native iOS gestures (home indicator) | safe-area inset above |

## Out of scope (deferred)

- Local-graph view (per-page neighborhood visualization) — option C from graph brainstorm.
- Hub-list page (`/wiki/graph` mobile fallback) — not needed since graph works on mobile.
- Comment thread mobile redesign beyond tap-target/indent fixes.
- Global search modal redesign (current modal opens via icon; only minor adjustments inside MobileMenu).
- Service worker / PWA install / offline mode.
