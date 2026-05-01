# VibeForge Plan 6 — Final Polish (Content + Friend-PR Readiness) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship 2 new DB seed pages + tone pass on existing 3 + Plan 5 graph height fix + eslint flat config + content validator script + CONTRIBUTING/PR template polish, closing master spec Phase 6.

**Architecture:** Content lives in vault submodule (`content/`, repo `Yeounil/vibeforge-wiki`). Site infra changes are isolated: 1 new config (`eslint.config.mjs`), 1 new script (`scripts/check-content.ts`). No new React components, no new routes. Each vault-touching task = 2 commits (submodule + site bump).

**Tech Stack:** Next.js 15 + React 19, ESLint 9 flat config, Vitest, gray-matter, tsx. Reuses `lib/wiki/backlinks.ts` `buildAliasMap` + `WIKI_LINK_RE` (after export).

**Spec:** `docs/superpowers/specs/2026-05-01-vibeforge-final-polish-design.md`

**Predecessor branch state:** `plan3/supabase-forum`, tag `plan5-graph-giscus-about`, head `5d9be90`. Working tree has pre-existing untracked `next.txt` and modified `components/layout/AppShell.test.tsx` — leave alone, do not stage in any Plan 6 commit.

**Vault submodule:** `content/` mounts `https://github.com/Yeounil/vibeforge-wiki.git`, currently on branch `main` at `9e808d2`. All vault edits commit on `main` in the submodule. Submodule push to remote is operator's choice — plan does not push, but final task lists the push as the operator next step.

**At completion:** tag `plan6-final-polish` on the site repo at the final integration commit; submodule may be tagged `plan6-final-polish` separately at operator discretion.

---

## File Structure (locked)

**Site repo (`D:\Education`):**
- Create: `eslint.config.mjs` — ESLint 9 flat config exporting Next core-web-vitals presets.
- Create: `scripts/check-content.ts` — vault content validator. Exports `runCheck(vaultDir)` + `formatResult(r)`. CLI shim with `require.main === module` guard.
- Create: `scripts/check-content.test.ts` — 4 Vitest tests against `scripts/__fixtures__/check-content/`.
- Create: `scripts/__fixtures__/check-content/valid/data/cat/page.md` (+ a second valid page with cross-link)
- Create: `scripts/__fixtures__/check-content/missing-title/data/cat/page.md`
- Create: `scripts/__fixtures__/check-content/broken-link/data/cat/page.md`
- Create: `scripts/__fixtures__/check-content/repeat-link/data/cat/page.md` (+ target it links to)
- Modify: `lib/wiki/backlinks.ts` — add `export` to `WIKI_LINK_RE`.
- Modify: `package.json` — add `"check:content": "tsx scripts/check-content.ts"` script.
- Modify: `app/wiki/graph/page.tsx` — replace `h-[calc(100vh-180px)]` with `flex-1 min-h-0` chain; promote line-55 wrapper to `flex flex-col min-h-0`.
- Modify: `site-pages/about.md` — copy polish (1-2 lines, style-guide tone).

**Vault submodule (`content/`):**
- Create: `content/data/data-handling/what-is-a-transaction.md`
- Create: `content/data/data-handling/what-is-an-n-plus-one.md`
- Modify: `content/data/data-handling/what-is-an-index.md` — tone pass + 1-2 wikilinks to new pages.
- Modify: `content/data/code-flow/what-is-an-array.md` — tone pass + 1-2 wikilinks.
- Modify: `content/data/how-computers-work/what-is-a-process.md` — tone pass + 1-2 wikilinks.
- Modify: `content/CONTRIBUTING.md` — append "처음 기여자 가이드", "추천 토픽", "검증 (npm run check:content)" subsections.
- Modify: `content/.github/PULL_REQUEST_TEMPLATE.md` — append 1-line check:content row.

---

## Task 1: ESLint flat config (site lint non-interactive)

**Why:** Today `npm run lint` triggers `next lint`'s interactive setup prompt. A minimal ESLint 9 flat config breaks that — `npm run lint` becomes CI-friendly and friend-PR ready.

**Files:**
- Create: `eslint.config.mjs`

- [ ] **Step 1: Create `eslint.config.mjs`**

```js
// ESLint 9 flat config. Lifts next/core-web-vitals via FlatCompat so
// `npm run lint` runs non-interactively (Plan 6 minor #4).
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

export default [
  ...compat.extends("next/core-web-vitals"),
  {
    ignores: [
      ".next/**",
      "content/**",
      "archive/**",
      "public/wiki-data/**",
      "scripts/build-indexes.ts",
    ],
  },
];
```

- [ ] **Step 2: Install `@eslint/eslintrc` if missing**

Run: `npm ls @eslint/eslintrc`

If missing or unmet:
```bash
npm install --save-dev @eslint/eslintrc@^3
```

Otherwise skip.

- [ ] **Step 3: Verify lint runs non-interactively**

Run: `npm run lint`

Expected: command exits within ~10s without any "Would you like to..." prompt. Output is either "No ESLint warnings or errors" or a warning/error report. Either is acceptable for Plan 6 — Plan 6 only requires non-interactive exit, not a clean run.

If lint surfaces existing-code errors, do NOT fix them in this task — note them and move on. Plan 6 scope explicitly defers eslint-warnings-zero to v2 (spec §5.1, §10).

- [ ] **Step 4: Commit**

