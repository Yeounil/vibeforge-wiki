# Wiki Typography & Wiki-link Visual Polish — Design

**Date:** 2026-05-02
**Branch:** plan3/supabase-forum
**Status:** Draft → review

## Problem

After importing 98 LLM-vault pages into `content/data/{concepts,entities,people,sources}/`, wiki pages render as **structurally correct but visually unstyled HTML**. Tables show as borderless aligned text; wiki-links render as plain text indistinguishable from prose; fenced code blocks have no background.

Root cause: `components/wiki/WikiPage.tsx:57` wraps the rendered body in `<div className="prose max-w-none">`, but **`@tailwindcss/typography` is not installed** (only `tailwindcss@4.1.0` and `@tailwindcss/postcss@4.1.0` are deps). The `prose` class is undefined → all element styles fall back to browser defaults.

Confirmed at the data layer: `lib/wiki/render.ts` (remark-gfm + remarkWikiLink + rehype-* pipeline) and `lib/wiki/backlinks.ts` (alias map) work correctly. Sample page `/wiki/concepts/SQL` produces:
- 5/5 wiki-links resolved to correct slugs (verified in rendered HTML)
- Table rendered as semantic `<table><thead><tr><th>...` HTML
- 0 broken wiki-links

The fix is purely CSS/configuration.

## Goals

1. Tables, headings, lists, blockquotes, inline+fenced code all visually styled.
2. Wiki-links (`<a data-wiki-target>`) visually distinct from external links.
3. Existing site palette preserved — wiki pages feel like part of VibeForge, not a separate themed surface.
4. No JavaScript / parser / route changes. No vault content changes.

## Non-goals (YAGNI)

- Syntax highlighting for fenced code blocks (deferred — most code samples are short examples; can add later via `rehype-highlight` or `shiki` without touching this layer)
- Hover preview cards for wiki-links (Obsidian feature, separate project-scope effort)
- Dark mode (site is light-only)
- Backlinks panel (right rail) visual redesign — currently functional simple list, no user complaint
- Visual regression test infrastructure — not present in repo, scope creep

## Decisions

User choices captured during brainstorming:

| # | Decision | Choice |
|---|---|---|
| 1 | Polish scope | **B**: typography plugin + site-palette overlay (≈1-2h) |
| 2 | Wiki-link visual treatment | **A**: distinct color only (no bracket icon) |
| 3 | Code block style | **A**: minimal — gray background + monospace, no syntax highlighting |

## Architecture

All changes confined to:

1. **`package.json`** — add `@tailwindcss/typography` as a devDependency.
2. **`app/globals.css`** — register the plugin (Tailwind 4 CSS-first syntax) + add `.prose` overrides using existing design tokens from `lib/design/tokens.css`.

Out of scope and explicitly **untouched**:
- `lib/wiki/render.ts` — markdown rendering pipeline
- `lib/wiki/wiki-link.ts` — remark plugin
- `lib/wiki/backlinks.ts` — alias map / backlink builder
- `components/wiki/WikiPage.tsx` — already wraps body in `prose max-w-none` correctly
- Any vault `.md` content

## Concrete CSS

Append to `app/globals.css` after the existing `vf-card` and broken-link rules:

```css
/* Tailwind 4 plugin registration — CSS-based */
@plugin "@tailwindcss/typography";

/* Wiki body typography — bridges typography plugin defaults to site palette */
.prose {
  --tw-prose-body: var(--text-primary);
  --tw-prose-headings: var(--text-primary);
  --tw-prose-links: var(--accent-from);
  --tw-prose-bold: var(--text-primary);
  --tw-prose-code: var(--text-primary);
  --tw-prose-quotes: var(--text-secondary);
}

/* Tables — rounded with subtle accent header */
.prose table {
  border-collapse: collapse;
  border-radius: 8px;
  overflow: hidden;
}
.prose thead { background: rgba(124, 58, 237, 0.06); }
.prose th,
.prose td {
  padding: 0.5em 0.75em;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

/* Inline + fenced code — light gray boxes, no syntax highlighting */
.prose code {
  background: rgba(0, 0, 0, 0.04);
  padding: 0.1em 0.3em;
  border-radius: 4px;
}
.prose pre {
  background: rgba(0, 0, 0, 0.04);
  padding: 1em;
  border-radius: 8px;
}
.prose pre code {
  background: transparent;
  padding: 0;
}

/* Wiki-links — distinct from prose default link color via dotted underline +
   accent color + soft hover background. data-wiki-target is set by
   lib/wiki/render.ts rehypeResolveWikiLinks plugin. */
.prose a[data-wiki-target] {
  color: var(--accent-from);
  text-decoration: underline dotted;
  text-underline-offset: 0.2em;
  text-decoration-thickness: 1.5px;
}
.prose a[data-wiki-target]:hover {
  background: rgba(124, 58, 237, 0.08);
  border-radius: 3px;
}
```

Existing `a[data-broken="true"]` rule in `globals.css` (gray + line-through + " (broken)" suffix) is **kept as-is** — this gives three visually distinct link states: external link (prose default), valid wiki-link (purple dotted), broken wiki-link (gray strikethrough).

## Compatibility check

Install latest `@tailwindcss/typography` (≥0.5.16, which supports Tailwind 4). **Fallback if the `@plugin` directive doesn't activate prose styles cleanly:** drop the plugin entirely and write the `.prose` element selectors directly (≤80 lines of CSS covering h1–h6, ul/ol, blockquote, p, table, code, pre, a). Adds ~30 minutes; same final visual outcome.

## Testing

**Visual verification (manual)** — start `npm run build && npm start`, browse 6 representative pages, screenshot or inspect:

| Page | Element under test |
|---|---|
| `/wiki/concepts/SQL` | Tables (3-column), inline `<code>` (CREATE/SELECT etc.), wiki-links to `관계 대수`, `관계 해석` |
| `/wiki/concepts/교착상태` | Tables (2-column avoidance/prevention table), heavy wiki-links |
| `/wiki/concepts/데이터마이닝` | Bullet lists, sub-headings, wiki-link density |
| `/wiki/sources/2026-04-18-dm-p04-리스트` | Fenced ```r code blocks (multi-line), HTML-entity inline code workaround |
| `/wiki/code-flow/what-is-an-array` | Existing pre-import page — must not regress |
| `/wiki/data-handling/what-is-a-transaction` | Existing pre-import page — must not regress |

**Automated tests:** `npm test` must remain 115/115 green. No new tests added — typography is visual, not logic.

**Build verification:** `npm run build` must succeed with no new warnings. `npm run lint` and `npm run typecheck` clean.

## Risks & rollback

| Risk | Mitigation |
|---|---|
| `@tailwindcss/typography` v0.5.x incompatible with Tailwind 4.1 | Fallback: hand-written `.prose *` selectors (described above) |
| Existing `vf-card` shadow + new `.prose table` overflow:hidden interaction | Visually verify in test step; if conflict, scope `overflow:hidden` to `.prose table` only (already scoped) |
| Wiki-link purple clashes with broken-link gray | Both are existing tokens (`--accent-from`, hard-coded `#999`). Tested visually in test step. |

**Rollback:** revert the typography commit(s) — at most a `package.json`/lockfile change and a `globals.css` change. No data migration, no content rewrites, no deploy-blocking dependency.

## Out of scope but flagged for later

- The right-rail Backlinks panel could show inbound link counts and a snippet (currently just title list). Not user-requested. File a separate issue if desired.
- Graph view (`/wiki/graph`) styling — separate concern.
- Tag pill styling on wiki page header — uses simple `underline` currently; could harmonize but not user-requested.