```bash
git add eslint.config.mjs package.json package-lock.json
git commit -m "chore(plan6): eslint flat config — non-interactive npm run lint"
```

---

## Task 2: Export `WIKI_LINK_RE` from `lib/wiki/backlinks.ts`

**Why:** `scripts/check-content.ts` (Task 3) needs the same regex shape that `buildBacklinks` uses, so wikilink detection stays DRY (spec §5.2).

**Files:**
- Modify: `lib/wiki/backlinks.ts:3`

- [ ] **Step 1: Add `export` to the regex**

Edit `lib/wiki/backlinks.ts` line 3.

Before:
```ts
const WIKI_LINK_RE = /(?<!\[)\[\[([^\[\]|]+?)(?:\|[^\[\]]+?)?\]\](?!\])/g;
```

After:
```ts
export const WIKI_LINK_RE = /(?<!\[)\[\[([^\[\]|]+?)(?:\|[^\[\]]+?)?\]\](?!\])/g;
```

- [ ] **Step 2: Verify typecheck + existing tests still green**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm test`
Expected: 99 tests pass (Plan 5 baseline).

- [ ] **Step 3: Commit**

```bash
git add lib/wiki/backlinks.ts
git commit -m "feat(plan6): export WIKI_LINK_RE for reuse by check-content"
```

---

## Task 3: `scripts/check-content.ts` content validator (TDD)

**Why:** Spec §5.2 — vault validator that surfaces frontmatter and wikilink problems before merge. Reuses `buildAliasMap` from `lib/wiki/backlinks.ts` and the regex exported in Task 2. Path-injectable for testability.

**Files:**
- Create: `scripts/check-content.ts`
- Create: `scripts/check-content.test.ts`
- Create: `scripts/__fixtures__/check-content/valid/data/db/page-a.md`
- Create: `scripts/__fixtures__/check-content/valid/data/db/page-b.md`
- Create: `scripts/__fixtures__/check-content/missing-title/data/db/page.md`
- Create: `scripts/__fixtures__/check-content/broken-link/data/db/page.md`
- Create: `scripts/__fixtures__/check-content/repeat-link/data/db/source.md`
- Create: `scripts/__fixtures__/check-content/repeat-link/data/db/target.md`

- [ ] **Step 1: Create the four fixture vaults**

`scripts/__fixtures__/check-content/valid/data/db/page-a.md`:
```markdown
---
title: 페이지 A
tags: [DB]
aliases: [page-a-alias]
updated: 2026-05-01
---
A는 [[page-b-alias]]를 참조해요.
```

`scripts/__fixtures__/check-content/valid/data/db/page-b.md`:
```markdown
---
title: 페이지 B
tags: [DB]
aliases: [page-b-alias]
updated: 2026-05-01
---
B는 별 의미 없어요.
```

`scripts/__fixtures__/check-content/missing-title/data/db/page.md`:
```markdown
---
tags: [DB]
updated: 2026-05-01
---
title이 없어요.
```

`scripts/__fixtures__/check-content/broken-link/data/db/page.md`:
```markdown
---
title: 깨진 링크 페이지
tags: [DB]
updated: 2026-05-01
---
없는 페이지를 참조: [[ghost-page]].
```

`scripts/__fixtures__/check-content/repeat-link/data/db/source.md`:
```markdown
---
title: 반복 링크
tags: [DB]
updated: 2026-05-01
---
[[target-alias]] [[target-alias]] [[target-alias]] [[target-alias]] [[target-alias]] [[target-alias]]
```

`scripts/__fixtures__/check-content/repeat-link/data/db/target.md`:
```markdown
---
title: 타겟
tags: [DB]
aliases: [target-alias]
updated: 2026-05-01
---
링크 타겟.
```

- [ ] **Step 2: Write the failing test file**

Create `scripts/check-content.test.ts`:

```ts
import path from "node:path";
import { describe, expect, test } from "vitest";
import { runCheck, formatResult } from "./check-content";

const FIX = path.resolve(__dirname, "__fixtures__/check-content");

describe("runCheck", () => {
  test("valid vault → exit 0, no errors", async () => {
    const r = await runCheck(path.join(FIX, "valid"));
    expect(r.exitCode).toBe(0);
    expect(r.errors).toEqual([]);
    expect(r.pagesChecked).toBe(2);
  });

  test("missing title → exit 1, error mentions 'title'", async () => {
    const r = await runCheck(path.join(FIX, "missing-title"));
    expect(r.exitCode).toBe(1);
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.errors.some((e) => /title/i.test(e.message))).toBe(true);
  });

  test("broken wikilink → exit 1, error mentions [[ghost-page]]", async () => {
    const r = await runCheck(path.join(FIX, "broken-link"));
    expect(r.exitCode).toBe(1);
    expect(r.errors.some((e) => e.message.includes("[[ghost-page]]"))).toBe(true);
  });

  test("link repeated >5× → exit 0 but warning emitted", async () => {
    const r = await runCheck(path.join(FIX, "repeat-link"));
    expect(r.exitCode).toBe(0);
    expect(r.errors).toEqual([]);
    expect(r.warnings.length).toBeGreaterThan(0);
    expect(r.warnings.some((w) => w.message.includes("target-alias"))).toBe(true);
  });
});

describe("formatResult", () => {
  test("clean run shows 'all good'", () => {
    const out = formatResult({
      exitCode: 0,
      errors: [],
      warnings: [],
      pagesChecked: 5,
    });
    expect(out).toContain("5 pages checked");
    expect(out).toContain("all good");
  });

  test("with errors shows file path and ERROR prefix", () => {
    const out = formatResult({
      exitCode: 1,
      errors: [{ file: "data/x.md", message: "missing 'title'" }],
      warnings: [],
      pagesChecked: 1,
    });
    expect(out).toContain("data/x.md");
    expect(out).toContain("ERROR");
    expect(out).toContain("missing 'title'");
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run scripts/check-content.test.ts`
Expected: all 6 tests FAIL with "Cannot find module './check-content'" (file doesn't exist yet).

- [ ] **Step 4: Implement `scripts/check-content.ts`**

Create `scripts/check-content.ts`:

```ts
import path from "node:path";
import { readFile, readdir, stat } from "node:fs/promises";
import matter from "gray-matter";
import { buildAliasMap, WIKI_LINK_RE } from "../lib/wiki/backlinks";
import { fileToSlug } from "../lib/wiki/slug";
import type { Page } from "../lib/wiki/types";

export interface CheckIssue {
  file: string;
  message: string;
}

export interface CheckResult {
  exitCode: 0 | 1 | 2;
  errors: CheckIssue[];
  warnings: CheckIssue[];
  pagesChecked: number;
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const REPEAT_LINK_THRESHOLD = 5;

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e);
    const s = await stat(full);
    if (s.isDirectory()) out.push(...(await walk(full)));
    else if (s.isFile() && e.endsWith(".md")) out.push(full);
  }
  return out;
}

interface ParsedPage {
  relPath: string;
  slug: string;
  title: string;
  tags: string[];
  aliases: string[];
  updated: string;
  body: string;
}

export async function runCheck(vaultDir: string): Promise<CheckResult> {
  const dataDir = path.join(vaultDir, "data");
  let mdPaths: string[];
  try {
    mdPaths = await walk(dataDir);
  } catch (e) {
    return {
      exitCode: 2,
      errors: [{ file: dataDir, message: `cannot read vault: ${(e as Error).message}` }],
      warnings: [],
      pagesChecked: 0,
    };
  }

  const errors: CheckIssue[] = [];
  const warnings: CheckIssue[] = [];
  const validPages: ParsedPage[] = [];

  for (const fullPath of mdPaths) {
    const relPath = path.relative(vaultDir, fullPath).replace(/\\/g, "/");
    let raw: string;
    try {
      raw = await readFile(fullPath, "utf-8");
    } catch (e) {
      errors.push({ file: relPath, message: `cannot read: ${(e as Error).message}` });
      continue;
    }
    let parsed: ReturnType<typeof matter>;
    try {
      parsed = matter(raw);
    } catch (e) {
      errors.push({ file: relPath, message: `frontmatter parse error: ${(e as Error).message}` });
      continue;
    }
    const data = parsed.data as Record<string, unknown>;

    const fileErrors: string[] = [];
    if (typeof data.title !== "string" || data.title.length === 0) {
      fileErrors.push("frontmatter: missing 'title' (non-empty string)");
    }
    if (
      !Array.isArray(data.tags) ||
      data.tags.length === 0 ||
      !data.tags.every((t) => typeof t === "string")
    ) {
      fileErrors.push("frontmatter: 'tags' required (non-empty string array)");
    }
    let updatedStr: string | null = null;
    if (data.updated instanceof Date) {
      updatedStr = data.updated.toISOString().slice(0, 10);
    } else if (typeof data.updated === "string") {
      updatedStr = data.updated;
    }
    if (!updatedStr || !ISO_DATE_RE.test(updatedStr)) {
      fileErrors.push("frontmatter: 'updated' required (YYYY-MM-DD)");
    }

    if (fileErrors.length > 0) {
      for (const m of fileErrors) errors.push({ file: relPath, message: m });
      continue;
    }

    const aliases = Array.isArray(data.aliases)
      ? (data.aliases.filter((a) => typeof a === "string") as string[])
      : [];

    validPages.push({
      relPath,
      slug: fileToSlug(relPath),
      title: data.title as string,
      tags: (data.tags as unknown[]).map(String),
      aliases,
      updated: updatedStr!,
      body: parsed.content,
    });
  }

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

  for (const p of validPages) {
    const linkCounts = new Map<string, number>();
    for (const match of p.body.matchAll(WIKI_LINK_RE)) {
      const target = match[1].trim();
      const resolved = aliasMap.get(target.toLowerCase());
      if (!resolved) {
        errors.push({ file: p.relPath, message: `broken wikilink: [[${target}]]` });
      }
      linkCounts.set(target, (linkCounts.get(target) ?? 0) + 1);
    }
    for (const [target, count] of linkCounts) {
      if (count > REPEAT_LINK_THRESHOLD) {
        warnings.push({
          file: p.relPath,
          message: `[[${target}]] repeated ${count}× (>${REPEAT_LINK_THRESHOLD})`,
        });
      }
    }
  }

  return {
    exitCode: errors.length > 0 ? 1 : 0,
    errors,
    warnings,
    pagesChecked: mdPaths.length,
  };
}

export function formatResult(r: CheckResult): string {
  const lines: string[] = [];
  const files = new Set<string>([
    ...r.errors.map((e) => e.file),
    ...r.warnings.map((w) => w.file),
  ]);
  const sorted = [...files].sort();
  for (const f of sorted) {
    lines.push(`${f}:`);
    for (const e of r.errors.filter((x) => x.file === f)) {
      lines.push(`  ERROR: ${e.message}`);
    }
    for (const w of r.warnings.filter((x) => x.file === f)) {
      lines.push(`  WARN:  ${w.message}`);
    }
  }
  if (lines.length > 0) lines.push("");
  if (r.errors.length === 0 && r.warnings.length === 0) {
    lines.push(`${r.pagesChecked} pages checked, all good ✓`);
  } else {
    lines.push(
      `${r.pagesChecked} pages checked, ${r.errors.length} error${r.errors.length === 1 ? "" : "s"}, ${r.warnings.length} warning${r.warnings.length === 1 ? "" : "s"}`,
    );
  }
  return lines.join("\n");
}

// CLI shim — only runs when executed directly (not when imported by tests).
if (require.main === module) {
  const root = path.resolve(__dirname, "..");
  const vault = path.join(root, "content");
  runCheck(vault)
    .then((r) => {
      process.stdout.write(formatResult(r) + "\n");
      process.exit(r.exitCode);
    })
    .catch((e) => {
      console.error(e);
      process.exit(2);
    });
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run scripts/check-content.test.ts`
Expected: 6/6 PASS.

- [ ] **Step 6: Run full test suite for regressions**

Run: `npm test`
Expected: 99 + 6 = 105 tests pass across 27 files.

- [ ] **Step 7: Commit**

```bash
git add scripts/check-content.ts scripts/check-content.test.ts scripts/__fixtures__/ lib/wiki/backlinks.ts
git commit -m "feat(plan6): scripts/check-content.ts — vault frontmatter + wikilink validator"
```

---

## Task 4: Add `check:content` to package.json

**Why:** Operator + contributors run `npm run check:content` per CONTRIBUTING.md — the script must be wired.

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add the script entry**

Insert under `scripts`, after `"build:indexes"`:

```json
"check:content": "tsx scripts/check-content.ts",
```

Final scripts section should look like:
```json
"scripts": {
  "predev": "npm run build:indexes",
  "dev": "next dev",
  "build": "npm run build:indexes && next build",
  "start": "next start",
  "build:indexes": "tsx scripts/build-indexes.ts",
  "check:content": "tsx scripts/check-content.ts",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:e2e": "playwright test",
  "lint": "next lint",
  "typecheck": "tsc --noEmit"
}
```

- [ ] **Step 2: Run against current vault**

Run: `npm run check:content`

Expected: exit 0, output ends with `3 pages checked, all good ✓` (vault currently has 3 valid pages).

If exit ≠ 0, do NOT proceed — diagnose first. Most likely cause: a vault page has a [[wikilink]] that aliasMap doesn't resolve. Either fix the link in vault or fix the script bug (rare; tests should have caught it).

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "chore(plan6): wire npm run check:content"
```

---

## Task 5: Add 2 new DB seed pages (vault)

**Why:** Spec §4 — master spec calls for 1-2 new DB topic pages with style-guide tone. Atomic creation so cross-page wikilinks resolve immediately under check-content.

**Files (vault submodule):**
- Create: `content/data/data-handling/what-is-a-transaction.md`
- Create: `content/data/data-handling/what-is-an-n-plus-one.md`

**Files (site repo):**
- Modify (submodule pointer): `content`

- [ ] **Step 1: Write `content/data/data-handling/what-is-a-transaction.md`**

```markdown
---
title: 트랜잭션이 뭐예요?
tags: [DB, 데이터 무결성]
aliases: [transaction, ACID]
updated: 2026-05-01
---

AI가 짜준 코드가 데이터를 두 군데 연달아 바꿔야 할 때, 한쪽만 성공하면 데이터가 어긋나요. 그래서 묶어요.

## 한 묶음으로 성공하거나, 한 묶음으로 없던 일이 되거나

송금이 좋은 예. "내 잔액 -1만" + "친구 잔액 +1만" 두 SQL이 *같이* 성공해야 의미가 있어요. 한쪽만 되면 1만원이 증발하거나 복사돼요.

```sql
BEGIN;
  UPDATE balance SET amount = amount - 10000 WHERE user_id = 1;
  UPDATE balance SET amount = amount + 10000 WHERE user_id = 2;
COMMIT;
```

`COMMIT` 전에 한 줄이라도 실패하면 `ROLLBACK` — 두 줄 다 없던 일.

## ACID 네 글자

- **A**tomicity 원자성 — 한 묶음, 한 결말
- **C**onsistency 일관성 — 시작도 끝도 규칙(제약 조건)에 맞아야
- **I**solation 격리 — 동시에 도는 다른 트랜잭션에 어중간한 상태가 새지 않아야
- **D**urability 영속 — `COMMIT` 이후엔 정전이 와도 살아있어야

## 언제 묶어야 해요?

"이 두 SQL이 따로 실패하면 데이터가 어긋나는가?" — yes면 트랜잭션이에요. 결제, 재고 차감, 상태 전이 같은 데가 단골.

길어지면 락(lock)을 오래 잡아 다른 사용자가 기다려요. 트랜잭션이 길수록 [[what-is-an-n-plus-one]] 같은 패턴이 더 위험해져요. 락 잡는 위치는 [[what-is-an-index]]와 깊이 엮여 있어요.
```

- [ ] **Step 2: Write `content/data/data-handling/what-is-an-n-plus-one.md`**

```markdown
---
title: N+1이 뭐예요?
tags: [DB, 성능, ORM]
aliases: [n+1, N+1 problem, n plus one]
updated: 2026-05-01
---

ORM(객체-관계 매퍼) 한 번 써본 바이브코더가 한 번은 만나는 이름. 의미는 단순해요 — 1번 쿼리로 끝낼 일을 N+1번 쿼리로 한다.

## 어떻게 N+1번이 되나요?

"유저 10명 + 각 유저의 글 개수"가 전형 예. 순진하게 짜면:

1. 유저 10명 가져오기 — SQL 1번
2. 각 유저별 글 개수 — SQL 10번

= 11번. 100명이면 101번. ORM이 lazy하게 관련 테이블을 *나중에* 가져올 때 자주 발생.

## 발견 신호

- 로그에 똑같은 모양의 SQL이 N번 찍혀요
- 페이지 로딩이 데이터 양에 정확히 비례해 느려져요
- DB CPU가 갑자기 100% — N개 동시 접속 시 곱연산이라

## 처방 한 줄씩

- **eager loading** — ORM에 "글 개수도 같이 가져와" 알려주기 (Django `select_related/prefetch_related`, Prisma `include`)
- **JOIN** — 1번 쿼리로 합쳐서 가져오기
- **batch fetch** — N개 ID를 모아 `WHERE id IN (...)` 한 번에
- **DataLoader 패턴** — GraphQL에서 자주. 같은 요청 안 N번 호출을 자동으로 배치

## 왜 위험해요?

[[what-is-an-index]]가 없으면 한 쿼리당 풀 스캔 — N+1이 N×풀스캔으로 폭발. 또 [[what-is-a-transaction]] 안에 있으면 락을 N배 더 오래 잡아요. 처음 만났을 때 *반드시* 한 번은 짚고 가야 하는 패턴.
```

- [ ] **Step 3: Commit in vault submodule**

```bash
cd content
git add data/data-handling/what-is-a-transaction.md data/data-handling/what-is-an-n-plus-one.md
git commit -m "feat(plan6): seed pages — 트랜잭션, N+1"
cd ..
```

- [ ] **Step 4: Run check-content (must pass with 5 pages valid)**

Run: `npm run check:content`
Expected: exit 0, output ends with `5 pages checked, all good ✓`.

If wikilinks broken (e.g., [[what-is-an-index]] case-sensitivity), fix in the vault file and amend the submodule commit:
```bash
cd content && git add . && git commit --amend --no-edit && cd ..
```
(`--amend` is acceptable here because submodule commits are not yet pushed.)

- [ ] **Step 5: Bump submodule pointer + commit on site**

```bash
git add content
git commit -m "feat(plan6): bump vault — add 트랜잭션, N+1 seed pages"
```

---

## Task 6: Tone pass on existing 3 vault pages

**Why:** Spec §4.3 — style-guide compliance, abbreviation expansion, add 1-2 wikilinks to the new pages so the graph picks up the connections.

**Files (vault submodule):**
- Modify: `content/data/data-handling/what-is-an-index.md`
- Modify: `content/data/code-flow/what-is-an-array.md`
- Modify: `content/data/how-computers-work/what-is-a-process.md`

**Files (site repo):**
- Modify (submodule pointer): `content`

- [ ] **Step 1: Update `content/data/data-handling/what-is-an-index.md`**

Replace the file with:

```markdown
---
title: 인덱스가 뭐예요?
tags: [DB, 성능]
aliases: [DB 인덱스, index]
updated: 2026-05-01
---

AI(인공지능)가 짜준 SQL이 너무 느릴 때, 처음 의심해야 할 게 **인덱스**예요.

## 책 뒤의 색인이랑 똑같은 거예요

소설책 마지막에 보면 "ㄱ … 23p, 47p" 이런 색인 있죠. 그게 인덱스예요. 데이터베이스(DB)가 데이터를 처음부터 끝까지 다 훑지 않고, 색인을 보고 바로 그 페이지로 점프하게 해주는 장치.

## 언제 쓰면 좋아요?

- `WHERE`, `JOIN`, `ORDER BY`에 자주 등장하는 컬럼
- 데이터가 많은 테이블 (수십만 row+)
- 읽기가 쓰기보다 압도적으로 많을 때

인덱스가 없으면 [[what-is-an-n-plus-one]]이 N×풀스캔으로 폭발해요. 그리고 [[what-is-a-transaction]]은 락을 인덱스 단위로 잡기 때문에, 인덱스 설계를 잘못하면 락 경합도 같이 나빠져요.

관련: [[what-is-a-process]]는 운영체제(OS) 쪽 개념인데, DB도 결국 프로세스 안에서 돌아가요.
```

- [ ] **Step 2: Update `content/data/code-flow/what-is-an-array.md`**

Replace with:

```markdown
---
title: 배열이 뭐예요?
tags: [자료구조, 기초]
aliases: [array, list]
updated: 2026-05-01
---

배열은 **메모리에 한 줄로 붙여놓은 값들의 나열**이에요.

## 한 줄로 붙어 있다는 게 핵심

`[1, 2, 3, 4, 5]`처럼 보이지만, 실제로는 메모리 위에 다섯 칸이 *연속으로* 잡혀 있어요. 그래서:

- `arr[3]`은 *즉시* 가능 — 거의 즉시(`O(1)`). 시작 주소 + 3 × 칸 크기로 한 번에 점프
- 가운데 끼워넣기는 *비싸요* — 뒤를 다 밀어야 해서 데이터 양에 비례(`O(n)`)

## 다른 자료구조와의 관계

- 리스트가 *늘어나는* 자료구조면, 배열은 *고정 크기*가 본래 모습 (JS·Python의 `[]`는 사실 동적 배열)
- 키-값 매핑이 필요하면 [[what-is-an-index]]에서 본 *해시맵*이 적격
- 데이터베이스(DB)에서 한 번에 N개를 한꺼번에 가져오려면 [[what-is-an-n-plus-one]]을 피하기 위해서라도 배열로 묶어 보내는 게 좋아요

배열을 다루다 보면 [[what-is-a-process]] 메모리 한도에 부딪히기도 해요 — 너무 큰 배열은 운영체제(OS)가 안 줘요.
```

- [ ] **Step 3: Update `content/data/how-computers-work/what-is-a-process.md`**

Replace with:

```markdown
---
title: 프로세스가 뭐예요?
tags: [OS, 기초]
aliases: [process]
updated: 2026-05-01
---

`node server.js` 라고 치면, 운영체제(OS)가 *프로세스*를 하나 만들어줘요.

## 프로세스 = 실행 중인 프로그램

코드(파일) 자체는 프로그램. 그 코드가 메모리에 올라가서 중앙처리장치(CPU)가 한 줄씩 실행하기 시작하면 — 그게 프로세스예요.

각 프로세스는 자기만의:
- 메모리 공간
- 파일 핸들
- 환경 변수

를 가져요. 다른 프로세스랑 직접 변수 공유 못 해요. 그래서 [[what-is-an-index]] 같은 데이터베이스(DB) 쿼리는 다른 프로세스(DB 서버)에 부탁해서 결과만 받는 구조.

## 자주 만나는 곳

- 터미널에서 명령 한 번 = 프로세스 한 개
- `Ctrl+C` = 그 프로세스 죽이기
- 웹 서버 = 보통 프로세스 한 개 (혹은 몇 개)

DB와 트랜잭션 얘기는 [[what-is-a-transaction]]에서 더 깊이 들어가요. 같은 DB 프로세스가 여러 트랜잭션을 돌리는 모양새.
```

- [ ] **Step 4: Commit in vault submodule**

```bash
cd content
git add data/data-handling/what-is-an-index.md data/code-flow/what-is-an-array.md data/how-computers-work/what-is-a-process.md
git commit -m "polish(plan6): tone pass on 3 existing pages — abbreviations, new wikilinks"
cd ..
```

- [ ] **Step 5: Run check-content**

Run: `npm run check:content`
Expected: exit 0, `5 pages checked, all good ✓`.

- [ ] **Step 6: Bump submodule pointer + commit on site**

```bash
git add content
git commit -m "polish(plan6): bump vault — tone pass on 3 existing pages"
```

---

## Task 7: CONTRIBUTING.md + PR template polish (vault)

**Why:** Spec §6 — friend-PR readiness. First-timer guide, topic suggestions, check:content usage, +1 line in PR template.

**Files (vault submodule):**
- Modify: `content/CONTRIBUTING.md`
- Modify: `content/.github/PULL_REQUEST_TEMPLATE.md`

**Files (site repo):**
- Modify (submodule pointer): `content`

- [ ] **Step 1: Replace `content/CONTRIBUTING.md`**

```markdown
# 기여 규칙

## 톤

전공자 노트 톤 ❌ → 바이브코더 톤 ✅. [style-guide.md](./style-guide.md) 참조.

## Frontmatter

모든 페이지는 다음 frontmatter로 시작합니다:

```yaml
---
title: 페이지 제목 (한국어)
tags: [태그1, 태그2]
aliases: [별칭1]      # [[wiki-link]] 매칭에 사용 (옵션)
video: https://...     # YouTube URL (옵션)
updated: 2026-05-01
---
```

## 위키 링크

다른 페이지를 인용할 땐 `[[페이지 제목]]` 또는 `[[페이지 슬러그]]` 형태로:

- `[[what-is-an-index]]` → 슬러그 매칭
- `[[인덱스가 뭐예요?]]` → 제목 매칭
- `[[DB 인덱스]]` → aliases 매칭

## 카테고리 폴더

- `data/data-handling/` — DB · SQL · 인덱스 · 트랜잭션
- `data/how-computers-work/` — OS · 프로세스 · 메모리
- `data/code-flow/` — 자료구조 · 알고리즘

새 카테고리는 PR로 제안해주세요.

## PR 절차

1. fork
2. branch (`add/<short-description>`)
3. 페이지 작성 (frontmatter + 본문)
4. PR — `.github/PULL_REQUEST_TEMPLATE.md` 채우기
5. 본인이 review·merge

## 처음 기여자 가이드

GitHub에서 처음 PR 보낸다면:

1. 이 repo 우측 상단 **Fork** 버튼 → 본인 계정으로 복사
2. 로컬 clone:
   ```bash
   git clone https://github.com/<당신>/vibeforge-wiki.git
   cd vibeforge-wiki
   ```
3. branch 생성:
   ```bash
   git checkout -b add/<페이지-슬러그>
   ```
4. 페이지 작성 → commit → push → GitHub에서 **Pull request** 버튼 → review 요청
5. 한 PR = 한 페이지 (review 단순화). 여러 페이지면 PR 여러 개로.

## 추천 토픽

뭐부터 쓸지 막막하면:

- **깨진 `[[wiki-link]]`이 좋은 후보** — 누군가가 이미 인용하려 했다는 뜻이에요. site에서 빨간 strikethrough 링크를 찾아보세요.
- **`data/data-handling/`의 미작성 자매 토픽**: 정규화, 격리수준, JOIN, 락, 인덱스 종류
- **첫 PR이라면 200-400단어 1페이지부터** — 익숙해지면 길게.

## 검증 (`npm run check:content`)

PR 보내기 전에, [vibeforge-site](https://github.com/Yeounil/vibeforge-site) repo에서:

```bash
npm install   # 처음 한 번
npm run check:content
```

frontmatter 필수 필드 + `[[wiki-link]]` 해상도를 자동 검사합니다.

- error 0건이어야 merge 가능
- warning(같은 link 6번 등)은 안내성, blocking 아님

site repo가 vault 변경을 자동 반영하지 않는다면 `git submodule update --remote content` 후 재실행.
```

- [ ] **Step 2: Replace `content/.github/PULL_REQUEST_TEMPLATE.md`**

```markdown
## 이 PR이 추가/수정하는 페이지

- [ ] 새 페이지: `data/<카테고리>/<slug>.md`
- [ ] 기존 페이지 수정

## 체크리스트

- [ ] frontmatter 5개 필드 (`title`, `tags`, `aliases`, `video?`, `updated`) 채웠어요
- [ ] [style-guide.md](../style-guide.md) 톤 따랐어요
- [ ] 다른 페이지 인용 시 `[[wiki-link]]` 사용했어요
- [ ] vibeforge-site에서 `npm run check:content` 통과했어요 (있으면 빠른 review)
- [ ] 로컬에서 vibeforge-site `npm run dev`로 깨진 링크 없는지 확인했어요 (선택)
```

- [ ] **Step 3: Commit in vault submodule**

```bash
cd content
git add CONTRIBUTING.md .github/PULL_REQUEST_TEMPLATE.md
git commit -m "docs(plan6): CONTRIBUTING + PR template — first-timer guide, check-content"
cd ..
```

- [ ] **Step 4: Bump submodule pointer + commit on site**

```bash
git add content
git commit -m "docs(plan6): bump vault — CONTRIBUTING + PR template polish"
```

---

## Task 8: Graph view height fix (Plan 5 minor #1)

**Why:** Spec §5.4 — replace `h-[calc(100vh-180px)]` magic number with `flex-1 min-h-0` chain. Header tweaks won't break canvas height anymore.

**Files:**
- Modify: `app/wiki/graph/page.tsx:55-58`

- [ ] **Step 1: Apply the edit**

In `app/wiki/graph/page.tsx`, change lines 55-58.

Before:
```tsx
      <div className="flex-1 px-4 md:px-6 pb-6">
        <div className="vf-card h-[calc(100vh-180px)] overflow-hidden">
          <GraphView data={data} />
        </div>
      </div>
```

After:
```tsx
      <div className="flex-1 px-4 md:px-6 pb-6 flex flex-col min-h-0">
        <div className="vf-card flex-1 min-h-0 overflow-hidden">
          <GraphView data={data} />
        </div>
      </div>
```

- [ ] **Step 2: Verify typecheck + tests**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm test`
Expected: 99 + 6 = 105 tests pass.

- [ ] **Step 3: Manual smoke (operator)**

If a dev server is convenient: `npm run dev`, browse to `/wiki/graph`, resize the window vertically and horizontally. Canvas should fill the viewport below the header strip and shrink/grow with the window. No vertical scrollbar from the canvas wrapper.

If no dev server, skip — Task 9 final smoke covers it.

- [ ] **Step 4: Commit**

```bash
git add app/wiki/graph/page.tsx
git commit -m "fix(plan6): graph height via flex chain (replace calc magic number)"
```

---

## Task 9: site-pages/about.md copy polish

**Why:** Spec §5.5 — current about copy is functional but flat. 1-2 lines of personality matching style-guide tone.

**Files:**
- Modify: `site-pages/about.md`

- [ ] **Step 1: Replace `site-pages/about.md`**

```markdown
---
title: About
---

# VibeForge

AI(인공지능)가 짜준 코드를 한 단계 더 깊게 이해하고 싶을 때 들어오는 사이트.

VibeForge는 바이브코더를 위한 CS(컴퓨터 과학) 학습·토론 공간입니다. 큐레이트된 위키와 실전 Q&A, 그리고 둘 사이를 잇는 양방향 백링크로 학습 사이클이 사이트 안에서 닫혀요.

- [Wiki](/wiki) — 카테고리별 정리된 CS 지식
- [Forum](/forum) — Q&A · 일반 · 공지
- [그래프뷰](/wiki/graph) — 위키 페이지 사이의 연결 시각화

## 기여

이 사이트와 위키는 누구나 PR을 보낼 수 있는 오픈 프로젝트입니다.
[기여 가이드](/about/contribute)를 참조하세요.
```

- [ ] **Step 2: Verify typecheck + tests**

Run: `npx tsc --noEmit && npm test`
Expected: clean + 105 tests pass.

- [ ] **Step 3: Commit**

```bash
git add site-pages/about.md
git commit -m "polish(plan6): about page copy — style-guide tone"
```

---

## Task 10: Final verification + tag

**Why:** Confirm cross-task integration: typecheck clean, all tests green, both surfaces (graph view, content) coherent. Tag the integration commit.

**Files:** none modified — verification + tag only.

- [ ] **Step 1: Full typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0, no output.

- [ ] **Step 2: Full unit test suite**

Run: `npm test`
Expected: `Tests  105 passed` across 27 files. Plan 5's 99 + Plan 6's 6 from check-content.

- [ ] **Step 3: Lint non-interactive check**

Run: `npm run lint`
Expected: command exits within ~10s without interactive prompt. Warnings are OK.

- [ ] **Step 4: check-content against real vault**

Run: `npm run check:content`
Expected: exit 0, `5 pages checked, all good ✓`.

- [ ] **Step 5: e2e suite (if convenient)**

Run: `npm run test:e2e -- --reporter=line`
Expected: 18 tests; 15 pass + 3 skip (giscus + 2 wiki-qa-backlinks env-gated). Same as Plan 5 baseline. If dev server can't start in this environment, skip — flag for operator manual.

- [ ] **Step 6: Confirm WIP files untouched**

Run: `git status --short`
Expected output includes:
```
 M components/layout/AppShell.test.tsx
?? next.txt
```
These are pre-existing user WIP. They MUST NOT appear in any Plan 6 commit.

Run: `git log --oneline plan5-graph-giscus-about..HEAD`
Expected: ~9 commits, all `feat/fix/polish/docs/chore(plan6):` prefixes.

- [ ] **Step 7: Tag**

```bash
git tag plan6-final-polish
```

(No push. Operator decides when to push.)

- [ ] **Step 8: Operator handoff checklist (NOT a code task — print for user)**

Print to chat:

```
✅ Plan 6 complete on branch plan3/supabase-forum (tag plan6-final-polish).

Vault submodule: 4 commits on main (not yet pushed).
Site repo: ~9 commits on plan3/supabase-forum (not yet pushed).

Operator next steps (manual):
1. Push vault: cd content && git push origin main
2. Push site:  git push origin plan3/supabase-forum
3. Manual smoke (browser):
   - /wiki/graph — 5 nodes, click 트랜잭션 → /wiki/data/data-handling/what-is-a-transaction
   - /wiki/data/data-handling/what-is-a-transaction — body renders, giscus shows comment box
   - /wiki/data/data-handling/what-is-an-n-plus-one — same
   - Resize window on /wiki/graph — canvas fills viewport
   - /about — new copy with personality
4. Verify Vercel auto-rebuild on vault push (open question §12 in spec)
5. (Optional) Push to vibeforge-wiki main and watch friend wiki PR for first review pass

Plan 6 covers Phase 6 of master spec. Phase Plan complete.
```

- [ ] **Step 9: Commit (none — Task 10 is verification + tag only)**

No commit for Task 10. The tag is the marker.

---

## Self-Review (controller — pre-handoff)

**Spec coverage check:**

| Spec section | Implementing task |
|---|---|
| §3 file structure (5 new + 9 modified) | All file paths covered across Tasks 1, 3, 4, 5, 6, 7, 8, 9 |
| §4.1 transaction page | Task 5 step 1 |
| §4.2 n-plus-one page | Task 5 step 2 |
| §4.3 tone pass on 3 existing | Task 6 |
| §5.1 eslint flat config | Task 1 |
| §5.2 check-content contract | Task 3 |
| §5.3 check-content tests | Task 3 step 2 (4 + 2 formatResult tests) |
| §5.4 graph height fix | Task 8 |
| §5.5 about copy polish | Task 9 |
| §6.1 CONTRIBUTING.md polish | Task 7 step 1 |
| §6.2 PR template +1 line | Task 7 step 2 |
| §7 content authoring paths answer | Documented in spec; no code task — operator-facing answer |
| §11 success criteria | Task 10 verification covers all 7 checkboxes |
| §12 open questions | Operator handoff in Task 10 step 8 mentions Vercel auto-rebuild |

**Placeholder scan:** none. All code blocks complete. All commit messages explicit. All commands have expected output.

**Type consistency:**
- `runCheck(vaultDir): Promise<CheckResult>` — defined Task 3 step 2 (test), implemented Task 3 step 4 ✓
- `formatResult(r: CheckResult): string` — defined Task 3 step 2 (test), implemented Task 3 step 4 ✓
- `CheckIssue { file, message }` — used in errors/warnings arrays consistently ✓
- `CheckResult { exitCode, errors, warnings, pagesChecked }` — single shape across module ✓
- `WIKI_LINK_RE` — exported in Task 2, imported in Task 3 ✓
- `buildAliasMap` — already exported, imported in Task 3 ✓
- `fileToSlug` — already exported from `lib/wiki/slug.ts` (strips `data/` prefix), imported in Task 3 to keep slug shape consistent with `loadVault` ✓
- `Page` type from `lib/wiki/types` — used in `pageRecords` array. Types already include `frontmatter.video: string | null` and `frontmatter.aliases: string[]` ✓

**Submodule discipline:**
- Vault tasks (5, 6, 7) each commit in submodule first, then bump pointer in site. Both commits in the same task.
- Pre-existing WIP files (AppShell.test.tsx, next.txt) have explicit "do not stage" reminder in plan header + Task 10 step 6.

---

## Out of scope (per spec §10)

- Site CI workflow (`.github/workflows/ci.yml`)
- Vercel webhook config for vault auto-rebuild
- Admin UI / Supabase-backed pages
- Local vault auto-push watcher
- Graph memoization, hover preview cards, search/filter
- giscus dark-mode toggle
- Issue templates
- More than 2 new content pages
