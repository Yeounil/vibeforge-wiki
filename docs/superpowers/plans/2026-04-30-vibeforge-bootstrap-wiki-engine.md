# VibeForge — Plan 1: Bootstrap & Wiki Engine

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up Next.js 15 site that reads a `vibeforge-wiki` git submodule, renders any markdown page with `[[wiki-link]]` resolution, displays backlinks, supports tag pages and full-text search. Replace the abandoned Quartz scaffold. No DB, no auth, no Forum yet — those come in Plans 3+.

**Architecture:** Repo split. `vibeforge-site` (this repo, `D:/Education`) holds Next.js code with `content/` as a git submodule pointing to `vibeforge-wiki` (separate public repo). Build-time pipeline in `scripts/build-indexes.ts` walks `content/`, parses each `.md` with `unified` + `remark`, builds backlink/tag/search indexes as static JSON in `public/wiki-data/`. Pages are statically generated; search hits a Route Handler that loads the index lazily.

**Tech Stack:** Next.js 15 (App Router) · React 19 · TypeScript strict · Tailwind v4 · `unified` + `remark-parse` + `remark-gfm` + `remark-rehype` + `rehype-stringify` + custom `[[wiki-link]]` plugin · `gray-matter` · `MiniSearch` · Vitest + `@testing-library/react` · Playwright. Deploy: Vercel.

**Spec:** `docs/superpowers/specs/2026-04-30-vibeforge-design.md` (root commit `11a5a3f`)

**Related plans (future, NOT in scope here):**
- Plan 2: Visual polish via `frontend-design` skill (apply `design.png` tone, 3-col layout, Pretendard font, gradients, cards)
- Plan 3: Supabase Cloud + GitHub OAuth + Forum CRUD (Q&A · 일반 · 공지)
- Plan 4: Wiki ↔ Q&A bidirectional backlinks (auto-extract `/wiki/...` from Q&A bodies)
- Plan 5: Graph view (`react-force-graph`) + giscus on wiki pages + About / Contribute pages
- Plan 6: Polish + seed content tone reformat (DB topic friendly relabel)

**Plan 1 deliverable:** `npm run dev` in `D:/Education` opens a working wiki — every `.md` in `vibeforge-wiki` is reachable, `[[wiki-link]]`s resolve, broken ones render styled, backlinks show under each page, `/wiki/tag/<tag>` lists tagged pages, search finds pages by title/body. Bare functional UI only — no design polish.

---

## File Structure (target after Plan 1)

```
D:/Education/                                        # vibeforge-site repo
├── .gitattributes                                    # LF normalization
├── .gitignore                                        # already exists, extend in 0.2
├── .gitmodules                                       # added in 0.7
├── DESIGN.md                                         # already committed
├── design.png                                        # already committed
├── README.md                                         # added in 1.20
├── archive/quartz/                                   # quartz/ moved here in 0.1
├── content/                                          # submodule → vibeforge-wiki
├── docs/superpowers/                                 # specs + plans
├── package.json                                      # next, react, tailwind, etc.
├── tsconfig.json                                     # strict mode
├── next.config.ts
├── postcss.config.mjs                                # tailwind v4
├── vitest.config.ts
├── playwright.config.ts                              # e2e in 1.19
├── app/
│   ├── layout.tsx                                    # root, minimal
│   ├── page.tsx                                      # placeholder home
│   ├── globals.css                                   # tailwind import
│   ├── api/search/route.ts                           # 1.17
│   └── wiki/
│       ├── page.tsx                                  # 1.15: index
│       ├── [...slug]/page.tsx                        # 1.14: dynamic page
│       └── tag/[tag]/page.tsx                        # 1.16: tag index
├── components/wiki/
│   ├── BrokenLink.tsx                                # 1.11
│   ├── Backlinks.tsx                                 # 1.12
│   ├── WikiPage.tsx                                  # 1.13
│   └── SearchBox.tsx                                 # 1.18
├── lib/wiki/
│   ├── slug.ts + slug.test.ts                        # 1.1
│   ├── frontmatter.ts + .test.ts                     # 1.2
│   ├── wiki-link.ts + .test.ts                       # 1.3
│   ├── load.ts + .test.ts                            # 1.4
│   ├── backlinks.ts + .test.ts                       # 1.5
│   ├── tags.ts + .test.ts                            # 1.6
│   ├── search-index.ts + .test.ts                    # 1.7
│   ├── render.ts + .test.ts                          # 1.8
│   └── types.ts                                      # shared Page, BacklinkMap, etc.
├── scripts/
│   └── build-indexes.ts                              # 1.9: writes public/wiki-data/*.json
├── public/wiki-data/                                 # generated, gitignored
└── tests/e2e/
    └── wiki-render.spec.ts                           # 1.19

D:/vibeforge-wiki/                                    # separate repo (created in 0.6)
├── .gitattributes
├── README.md
├── CONTRIBUTING.md                                   # contribution rules
├── style-guide.md                                    # vibe coder tone guide
├── data/
│   ├── data-handling/
│   │   └── what-is-an-index.md                       # seed page 1
│   ├── how-computers-work/
│   │   └── what-is-a-process.md                      # seed page 2
│   └── code-flow/
│       └── what-is-an-array.md                       # seed page 3
└── .github/PULL_REQUEST_TEMPLATE.md
```

**Decomposition rationale:** `lib/wiki/` modules are pure functions over the page set, each ≤150 lines, each independently testable. UI components in `components/wiki/` are presentational and consume pre-built indexes. `scripts/build-indexes.ts` is the only place that writes to disk; everything else is read-only at runtime.

---

## Phase 0 — Cleanup & Bootstrap (7 tasks)

### Task 0.1: Archive quartz/

**Files:**
- Move: `quartz/` → `archive/quartz/`

- [ ] **Step 1: Verify quartz/ is untracked and unused**

Run: `git -C D:/Education status --short | grep quartz`
Expected: `?? quartz/` (untracked) — confirms safe to move.

- [ ] **Step 2: Move quartz to archive/**

```bash
mkdir -p D:/Education/archive
mv D:/Education/quartz D:/Education/archive/quartz
```

- [ ] **Step 3: Verify the move**

Run: `ls D:/Education/archive/`
Expected: `quartz` directory present.
Run: `ls D:/Education/ | grep -i quartz`
Expected: empty (no quartz in root).

- [ ] **Step 4: Commit the archive (with archive/ contents excluded from future tracking)**

`archive/` is bulky (`node_modules` was inside `quartz/`). Add to .gitignore *before* commit so we don't accidentally track 50k files.

Edit `D:/Education/.gitignore`, append:

```
# Archived legacy Quartz scaffold (Plan 1, Task 0.1)
/archive/
```

```bash
git -C D:/Education add .gitignore
git -C D:/Education commit -m "chore: archive abandoned quartz scaffold"
```

Expected: 1 file changed (`.gitignore`). `archive/` itself is ignored — that's intentional, it just lives on disk for reference; if we want to delete it later, `rm -rf archive/`.

---

### Task 0.2: Extend .gitignore for Next.js stack

**Files:**
- Modify: `D:/Education/.gitignore`

- [ ] **Step 1: Append Next.js / Node entries**

Replace `D:/Education/.gitignore` content with:

```gitignore
# Superpowers visual companion
.superpowers/

# IDE
.claude/
.idea/
.vscode/

# Node
node_modules/
.pnp
.pnp.js
npm-debug.log*

# Next.js
.next/
out/
next-env.d.ts

# Vercel
.vercel

# Build outputs
/public/wiki-data/

# Test coverage
/coverage
/test-results
/playwright-report

# Env
.env*
!.env.example

# OS
.DS_Store
Thumbs.db

# Archived legacy Quartz scaffold (Plan 1, Task 0.1)
/archive/
```

- [ ] **Step 2: Add .gitattributes for line endings**

Create `D:/Education/.gitattributes`:

```
* text=auto eol=lf
*.md text eol=lf
*.ts text eol=lf
*.tsx text eol=lf
*.png binary
```

This stops the `LF will be replaced by CRLF` warnings on Windows.

- [ ] **Step 3: Commit**

```bash
git -C D:/Education add .gitignore .gitattributes
git -C D:/Education commit -m "chore: gitignore for Next.js stack + LF line endings"
```

---

### Task 0.3: Initialize Next.js 15 with TypeScript + Tailwind v4

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `next-env.d.ts`

**Approach:** Don't use `create-next-app` — it would fight the existing repo. Hand-write the minimal Next 15 + Tailwind 4 setup so it's transparent.

- [ ] **Step 1: Create package.json**

Create `D:/Education/package.json`:

```json
{
  "name": "vibeforge-site",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "npm run build:indexes && next build",
    "start": "next start",
    "build:indexes": "tsx scripts/build-indexes.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "lint": "next lint",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "next": "15.1.0",
    "react": "19.0.0",
    "react-dom": "19.0.0",
    "gray-matter": "4.0.3",
    "unified": "11.0.5",
    "remark-parse": "11.0.0",
    "remark-gfm": "4.0.0",
    "remark-rehype": "11.1.1",
    "rehype-stringify": "10.0.1",
    "rehype-slug": "6.0.0",
    "rehype-autolink-headings": "7.1.0",
    "unist-util-visit": "5.0.0",
    "minisearch": "7.1.0"
  },
  "devDependencies": {
    "typescript": "5.7.2",
    "@types/node": "22.10.0",
    "@types/react": "19.0.0",
    "@types/react-dom": "19.0.0",
    "tailwindcss": "4.0.0",
    "@tailwindcss/postcss": "4.0.0",
    "postcss": "8.4.49",
    "tsx": "4.19.2",
    "vitest": "2.1.8",
    "@vitest/ui": "2.1.8",
    "@testing-library/react": "16.1.0",
    "@testing-library/jest-dom": "6.6.3",
    "jsdom": "25.0.1",
    "@playwright/test": "1.49.1",
    "eslint": "9.17.0",
    "eslint-config-next": "15.1.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json (strict)**

Create `D:/Education/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules", "archive", "tests/e2e"]
}
```

- [ ] **Step 3: Create next.config.ts**

Create `D:/Education/next.config.ts`:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
```

- [ ] **Step 4: Create Tailwind v4 setup**

Create `D:/Education/postcss.config.mjs`:

```javascript
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

Create `D:/Education/app/globals.css`:

```css
@import "tailwindcss";

/* Plan 1: bare functional only. Visual polish in Plan 2 (frontend-design skill). */
```

- [ ] **Step 5: Create root layout + placeholder home**

Create `D:/Education/app/layout.tsx`:

```typescript
import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
```

Create `D:/Education/app/page.tsx`:

```typescript
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">VibeForge</h1>
      <p className="mt-2">바이브코더를 위한 CS 학습·토론 사이트 (Plan 1: bootstrap)</p>
      <ul className="mt-4 list-disc pl-6">
        <li><Link href="/wiki" className="underline">Wiki</Link></li>
      </ul>
    </main>
  );
}
```

- [ ] **Step 6: Install and verify**

```bash
cd D:/Education
npm install
npm run dev
```

Expected: dev server starts on `http://localhost:3000`. Open in browser, see "VibeForge" heading + Wiki link. (Wiki link 404s — that's expected, we'll add `/wiki` in Phase 1.)
Stop server (Ctrl+C).

- [ ] **Step 7: Commit**

```bash
git -C D:/Education add package.json package-lock.json tsconfig.json next.config.ts postcss.config.mjs app/
git -C D:/Education commit -m "feat: scaffold Next.js 15 + Tailwind v4 + TS strict"
```

---

### Task 0.4: Configure Vitest + Testing Library

**Files:**
- Create: `vitest.config.ts`, `vitest.setup.ts`, `lib/wiki/__sanity__.test.ts` (deleted at end)

- [ ] **Step 1: Create vitest.config.ts**

Create `D:/Education/vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    exclude: ["node_modules", ".next", "archive", "tests/e2e"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
```

Create `D:/Education/vitest.setup.ts`:

```typescript
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 2: Write a sanity test**

Create `D:/Education/lib/wiki/__sanity__.test.ts`:

```typescript
import { describe, it, expect } from "vitest";

describe("vitest sanity", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 3: Run and verify pass**

Run: `cd D:/Education && npm test`
Expected: `1 passed`.

- [ ] **Step 4: Delete sanity test**

```bash
rm D:/Education/lib/wiki/__sanity__.test.ts
```

- [ ] **Step 5: Commit**

```bash
git -C D:/Education add vitest.config.ts vitest.setup.ts package.json
git -C D:/Education commit -m "feat: configure Vitest + Testing Library"
```

---

### Task 0.5: Create vibeforge-wiki repo with seed content

**Files (new repo at `D:/vibeforge-wiki/`):**
- Create: `data/data-handling/what-is-an-index.md`
- Create: `data/how-computers-work/what-is-a-process.md`
- Create: `data/code-flow/what-is-an-array.md`
- Create: `README.md`, `CONTRIBUTING.md`, `style-guide.md`
- Create: `.gitattributes`, `.github/PULL_REQUEST_TEMPLATE.md`

- [ ] **Step 1: Initialize the repo**

```bash
mkdir -p D:/vibeforge-wiki/data/data-handling
mkdir -p D:/vibeforge-wiki/data/how-computers-work
mkdir -p D:/vibeforge-wiki/data/code-flow
mkdir -p D:/vibeforge-wiki/.github
cd D:/vibeforge-wiki
git init -b main
```

- [ ] **Step 2: Write .gitattributes**

Create `D:/vibeforge-wiki/.gitattributes`:

```
* text=auto eol=lf
*.md text eol=lf
```

- [ ] **Step 3: Write seed page 1 — `what-is-an-index.md`**

Create `D:/vibeforge-wiki/data/data-handling/what-is-an-index.md`:

```markdown
---
title: 인덱스가 뭐예요?
tags: [DB, 성능]
aliases: [DB 인덱스, index]
updated: 2026-04-30
---

AI가 짜준 SQL이 너무 느릴 때, 처음 의심해야 할 게 **인덱스**예요.

## 책 뒤의 색인이랑 똑같은 거예요

소설책 마지막에 보면 "ㄱ … 23p, 47p" 이런 색인 있죠. 그게 인덱스예요. DB가 데이터를 처음부터 끝까지 다 훑지 않고, 색인을 보고 바로 그 페이지로 점프하게 해주는 장치.

## 언제 쓰면 좋아요?

- `WHERE`, `JOIN`, `ORDER BY`에 자주 등장하는 컬럼
- 데이터가 많은 테이블 (수십만 row+)
- 읽기가 쓰기보다 압도적으로 많을 때

관련: [[what-is-a-process]]는 OS 쪽 개념인데, DB도 결국 프로세스 안에서 돌아가요.
```

- [ ] **Step 4: Write seed page 2 — `what-is-a-process.md`**

Create `D:/vibeforge-wiki/data/how-computers-work/what-is-a-process.md`:

```markdown
---
title: 프로세스가 뭐예요?
tags: [OS, 기초]
aliases: [process]
updated: 2026-04-30
---

`node server.js` 이라고 치면, OS가 *프로세스*를 하나 만들어줘요.

## 프로세스 = 실행 중인 프로그램

코드(파일) 자체는 프로그램. 그 코드가 메모리에 올라가서 CPU가 한 줄씩 실행하기 시작하면 — 그게 프로세스예요.

각 프로세스는 자기만의:
- 메모리 공간
- 파일 핸들
- 환경 변수

를 가져요. 다른 프로세스랑 직접 변수 공유 못 해요. 그래서 [[what-is-an-index]] 같은 DB 쿼리는 다른 프로세스(DB 서버)에 부탁해서 결과만 받는 구조.

## 자주 만나는 곳

- 터미널에서 명령 한 번 = 프로세스 한 개
- `Ctrl+C` = 그 프로세스 죽이기
- 웹 서버 = 보통 프로세스 한 개 (혹은 몇 개)
```

- [ ] **Step 5: Write seed page 3 — `what-is-an-array.md`**

Create `D:/vibeforge-wiki/data/code-flow/what-is-an-array.md`:

```markdown
---
title: 배열이 뭐예요?
tags: [자료구조, 기초]
aliases: [array, list]
updated: 2026-04-30
---

배열은 **메모리에 한 줄로 붙여놓은 값들의 나열**이에요.

## 한 줄로 붙어 있다는 게 핵심

`[1, 2, 3, 4, 5]`처럼 보이지만, 실제로는 메모리 위에 다섯 칸이 *연속으로* 잡혀 있어요. 그래서:

- `arr[3]`은 *즉시* 가능 (시작 주소 + 3 × 칸 크기)
- 가운데 끼워넣기는 *비싸요* (뒤를 다 밀어야 함)

## 다른 자료구조와의 관계

- 리스트가 *늘어나는* 자료구조면, 배열은 *고정 크기*가 본래 모습 (JS/Python의 `[]`는 사실 동적 배열)
- 키-값 매핑 필요하면 [[what-is-an-index]]에서 본 *해시맵*이 적격

배열을 다루다 보면 [[what-is-a-process]] 메모리 한도에 부딪히기도 해요 — 너무 큰 배열은 OS가 안 줘요.
```

- [ ] **Step 6: Write README, CONTRIBUTING, style-guide**

Create `D:/vibeforge-wiki/README.md`:

```markdown
# vibeforge-wiki

[VibeForge](../vibeforge-site)의 콘텐츠 저장소. 바이브코더를 위한 CS 위키.

이 repo의 markdown이 [vibeforge-site의 빌드 파이프라인](../vibeforge-site/scripts/build-indexes.ts)에 의해 정적 사이트로 변환됩니다.

## 기여하고 싶다면

[CONTRIBUTING.md](./CONTRIBUTING.md) 참조.
```

Create `D:/vibeforge-wiki/CONTRIBUTING.md`:

```markdown
# 기여 규칙

## 톤

전공자 노트 톤 ❌ → 바이브코더 톤 ✅. [style-guide.md](./style-guide.md) 참조.

## Frontmatter

모든 페이지는 다음 frontmatter로 시작합니다:

\`\`\`yaml
---
title: 페이지 제목 (한국어)
tags: [태그1, 태그2]
aliases: [별칭1]      # [[wiki-link]] 매칭에 사용 (옵션)
video: https://...     # YouTube URL (옵션)
updated: 2026-04-30
---
\`\`\`

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
```

Create `D:/vibeforge-wiki/style-guide.md`:

```markdown
# Style Guide — 바이브코더 톤

## 원칙

1. **친근한 진입, 진지한 알맹이.** 첫 문단은 "AI가 짜준 코드 봤는데..." 같은 실전 상황. 본문엔 정확한 CS 개념.
2. **약어 풀어쓰기.** "OS" 처음 등장 때 "운영체제(OS)"로.
3. **수학 기호 자제.** 시간 복잡도는 "거의 즉시" / "데이터 양에 비례" 같은 한국어 우선, 그 뒤 괄호로 `O(1)`, `O(n)`.

## 페이지 길이

- 한 페이지 = 한 개념. 200~600 단어 권장.
- 더 길어지면 `[[wiki-link]]`로 쪼개기.

## ❌ 피하기

- "위와 같이"
- "이는 다음과 같이 정의된다"
- "본 시스템은"

## ✅ 좋은 예

- "(예제 코드) 이 코드 한 줄에서 X가 일어나요."
- "AI가 자주 까먹는 부분이라, 한 번 짚고 갈게요."
- "잘 모르겠으면 [[다른 페이지]] 먼저 보고 와요."
```

Create `D:/vibeforge-wiki/.github/PULL_REQUEST_TEMPLATE.md`:

```markdown
## 이 PR이 추가/수정하는 페이지

- [ ] 새 페이지: `data/<카테고리>/<slug>.md`
- [ ] 기존 페이지 수정

## 체크리스트

- [ ] frontmatter 5개 필드 (`title`, `tags`, `aliases`, `video?`, `updated`) 채웠어요
- [ ] [style-guide.md](../style-guide.md) 톤 따랐어요
- [ ] 다른 페이지 인용 시 `[[wiki-link]]` 사용했어요
- [ ] 로컬에서 vibeforge-site `npm run dev`로 깨진 링크 없는지 확인했어요 (선택)
```

- [ ] **Step 7: Commit and prepare for GitHub push (Task 0.6)**

```bash
cd D:/vibeforge-wiki
git add -A
git commit -m "feat: initial seed pages and contribution rules"
git log --oneline
```

Expected: 1 commit.

---

### Task 0.6: Push vibeforge-wiki to GitHub

**Note:** This step requires the user's GitHub auth (gh CLI or push via SSH/HTTPS). If `gh` is not installed, skip Step 1 and create the repo manually on github.com, then push.

- [ ] **Step 1: Create GitHub repo**

```bash
cd D:/vibeforge-wiki
gh repo create vibeforge-wiki --public --source=. --remote=origin --description="Content vault for VibeForge"
```

If `gh` not installed, manually create `https://github.com/<user>/vibeforge-wiki` (public), then:

```bash
cd D:/vibeforge-wiki
git remote add origin https://github.com/<user>/vibeforge-wiki.git
```

- [ ] **Step 2: Push**

```bash
git push -u origin main
```

- [ ] **Step 3: Capture remote URL — needed for Task 0.7**

Run: `git -C D:/vibeforge-wiki remote get-url origin`
Note the URL (e.g., `https://github.com/<user>/vibeforge-wiki.git`). Use in next task.

---

### Task 0.7: Add wiki as `content/` submodule in vibeforge-site

**Files:**
- Create: `.gitmodules` (auto by git)
- Create: `content/` (submodule)

- [ ] **Step 1: Add submodule**

```bash
cd D:/Education
git submodule add https://github.com/<user>/vibeforge-wiki.git content
```

(Replace `<user>` with the actual GitHub user from Task 0.6 Step 3.)

- [ ] **Step 2: Verify**

Run: `ls D:/Education/content/`
Expected: `data/`, `README.md`, `CONTRIBUTING.md`, `style-guide.md`, etc.

Run: `cat D:/Education/.gitmodules`
Expected:
```
[submodule "content"]
	path = content
	url = https://github.com/<user>/vibeforge-wiki.git
```

- [ ] **Step 3: Commit**

```bash
git -C D:/Education add .gitmodules content
git -C D:/Education commit -m "feat: add vibeforge-wiki as content/ submodule"
```

---

## Phase 1 — Wiki Engine (20 tasks)

### Task 1.1: lib/wiki/types.ts + slug.ts

**Files:**
- Create: `lib/wiki/types.ts`
- Create: `lib/wiki/slug.ts`
- Create: `lib/wiki/slug.test.ts`

**Why first:** Slug normalization is used everywhere. We turn `data/data-handling/what-is-an-index.md` into `data-handling/what-is-an-index`.

- [ ] **Step 1: Create shared types**

Create `D:/Education/lib/wiki/types.ts`:

```typescript
export interface PageFrontmatter {
  title: string;
  tags: string[];
  aliases: string[];
  video: string | null;
  updated: string; // ISO date
}

export interface Page {
  slug: string;             // e.g. "data-handling/what-is-an-index"
  filePath: string;         // e.g. "data/data-handling/what-is-an-index.md"
  frontmatter: PageFrontmatter;
  body: string;             // raw markdown body (no frontmatter)
  bodyHtml?: string;        // populated by render.ts
}

export interface BacklinkMap {
  // slug → list of slugs that link TO it
  [slug: string]: string[];
}

export interface TagMap {
  // tag → list of slugs
  [tag: string]: string[];
}
```

- [ ] **Step 2: Write the failing test for slug normalization**

Create `D:/Education/lib/wiki/slug.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { fileToSlug, slugToFilePath } from "./slug";

describe("fileToSlug", () => {
  it("strips data/ prefix and .md suffix", () => {
    expect(fileToSlug("data/data-handling/what-is-an-index.md"))
      .toBe("data-handling/what-is-an-index");
  });

  it("normalizes Windows-style backslashes to forward slashes", () => {
    expect(fileToSlug("data\\code-flow\\what-is-an-array.md"))
      .toBe("code-flow/what-is-an-array");
  });

  it("throws on a path that doesn't start with data/", () => {
    expect(() => fileToSlug("foo/bar.md")).toThrow();
  });
});

describe("slugToFilePath", () => {
  it("is the inverse of fileToSlug", () => {
    expect(slugToFilePath("data-handling/what-is-an-index"))
      .toBe("data/data-handling/what-is-an-index.md");
  });
});
```

- [ ] **Step 3: Run, expect fail**

Run: `cd D:/Education && npm test -- slug`
Expected: tests fail (`fileToSlug is not defined`).

- [ ] **Step 4: Implement slug.ts**

Create `D:/Education/lib/wiki/slug.ts`:

```typescript
const DATA_PREFIX = "data/";
const MD_SUFFIX = ".md";

export function fileToSlug(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/");
  if (!normalized.startsWith(DATA_PREFIX)) {
    throw new Error(`Path must start with "data/": got ${filePath}`);
  }
  const withoutPrefix = normalized.slice(DATA_PREFIX.length);
  if (!withoutPrefix.endsWith(MD_SUFFIX)) {
    throw new Error(`Path must end with ".md": got ${filePath}`);
  }
  return withoutPrefix.slice(0, -MD_SUFFIX.length);
}

export function slugToFilePath(slug: string): string {
  return `${DATA_PREFIX}${slug}${MD_SUFFIX}`;
}
```

- [ ] **Step 5: Run, expect pass**

Run: `npm test -- slug`
Expected: 4 tests pass.

- [ ] **Step 6: Commit**

```bash
git -C D:/Education add lib/wiki/types.ts lib/wiki/slug.ts lib/wiki/slug.test.ts
git -C D:/Education commit -m "feat(wiki): slug normalization + shared types"
```

---

### Task 1.2: lib/wiki/frontmatter.ts (parse + validate)

**Files:**
- Create: `lib/wiki/frontmatter.ts`
- Create: `lib/wiki/frontmatter.test.ts`

- [ ] **Step 1: Write failing tests**

Create `D:/Education/lib/wiki/frontmatter.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { parseFrontmatter } from "./frontmatter";

const fullDoc = `---
title: 인덱스가 뭐예요?
tags: [DB, 성능]
aliases: [DB 인덱스]
updated: 2026-04-30
---

본문 시작.
`;

describe("parseFrontmatter", () => {
  it("extracts a fully-populated frontmatter and body", () => {
    const { frontmatter, body } = parseFrontmatter(fullDoc);
    expect(frontmatter.title).toBe("인덱스가 뭐예요?");
    expect(frontmatter.tags).toEqual(["DB", "성능"]);
    expect(frontmatter.aliases).toEqual(["DB 인덱스"]);
    expect(frontmatter.video).toBeNull();
    expect(frontmatter.updated).toBe("2026-04-30");
    expect(body.trim()).toBe("본문 시작.");
  });

  it("defaults missing optional fields", () => {
    const doc = `---\ntitle: t\nupdated: 2026-04-30\n---\n\nx`;
    const { frontmatter } = parseFrontmatter(doc);
    expect(frontmatter.tags).toEqual([]);
    expect(frontmatter.aliases).toEqual([]);
    expect(frontmatter.video).toBeNull();
  });

  it("throws when title is missing", () => {
    const doc = `---\nupdated: 2026-04-30\n---\n\nx`;
    expect(() => parseFrontmatter(doc)).toThrow(/title/);
  });

  it("throws when updated is missing", () => {
    const doc = `---\ntitle: t\n---\n\nx`;
    expect(() => parseFrontmatter(doc)).toThrow(/updated/);
  });
});
```

- [ ] **Step 2: Run, expect fail**

Run: `npm test -- frontmatter`
Expected: fail (module not found).

- [ ] **Step 3: Implement**

Create `D:/Education/lib/wiki/frontmatter.ts`:

```typescript
import matter from "gray-matter";
import type { PageFrontmatter } from "./types";

interface ParseResult {
  frontmatter: PageFrontmatter;
  body: string;
}

export function parseFrontmatter(raw: string): ParseResult {
  const { data, content } = matter(raw);

  if (typeof data.title !== "string" || data.title.length === 0) {
    throw new Error("frontmatter: 'title' is required and must be a non-empty string");
  }
  if (typeof data.updated !== "string") {
    throw new Error("frontmatter: 'updated' is required (ISO date string)");
  }

  const tags = Array.isArray(data.tags) ? data.tags.map(String) : [];
  const aliases = Array.isArray(data.aliases) ? data.aliases.map(String) : [];
  const video = typeof data.video === "string" ? data.video : null;

  return {
    frontmatter: {
      title: data.title,
      tags,
      aliases,
      video,
      updated: data.updated,
    },
    body: content,
  };
}
```

- [ ] **Step 4: Run, expect pass**

Run: `npm test -- frontmatter`
Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git -C D:/Education add lib/wiki/frontmatter.ts lib/wiki/frontmatter.test.ts
git -C D:/Education commit -m "feat(wiki): frontmatter parser with schema validation"
```

---

### Task 1.3: lib/wiki/wiki-link.ts — `[[wiki-link]]` remark plugin

**Files:**
- Create: `lib/wiki/wiki-link.ts`
- Create: `lib/wiki/wiki-link.test.ts`

**What this does:** A remark plugin that scans markdown text nodes, finds `[[Target]]` patterns, and rewrites them as `link` nodes with a special data attribute. Resolution to actual page URLs happens later (in render.ts) using a name → slug map.

- [ ] **Step 1: Write failing tests**

Create `D:/Education/lib/wiki/wiki-link.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import { remarkWikiLink } from "./wiki-link";

function process(md: string): string {
  return unified()
    .use(remarkParse)
    .use(remarkWikiLink)
    .use(remarkRehype)
    .use(rehypeStringify)
    .processSync(md)
    .toString();
}

describe("remarkWikiLink", () => {
  it("rewrites [[Target]] into a placeholder anchor with data attribute", () => {
    const html = process("see [[hello-world]] for details");
    expect(html).toContain('data-wiki-target="hello-world"');
    expect(html).toContain(">hello-world<");
  });

  it("supports [[Target|Display Text]] form", () => {
    const html = process("see [[hello-world|the intro]]");
    expect(html).toContain('data-wiki-target="hello-world"');
    expect(html).toContain(">the intro<");
  });

  it("ignores triple-bracketed text", () => {
    const html = process("[[[not a wiki link]]]");
    expect(html).not.toContain("data-wiki-target");
  });

  it("handles multiple links on one line", () => {
    const html = process("[[a]] and [[b]]");
    expect(html).toContain('data-wiki-target="a"');
    expect(html).toContain('data-wiki-target="b"');
  });
});
```

- [ ] **Step 2: Run, expect fail**

Run: `npm test -- wiki-link`
Expected: fail.

- [ ] **Step 3: Implement remarkWikiLink**

Create `D:/Education/lib/wiki/wiki-link.ts`:

```typescript
import { visit } from "unist-util-visit";
import type { Plugin } from "unified";
import type { Root, Text, Link } from "mdast";

const WIKI_LINK_RE = /(?<!\[)\[\[([^\[\]|]+?)(?:\|([^\[\]]+?))?\]\](?!\])/g;

export const remarkWikiLink: Plugin<[], Root> = () => {
  return (tree) => {
    visit(tree, "text", (node: Text, index, parent) => {
      if (!parent || index === undefined) return;

      const value = node.value;
      const matches = Array.from(value.matchAll(WIKI_LINK_RE));
      if (matches.length === 0) return;

      const newChildren: (Text | Link)[] = [];
      let cursor = 0;

      for (const match of matches) {
        const matchStart = match.index ?? 0;
        const [full, target, display] = match;
        const matchEnd = matchStart + full.length;

        if (matchStart > cursor) {
          newChildren.push({
            type: "text",
            value: value.slice(cursor, matchStart),
          });
        }

        const linkText = (display ?? target).trim();
        const targetClean = target.trim();

        const link: Link = {
          type: "link",
          url: `#wiki-pending:${targetClean}`,
          title: null,
          children: [{ type: "text", value: linkText }],
          data: {
            hProperties: {
              "data-wiki-target": targetClean,
            },
          },
        };
        newChildren.push(link);
        cursor = matchEnd;
      }

      if (cursor < value.length) {
        newChildren.push({
          type: "text",
          value: value.slice(cursor),
        });
      }

      parent.children.splice(index, 1, ...newChildren);
      return [visit.SKIP, index + newChildren.length];
    });
  };
};
```

- [ ] **Step 4: Run, expect pass**

Run: `npm test -- wiki-link`
Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git -C D:/Education add lib/wiki/wiki-link.ts lib/wiki/wiki-link.test.ts
git -C D:/Education commit -m "feat(wiki): remark plugin for [[wiki-link]] syntax"
```

---

### Task 1.4: lib/wiki/load.ts — recursively load vault

**Files:**
- Create: `lib/wiki/load.ts`
- Create: `lib/wiki/load.test.ts`
- Create: `lib/wiki/__fixtures__/sample-vault/data/cat-a/page-1.md` (test fixture)
- Create: `lib/wiki/__fixtures__/sample-vault/data/cat-a/page-2.md`
- Create: `lib/wiki/__fixtures__/sample-vault/data/cat-b/page-3.md`

- [ ] **Step 1: Create test fixtures**

```bash
mkdir -p D:/Education/lib/wiki/__fixtures__/sample-vault/data/cat-a
mkdir -p D:/Education/lib/wiki/__fixtures__/sample-vault/data/cat-b
```

Create `D:/Education/lib/wiki/__fixtures__/sample-vault/data/cat-a/page-1.md`:

```markdown
---
title: Page One
tags: [t1]
updated: 2026-04-30
---

Body of page one. Links to [[page-2]].
```

Create `D:/Education/lib/wiki/__fixtures__/sample-vault/data/cat-a/page-2.md`:

```markdown
---
title: Page Two
tags: [t2, t1]
aliases: [Two]
updated: 2026-04-30
---

Body of page two.
```

Create `D:/Education/lib/wiki/__fixtures__/sample-vault/data/cat-b/page-3.md`:

```markdown
---
title: Page Three
tags: []
updated: 2026-04-30
---

Page three references [[Two]] (an alias).
```

- [ ] **Step 2: Write failing test**

Create `D:/Education/lib/wiki/load.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import path from "node:path";
import { loadVault } from "./load";

const FIXTURE = path.resolve(__dirname, "__fixtures__/sample-vault");

describe("loadVault", () => {
  it("loads all .md files under data/ recursively", async () => {
    const pages = await loadVault(FIXTURE);
    expect(pages).toHaveLength(3);
    const slugs = pages.map((p) => p.slug).sort();
    expect(slugs).toEqual(["cat-a/page-1", "cat-a/page-2", "cat-b/page-3"]);
  });

  it("populates frontmatter and body on each page", async () => {
    const pages = await loadVault(FIXTURE);
    const p1 = pages.find((p) => p.slug === "cat-a/page-1")!;
    expect(p1.frontmatter.title).toBe("Page One");
    expect(p1.frontmatter.tags).toEqual(["t1"]);
    expect(p1.body).toContain("[[page-2]]");
  });

  it("returns deterministic order (sorted by slug)", async () => {
    const pages = await loadVault(FIXTURE);
    const slugs = pages.map((p) => p.slug);
    expect(slugs).toEqual([...slugs].sort());
  });
});
```

- [ ] **Step 3: Run, expect fail**

Run: `npm test -- load`
Expected: fail.

- [ ] **Step 4: Implement loadVault**

Create `D:/Education/lib/wiki/load.ts`:

```typescript
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileToSlug } from "./slug";
import { parseFrontmatter } from "./frontmatter";
import type { Page } from "./types";

async function walk(dir: string, base: string): Promise<string[]> {
  const entries = await readdir(dir);
  const out: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry);
    const s = await stat(full);
    if (s.isDirectory()) {
      out.push(...(await walk(full, base)));
    } else if (s.isFile() && entry.endsWith(".md")) {
      const rel = path.relative(base, full).replace(/\\/g, "/");
      out.push(rel);
    }
  }
  return out;
}

export async function loadVault(rootDir: string): Promise<Page[]> {
  const dataDir = path.join(rootDir, "data");
  const relPaths = await walk(dataDir, rootDir);

  const pages: Page[] = [];
  for (const relPath of relPaths) {
    const fullPath = path.join(rootDir, relPath);
    const raw = await readFile(fullPath, "utf-8");
    const { frontmatter, body } = parseFrontmatter(raw);
    pages.push({
      slug: fileToSlug(relPath),
      filePath: relPath,
      frontmatter,
      body,
    });
  }

  pages.sort((a, b) => a.slug.localeCompare(b.slug));
  return pages;
}
```

- [ ] **Step 5: Run, expect pass**

Run: `npm test -- load`
Expected: 3 tests pass.

- [ ] **Step 6: Commit**

```bash
git -C D:/Education add lib/wiki/load.ts lib/wiki/load.test.ts lib/wiki/__fixtures__
git -C D:/Education commit -m "feat(wiki): recursive vault loader"
```

---

### Task 1.5: lib/wiki/backlinks.ts — build backlink map

**Files:**
- Create: `lib/wiki/backlinks.ts`
- Create: `lib/wiki/backlinks.test.ts`

**Approach:** Walk each page's body for `[[target]]` patterns. Resolve target via slug or alias to a known page slug. Record reverse edge.

- [ ] **Step 1: Write failing test**

Create `D:/Education/lib/wiki/backlinks.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { buildBacklinks, buildAliasMap } from "./backlinks";
import type { Page } from "./types";

const pages: Page[] = [
  {
    slug: "a",
    filePath: "data/a.md",
    frontmatter: { title: "Apple", tags: [], aliases: [], video: null, updated: "2026-04-30" },
    body: "links to [[b]] and [[Cat]] (alias for c)",
  },
  {
    slug: "b",
    filePath: "data/b.md",
    frontmatter: { title: "Banana", tags: [], aliases: [], video: null, updated: "2026-04-30" },
    body: "loops back to [[a]]",
  },
  {
    slug: "c",
    filePath: "data/c.md",
    frontmatter: { title: "Coconut", tags: [], aliases: ["Cat"], video: null, updated: "2026-04-30" },
    body: "no links",
  },
];

describe("buildAliasMap", () => {
  it("maps title and aliases (lowercased) to slugs", () => {
    const m = buildAliasMap(pages);
    expect(m.get("apple")).toBe("a");
    expect(m.get("banana")).toBe("b");
    expect(m.get("coconut")).toBe("c");
    expect(m.get("cat")).toBe("c");
    // raw slug is also resolvable
    expect(m.get("a")).toBe("a");
    expect(m.get("c")).toBe("c");
  });
});

describe("buildBacklinks", () => {
  it("collects reverse edges using slug + alias resolution", () => {
    const { backlinks, broken } = buildBacklinks(pages);
    expect(backlinks["a"]).toEqual(["b"]);
    expect(backlinks["b"]).toEqual(["a"]);
    expect(backlinks["c"]).toEqual(["a"]);
    expect(broken).toEqual([]);
  });

  it("reports broken links", () => {
    const withBroken: Page[] = [
      ...pages,
      {
        slug: "d",
        filePath: "data/d.md",
        frontmatter: { title: "D", tags: [], aliases: [], video: null, updated: "2026-04-30" },
        body: "points to [[nowhere]]",
      },
    ];
    const { broken } = buildBacklinks(withBroken);
    expect(broken).toContainEqual({ from: "d", target: "nowhere" });
  });
});
```

- [ ] **Step 2: Run, expect fail**

Run: `npm test -- backlinks`
Expected: fail.

- [ ] **Step 3: Implement**

Create `D:/Education/lib/wiki/backlinks.ts`:

```typescript
import type { Page, BacklinkMap } from "./types";

const WIKI_LINK_RE = /(?<!\[)\[\[([^\[\]|]+?)(?:\|[^\[\]]+?)?\]\](?!\])/g;

export function buildAliasMap(pages: Page[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const p of pages) {
    m.set(p.slug.toLowerCase(), p.slug);
    m.set(p.frontmatter.title.toLowerCase(), p.slug);
    for (const alias of p.frontmatter.aliases) {
      m.set(alias.toLowerCase(), p.slug);
    }
    // also accept the leaf of the slug (e.g., "page-2" of "cat-a/page-2")
    const leaf = p.slug.split("/").pop();
    if (leaf) m.set(leaf.toLowerCase(), p.slug);
  }
  return m;
}

export interface BacklinkBuildResult {
  backlinks: BacklinkMap;
  broken: { from: string; target: string }[];
}

export function buildBacklinks(pages: Page[]): BacklinkBuildResult {
  const aliasMap = buildAliasMap(pages);
  const backlinks: BacklinkMap = {};
  const broken: { from: string; target: string }[] = [];

  for (const p of pages) {
    const seen = new Set<string>(); // dedupe per source page
    for (const match of p.body.matchAll(WIKI_LINK_RE)) {
      const target = match[1].trim();
      const resolved = aliasMap.get(target.toLowerCase());
      if (!resolved) {
        broken.push({ from: p.slug, target });
        continue;
      }
      const key = `${p.slug}->${resolved}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (!backlinks[resolved]) backlinks[resolved] = [];
      backlinks[resolved].push(p.slug);
    }
  }

  // sort backlinks deterministically
  for (const k of Object.keys(backlinks)) {
    backlinks[k].sort();
  }

  return { backlinks, broken };
}
```

- [ ] **Step 4: Run, expect pass**

Run: `npm test -- backlinks`
Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git -C D:/Education add lib/wiki/backlinks.ts lib/wiki/backlinks.test.ts
git -C D:/Education commit -m "feat(wiki): backlink builder with alias resolution"
```

---

### Task 1.6: lib/wiki/tags.ts — tag index

**Files:**
- Create: `lib/wiki/tags.ts`
- Create: `lib/wiki/tags.test.ts`

- [ ] **Step 1: Write failing test**

Create `D:/Education/lib/wiki/tags.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { buildTagMap } from "./tags";
import type { Page } from "./types";

const mk = (slug: string, tags: string[]): Page => ({
  slug,
  filePath: `data/${slug}.md`,
  frontmatter: { title: slug, tags, aliases: [], video: null, updated: "2026-04-30" },
  body: "",
});

describe("buildTagMap", () => {
  it("groups slugs by tag", () => {
    const pages = [mk("a", ["DB", "기초"]), mk("b", ["DB"]), mk("c", ["성능"])];
    const map = buildTagMap(pages);
    expect(map["DB"]).toEqual(["a", "b"]);
    expect(map["기초"]).toEqual(["a"]);
    expect(map["성능"]).toEqual(["c"]);
  });

  it("returns slugs sorted within each tag", () => {
    const pages = [mk("z", ["x"]), mk("a", ["x"]), mk("m", ["x"])];
    const map = buildTagMap(pages);
    expect(map["x"]).toEqual(["a", "m", "z"]);
  });

  it("handles pages with no tags", () => {
    const map = buildTagMap([mk("a", [])]);
    expect(Object.keys(map)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run, expect fail**

Run: `npm test -- tags`
Expected: fail.

- [ ] **Step 3: Implement**

Create `D:/Education/lib/wiki/tags.ts`:

```typescript
import type { Page, TagMap } from "./types";

export function buildTagMap(pages: Page[]): TagMap {
  const map: TagMap = {};
  for (const p of pages) {
    for (const tag of p.frontmatter.tags) {
      if (!map[tag]) map[tag] = [];
      map[tag].push(p.slug);
    }
  }
  for (const k of Object.keys(map)) {
    map[k].sort();
  }
  return map;
}
```

- [ ] **Step 4: Run, expect pass**

Run: `npm test -- tags`
Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git -C D:/Education add lib/wiki/tags.ts lib/wiki/tags.test.ts
git -C D:/Education commit -m "feat(wiki): tag index builder"
```

---

### Task 1.7: lib/wiki/search-index.ts — MiniSearch index

**Files:**
- Create: `lib/wiki/search-index.ts`
- Create: `lib/wiki/search-index.test.ts`

- [ ] **Step 1: Write failing test**

Create `D:/Education/lib/wiki/search-index.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { buildSearchIndex, searchPages } from "./search-index";
import type { Page } from "./types";

const pages: Page[] = [
  {
    slug: "a",
    filePath: "data/a.md",
    frontmatter: { title: "인덱스란 무엇인가", tags: ["DB"], aliases: [], video: null, updated: "2026-04-30" },
    body: "DB 인덱스는 책 색인과 같다",
  },
  {
    slug: "b",
    filePath: "data/b.md",
    frontmatter: { title: "프로세스 기초", tags: ["OS"], aliases: [], video: null, updated: "2026-04-30" },
    body: "프로세스는 실행 중인 프로그램이다",
  },
];

describe("buildSearchIndex + searchPages", () => {
  it("builds an index that finds pages by title term", () => {
    const idx = buildSearchIndex(pages);
    const hits = searchPages(idx, "인덱스");
    expect(hits.map((h) => h.slug)).toContain("a");
  });

  it("finds pages by body term", () => {
    const idx = buildSearchIndex(pages);
    const hits = searchPages(idx, "프로그램");
    expect(hits.map((h) => h.slug)).toContain("b");
  });

  it("returns empty for unmatched query", () => {
    const idx = buildSearchIndex(pages);
    const hits = searchPages(idx, "zzzznotfoundzzz");
    expect(hits).toEqual([]);
  });

  it("supports serialize/load round-trip via JSON", () => {
    const idx = buildSearchIndex(pages);
    const json = JSON.stringify(idx);
    const reloaded = (require("./search-index") as typeof import("./search-index")).loadSearchIndex(json);
    const hits = searchPages(reloaded, "인덱스");
    expect(hits.map((h) => h.slug)).toContain("a");
  });
});
```

- [ ] **Step 2: Run, expect fail**

Run: `npm test -- search-index`
Expected: fail.

- [ ] **Step 3: Implement**

Create `D:/Education/lib/wiki/search-index.ts`:

```typescript
import MiniSearch from "minisearch";
import type { Page } from "./types";

export type SearchIndex = MiniSearch<{
  id: string;
  slug: string;
  title: string;
  body: string;
  tags: string;
}>;

export interface SearchHit {
  slug: string;
  title: string;
  score: number;
}

const FIELDS = ["title", "body", "tags"];
const STORE_FIELDS = ["slug", "title"];

function makeEmptyIndex(): SearchIndex {
  return new MiniSearch({
    fields: FIELDS,
    storeFields: STORE_FIELDS,
    searchOptions: {
      boost: { title: 3, tags: 2 },
      prefix: true,
      fuzzy: 0.2,
    },
  });
}

export function buildSearchIndex(pages: Page[]): SearchIndex {
  const idx = makeEmptyIndex();
  idx.addAll(
    pages.map((p) => ({
      id: p.slug,
      slug: p.slug,
      title: p.frontmatter.title,
      body: p.body,
      tags: p.frontmatter.tags.join(" "),
    }))
  );
  return idx;
}

export function loadSearchIndex(json: string): SearchIndex {
  return MiniSearch.loadJSON<{
    id: string;
    slug: string;
    title: string;
    body: string;
    tags: string;
  }>(json, {
    fields: FIELDS,
    storeFields: STORE_FIELDS,
    searchOptions: {
      boost: { title: 3, tags: 2 },
      prefix: true,
      fuzzy: 0.2,
    },
  });
}

export function searchPages(idx: SearchIndex, query: string): SearchHit[] {
  if (!query.trim()) return [];
  const results = idx.search(query);
  return results.map((r) => ({
    slug: r.slug as string,
    title: r.title as string,
    score: r.score,
  }));
}
```

- [ ] **Step 4: Run, expect pass**

Run: `npm test -- search-index`
Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git -C D:/Education add lib/wiki/search-index.ts lib/wiki/search-index.test.ts
git -C D:/Education commit -m "feat(wiki): MiniSearch full-text index with serialization"
```

---

### Task 1.8: lib/wiki/render.ts — markdown → HTML pipeline

**Files:**
- Create: `lib/wiki/render.ts`
- Create: `lib/wiki/render.test.ts`

**What this does:** Takes a Page + alias map, produces sanitized HTML where `[[wiki-link]]`s have been resolved to real `/wiki/<slug>` URLs, with broken ones flagged.

- [ ] **Step 1: Write failing test**

Create `D:/Education/lib/wiki/render.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { renderBody } from "./render";

describe("renderBody", () => {
  const aliasMap = new Map([
    ["target-page", "cat/target-page"],
    ["page two", "cat/target-page"],
  ]);

  it("renders basic markdown", async () => {
    const html = await renderBody("# Hello\n\nWorld", aliasMap);
    expect(html).toContain("<h1");
    expect(html).toContain("Hello");
    expect(html).toContain("<p>World</p>");
  });

  it("resolves [[wiki-link]] to real /wiki/<slug> URL", async () => {
    const html = await renderBody("see [[target-page]]", aliasMap);
    expect(html).toContain('href="/wiki/cat/target-page"');
  });

  it("flags broken [[wiki-link]] with data-broken", async () => {
    const html = await renderBody("see [[nope]]", aliasMap);
    expect(html).toContain("data-broken=\"true\"");
    expect(html).toContain(">nope<");
  });

  it("supports GFM tables", async () => {
    const html = await renderBody("| a | b |\n|---|---|\n| 1 | 2 |", aliasMap);
    expect(html).toContain("<table>");
  });

  it("adds slugs and autolinks to headings", async () => {
    const html = await renderBody("## Section Title", aliasMap);
    expect(html).toContain('id="section-title"');
  });
});
```

- [ ] **Step 2: Run, expect fail**

Run: `npm test -- render`
Expected: fail.

- [ ] **Step 3: Implement render.ts**

Create `D:/Education/lib/wiki/render.ts`:

```typescript
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import { visit } from "unist-util-visit";
import type { Plugin } from "unified";
import type { Root as HastRoot, Element } from "hast";
import { remarkWikiLink } from "./wiki-link";

interface ResolveOptions {
  aliasMap: Map<string, string>;
}

const rehypeResolveWikiLinks: Plugin<[ResolveOptions], HastRoot> = (options) => {
  const { aliasMap } = options;
  return (tree) => {
    visit(tree, "element", (node: Element) => {
      if (node.tagName !== "a") return;
      const target = node.properties?.["dataWikiTarget"];
      if (typeof target !== "string") return;
      const resolved = aliasMap.get(target.toLowerCase());
      if (resolved) {
        node.properties.href = `/wiki/${resolved}`;
      } else {
        node.properties.href = "#broken";
        node.properties.dataBroken = "true";
      }
    });
  };
};

export async function renderBody(
  body: string,
  aliasMap: Map<string, string>
): Promise<string> {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkWikiLink)
    .use(remarkRehype)
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, { behavior: "wrap" })
    .use(rehypeResolveWikiLinks, { aliasMap })
    .use(rehypeStringify)
    .process(body);
  return String(file);
}
```

- [ ] **Step 4: Run, expect pass**

Run: `npm test -- render`
Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git -C D:/Education add lib/wiki/render.ts lib/wiki/render.test.ts
git -C D:/Education commit -m "feat(wiki): unified pipeline with GFM, headings, wiki-link resolution"
```

---

### Task 1.9: scripts/build-indexes.ts — build-time JSON dump

**Files:**
- Create: `scripts/build-indexes.ts`

**What this does:** Run during `npm run build` (and dev startup). Reads `content/`, builds backlink/tag/search indexes + a manifest of all page metadata, writes to `public/wiki-data/`.

- [ ] **Step 1: Implement script**

Create `D:/Education/scripts/build-indexes.ts`:

```typescript
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { loadVault } from "../lib/wiki/load";
import { buildBacklinks } from "../lib/wiki/backlinks";
import { buildTagMap } from "../lib/wiki/tags";
import { buildSearchIndex } from "../lib/wiki/search-index";

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

  const { backlinks, broken } = buildBacklinks(pages);
  if (broken.length > 0) {
    console.warn(`[build-indexes] ${broken.length} broken wiki-link(s):`);
    for (const b of broken) {
      console.warn(`  ${b.from} → [[${b.target}]]`);
    }
  }

  const tags = buildTagMap(pages);
  const searchIdx = buildSearchIndex(pages);

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

  console.log(`[build-indexes] wrote 4 JSON files to ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Verify it runs against the real submodule**

Run: `cd D:/Education && npm run build:indexes`
Expected output:
```
[build-indexes] reading vault from D:\Education\content
[build-indexes] loaded 3 pages
[build-indexes] wrote 4 JSON files to D:\Education\public\wiki-data
```

Run: `ls D:/Education/public/wiki-data/`
Expected: `manifest.json backlinks.json tags.json search.json`.

- [ ] **Step 3: Sanity-check the output**

Run: `cat D:/Education/public/wiki-data/manifest.json`
Expected: 3-entry array, each with `slug`, `title`, `tags`, `updated`.

Run: `cat D:/Education/public/wiki-data/backlinks.json`
Expected: object with edges from seed content (e.g., `"how-computers-work/what-is-a-process": ["data-handling/what-is-an-index", ...]`).

- [ ] **Step 4: Commit**

```bash
git -C D:/Education add scripts/build-indexes.ts
git -C D:/Education commit -m "feat(wiki): build-time index generator (manifest, backlinks, tags, search)"
```

(`public/wiki-data/` is gitignored; we generate at build time.)

---

### Task 1.10: Wire build:indexes as a prebuild hook

**Files:**
- Modify: `D:/Education/package.json`

- [ ] **Step 1: Update scripts to chain build:indexes before next build, and as a pre-dev step**

Edit `D:/Education/package.json` `"scripts"` block to:

```json
  "scripts": {
    "predev": "npm run build:indexes",
    "dev": "next dev",
    "build": "npm run build:indexes && next build",
    "start": "next start",
    "build:indexes": "tsx scripts/build-indexes.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "lint": "next lint",
    "typecheck": "tsc --noEmit"
  }
```

- [ ] **Step 2: Verify dev startup runs indexes first**

Run: `cd D:/Education && npm run dev`
Expected: `[build-indexes]` log output, *then* Next.js dev server starts.
Stop server (Ctrl+C).

- [ ] **Step 3: Commit**

```bash
git -C D:/Education add package.json
git -C D:/Education commit -m "chore: run build:indexes before dev/build"
```

---

### Task 1.11: components/wiki/BrokenLink.tsx

**Files:**
- Create: `components/wiki/BrokenLink.tsx`
- Create: `components/wiki/BrokenLink.test.tsx`

**What this does:** A simple presentational component used by render-time HTML for broken wiki links — but since render produces raw HTML, BrokenLink isn't directly mounted; instead we use CSS in globals.css to style `a[data-broken="true"]`. We still create this component because Plan 2 may switch to React-tree rendering.

Actually, given Plan 1 produces HTML strings (not React trees), styling broken links via CSS is sufficient. We'll skip a React component for now and just add a CSS rule.

- [ ] **Step 1: Add a CSS rule for broken links**

Edit `D:/Education/app/globals.css`, append:

```css
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

- [ ] **Step 2: Commit**

```bash
git -C D:/Education add app/globals.css
git -C D:/Education commit -m "feat(wiki): style broken [[wiki-link]] via CSS"
```

(No React component needed; the rendered HTML carries `data-broken="true"`.)

---

### Task 1.12: components/wiki/Backlinks.tsx

**Files:**
- Create: `components/wiki/Backlinks.tsx`
- Create: `components/wiki/Backlinks.test.tsx`

- [ ] **Step 1: Write failing test**

Create `D:/Education/components/wiki/Backlinks.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Backlinks } from "./Backlinks";

const titleMap = {
  "a/page-1": "First Page",
  "a/page-2": "Second Page",
};

describe("Backlinks", () => {
  it("renders a list of links to backlinking pages", () => {
    render(<Backlinks slugs={["a/page-1", "a/page-2"]} titleMap={titleMap} />);
    const link1 = screen.getByRole("link", { name: "First Page" });
    expect(link1).toHaveAttribute("href", "/wiki/a/page-1");
    const link2 = screen.getByRole("link", { name: "Second Page" });
    expect(link2).toHaveAttribute("href", "/wiki/a/page-2");
  });

  it("renders nothing when there are no backlinks", () => {
    const { container } = render(<Backlinks slugs={[]} titleMap={titleMap} />);
    expect(container.firstChild).toBeNull();
  });

  it("falls back to slug if title is missing", () => {
    render(<Backlinks slugs={["x/y"]} titleMap={{}} />);
    expect(screen.getByRole("link", { name: "x/y" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run, expect fail**

Run: `npm test -- Backlinks`
Expected: fail.

- [ ] **Step 3: Implement**

Create `D:/Education/components/wiki/Backlinks.tsx`:

```tsx
import Link from "next/link";

interface Props {
  slugs: string[];
  titleMap: Record<string, string>;
}

export function Backlinks({ slugs, titleMap }: Props) {
  if (slugs.length === 0) return null;
  return (
    <aside aria-label="Backlinks" className="mt-8 border-t pt-4">
      <h2 className="text-sm font-semibold mb-2">이 페이지를 인용한 곳</h2>
      <ul className="list-disc pl-6">
        {slugs.map((slug) => (
          <li key={slug}>
            <Link href={`/wiki/${slug}`} className="underline">
              {titleMap[slug] ?? slug}
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
```

- [ ] **Step 4: Run, expect pass**

Run: `npm test -- Backlinks`
Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git -C D:/Education add components/wiki/Backlinks.tsx components/wiki/Backlinks.test.tsx
git -C D:/Education commit -m "feat(wiki): Backlinks component"
```

---

### Task 1.13: components/wiki/WikiPage.tsx

**Files:**
- Create: `components/wiki/WikiPage.tsx`

**Why no test file:** This component composes children from already-tested units (raw HTML from `render.ts`, `Backlinks` from 1.12). E2E test (Task 1.19) covers the integration.

- [ ] **Step 1: Implement**

Create `D:/Education/components/wiki/WikiPage.tsx`:

```tsx
import { Backlinks } from "./Backlinks";
import type { PageFrontmatter } from "@/lib/wiki/types";

interface Props {
  slug: string;
  frontmatter: PageFrontmatter;
  bodyHtml: string;
  backlinks: string[];
  titleMap: Record<string, string>;
  /** GitHub URL prefix for "Edit on GitHub" — pass null to hide */
  editBaseUrl: string | null;
  /** filePath relative to wiki repo root, e.g. "data/cat-a/page.md" */
  filePath: string;
}

export function WikiPage({
  slug,
  frontmatter,
  bodyHtml,
  backlinks,
  titleMap,
  editBaseUrl,
  filePath,
}: Props) {
  return (
    <article className="prose max-w-3xl mx-auto p-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">{frontmatter.title}</h1>
        <div className="text-sm text-gray-500 mt-1">
          updated {frontmatter.updated} ·{" "}
          {frontmatter.tags.length > 0 && (
            <span>
              tags:{" "}
              {frontmatter.tags.map((t, i) => (
                <span key={t}>
                  <a href={`/wiki/tag/${encodeURIComponent(t)}`} className="underline">
                    {t}
                  </a>
                  {i < frontmatter.tags.length - 1 ? ", " : ""}
                </span>
              ))}
            </span>
          )}
        </div>
      </header>

      {frontmatter.video && (
        <div className="mb-6 aspect-video">
          <iframe
            src={frontmatter.video}
            title="Video"
            className="w-full h-full"
            allowFullScreen
          />
        </div>
      )}

      <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />

      <Backlinks slugs={backlinks} titleMap={titleMap} />

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

      <p className="mt-2 text-xs text-gray-400">slug: {slug}</p>
    </article>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git -C D:/Education add components/wiki/WikiPage.tsx
git -C D:/Education commit -m "feat(wiki): WikiPage component (frontmatter, body, video, backlinks, edit link)"
```

---

### Task 1.14: app/wiki/[...slug]/page.tsx — dynamic wiki page

**Files:**
- Create: `app/wiki/[...slug]/page.tsx`
- Create: `lib/wiki/page-loader.ts` (server-side helper that combines load + render + backlinks for one page)

**Why a helper:** `page.tsx` should stay declarative; the heavy lifting (load vault, render one page) goes in a dedicated function we can also reuse for SSG.

- [ ] **Step 1: Create the page-loader helper**

Create `D:/Education/lib/wiki/page-loader.ts`:

```typescript
import path from "node:path";
import { loadVault } from "./load";
import { buildBacklinks, buildAliasMap } from "./backlinks";
import { renderBody } from "./render";
import type { Page } from "./types";

const CONTENT_DIR = path.resolve(process.cwd(), "content");

interface LoadedPageBundle {
  page: Page;
  bodyHtml: string;
  backlinks: string[];
  titleMap: Record<string, string>;
}

let cache: { all: Page[]; titleMap: Record<string, string>; aliasMap: Map<string, string>; backlinks: Record<string, string[]> } | null = null;

async function ensureCache() {
  if (cache) return cache;
  const all = await loadVault(CONTENT_DIR);
  const aliasMap = buildAliasMap(all);
  const { backlinks } = buildBacklinks(all);
  const titleMap: Record<string, string> = {};
  for (const p of all) titleMap[p.slug] = p.frontmatter.title;
  cache = { all, titleMap, aliasMap, backlinks };
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
```

- [ ] **Step 2: Create the dynamic page route**

Create `D:/Education/app/wiki/[...slug]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { loadOnePage, getAllSlugs } from "@/lib/wiki/page-loader";
import { WikiPage } from "@/components/wiki/WikiPage";

const EDIT_BASE_URL = process.env.NEXT_PUBLIC_WIKI_REPO_URL ?? null;
// e.g., "https://github.com/<user>/vibeforge-wiki"

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

  return (
    <WikiPage
      slug={fullSlug}
      frontmatter={bundle.page.frontmatter}
      bodyHtml={bundle.bodyHtml}
      backlinks={bundle.backlinks}
      titleMap={bundle.titleMap}
      editBaseUrl={EDIT_BASE_URL}
      filePath={bundle.page.filePath}
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

- [ ] **Step 3: Verify by visiting a page**

Run: `cd D:/Education && npm run dev`
Open: `http://localhost:3000/wiki/data-handling/what-is-an-index`
Expected: Page renders with title "인덱스가 뭐예요?", body, backlinks (if any), tags as links.
Open: `http://localhost:3000/wiki/nonexistent/page`
Expected: 404.

Stop dev server.

- [ ] **Step 4: Commit**

```bash
git -C D:/Education add lib/wiki/page-loader.ts app/wiki/[...slug]/page.tsx
git -C D:/Education commit -m "feat(wiki): dynamic /wiki/[...slug] route with SSG"
```

---

### Task 1.15: app/wiki/page.tsx — wiki index

**Files:**
- Create: `app/wiki/page.tsx`

- [ ] **Step 1: Implement**

Create `D:/Education/app/wiki/page.tsx`:

```tsx
import Link from "next/link";
import { getAllSlugs } from "@/lib/wiki/page-loader";
import { loadVault } from "@/lib/wiki/load";
import path from "node:path";

interface CategoryGroup {
  category: string;
  pages: { slug: string; title: string }[];
}

const CATEGORY_LABELS: Record<string, string> = {
  "data-handling": "데이터 다루기",
  "how-computers-work": "컴퓨터는 어떻게 일하나",
  "code-flow": "코드 흐름",
};

export const metadata = {
  title: "Wiki — VibeForge",
};

export default async function WikiIndexPage() {
  const all = await loadVault(path.resolve(process.cwd(), "content"));
  const groups = new Map<string, { slug: string; title: string }[]>();
  for (const page of all) {
    const [category] = page.slug.split("/");
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category)!.push({ slug: page.slug, title: page.frontmatter.title });
  }
  const grouped: CategoryGroup[] = Array.from(groups.entries())
    .map(([category, pages]) => ({ category, pages }))
    .sort((a, b) => a.category.localeCompare(b.category));

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Wiki</h1>
      <p className="mb-4 text-gray-600">
        바이브코더가 알아두면 좋은 CS 지식. 카테고리별로 정리되어 있어요.
      </p>
      {grouped.map(({ category, pages }) => (
        <section key={category} className="mb-8">
          <h2 className="text-xl font-semibold mb-2">
            {CATEGORY_LABELS[category] ?? category}
          </h2>
          <ul className="list-disc pl-6">
            {pages.map((p) => (
              <li key={p.slug}>
                <Link href={`/wiki/${p.slug}`} className="underline">
                  {p.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npm run dev`
Open: `http://localhost:3000/wiki`
Expected: Three category sections (데이터 다루기 / 컴퓨터는 어떻게 일하나 / 코드 흐름), each with one seed page link.

Stop dev server.

- [ ] **Step 3: Commit**

```bash
git -C D:/Education add app/wiki/page.tsx
git -C D:/Education commit -m "feat(wiki): /wiki index page with friendly category labels"
```

---

### Task 1.16: app/wiki/tag/[tag]/page.tsx — tag index

**Files:**
- Create: `app/wiki/tag/[tag]/page.tsx`

- [ ] **Step 1: Implement**

Create `D:/Education/app/wiki/tag/[tag]/page.tsx`:

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { TagMap } from "@/lib/wiki/types";

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

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">#{tag}</h1>
      <p className="text-sm text-gray-500 mb-4">{slugs.length}개 페이지</p>
      <ul className="list-disc pl-6">
        {slugs.map((s) => (
          <li key={s}>
            <Link href={`/wiki/${s}`} className="underline">
              {titleBySlug[s] ?? s}
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-sm">
        <Link href="/wiki" className="underline">← Wiki 홈</Link>
      </p>
    </main>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npm run dev`
Open: `http://localhost:3000/wiki/tag/DB`
Expected: page lists `인덱스가 뭐예요?`.
Open: `http://localhost:3000/wiki/tag/OS`
Expected: page lists `프로세스가 뭐예요?`.
Stop dev server.

- [ ] **Step 3: Commit**

```bash
git -C D:/Education add app/wiki/tag
git -C D:/Education commit -m "feat(wiki): /wiki/tag/<tag> tag index pages"
```

---

### Task 1.17: app/api/search/route.ts — search Route Handler

**Files:**
- Create: `app/api/search/route.ts`

- [ ] **Step 1: Implement**

Create `D:/Education/app/api/search/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { loadSearchIndex, searchPages } from "@/lib/wiki/search-index";

let cachedIndex: Awaited<ReturnType<typeof loadSearchIndex>> | null = null;

async function getIndex() {
  if (cachedIndex) return cachedIndex;
  const file = path.resolve(process.cwd(), "public", "wiki-data", "search.json");
  const json = await readFile(file, "utf-8");
  cachedIndex = loadSearchIndex(json);
  return cachedIndex;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  if (!q) {
    return NextResponse.json({ hits: [] });
  }
  const idx = await getIndex();
  const hits = searchPages(idx, q).slice(0, 20);
  return NextResponse.json({ hits });
}
```

- [ ] **Step 2: Verify**

Run: `npm run dev`
Open in browser: `http://localhost:3000/api/search?q=인덱스`
Expected JSON:
```json
{ "hits": [ { "slug": "data-handling/what-is-an-index", "title": "인덱스가 뭐예요?", "score": ... } ] }
```
Stop dev server.

- [ ] **Step 3: Commit**

```bash
git -C D:/Education add app/api/search
git -C D:/Education commit -m "feat(wiki): /api/search Route Handler"
```

---

### Task 1.18: components/wiki/SearchBox.tsx — functional search box

**Files:**
- Create: `components/wiki/SearchBox.tsx`

**Note:** Bare functional only — Plan 2 polishes this with the design system.

- [ ] **Step 1: Implement client component**

Create `D:/Education/components/wiki/SearchBox.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface SearchHit {
  slug: string;
  title: string;
  score: number;
}

export function SearchBox() {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setHits([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: ctrl.signal,
        });
        const data = (await res.json()) as { hits: SearchHit[] };
        setHits(data.hits);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error(err);
        }
      } finally {
        setLoading(false);
      }
    }, 150);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query]);

  return (
    <div className="my-4">
      <input
        type="search"
        placeholder="위키 검색…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="border rounded px-2 py-1 w-full"
        aria-label="Search wiki"
      />
      {loading && <p className="text-xs text-gray-400 mt-1">검색 중…</p>}
      {hits.length > 0 && (
        <ul className="mt-2 border rounded divide-y">
          {hits.map((h) => (
            <li key={h.slug} className="p-2">
              <Link href={`/wiki/${h.slug}`} className="underline">
                {h.title}
              </Link>
              <span className="text-xs text-gray-500 ml-2">{h.slug}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Mount on the wiki index page**

Edit `D:/Education/app/wiki/page.tsx`. After `<h1>Wiki</h1>` (and before the "바이브코더가 알아두면..." paragraph), insert:

```tsx
import { SearchBox } from "@/components/wiki/SearchBox";
```

at the top (other imports), and inside the component, between the `<h1>` and the description paragraph:

```tsx
      <SearchBox />
```

- [ ] **Step 3: Verify**

Run: `npm run dev`
Open: `http://localhost:3000/wiki`
Type "인덱스" — expect a hit linking to the index page after a brief delay.
Type "프로세스" — expect a hit for the process page.
Stop dev server.

- [ ] **Step 4: Commit**

```bash
git -C D:/Education add components/wiki/SearchBox.tsx app/wiki/page.tsx
git -C D:/Education commit -m "feat(wiki): client-side search box on wiki index"
```

---

### Task 1.19: Playwright e2e — wiki render smoke test

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/wiki-render.spec.ts`

- [ ] **Step 1: Install Playwright browsers**

Run: `cd D:/Education && npx playwright install chromium`

- [ ] **Step 2: Create playwright.config.ts**

Create `D:/Education/playwright.config.ts`:

```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

- [ ] **Step 3: Create the e2e spec**

Create `D:/Education/tests/e2e/wiki-render.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";

test.describe("wiki rendering", () => {
  test("homepage links to /wiki", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "VibeForge" })).toBeVisible();
    await page.getByRole("link", { name: "Wiki" }).click();
    await expect(page).toHaveURL("/wiki");
  });

  test("/wiki shows category groups and seed pages", async ({ page }) => {
    await page.goto("/wiki");
    await expect(page.getByRole("heading", { name: "Wiki" })).toBeVisible();
    await expect(page.getByRole("link", { name: "인덱스가 뭐예요?" })).toBeVisible();
    await expect(page.getByRole("link", { name: "프로세스가 뭐예요?" })).toBeVisible();
    await expect(page.getByRole("link", { name: "배열이 뭐예요?" })).toBeVisible();
  });

  test("clicking a seed page renders body and resolves [[wiki-link]]", async ({ page }) => {
    await page.goto("/wiki/data-handling/what-is-an-index");
    await expect(page.getByRole("heading", { name: "인덱스가 뭐예요?", level: 1 })).toBeVisible();
    // body content
    await expect(page.getByText("색인", { exact: false })).toBeVisible();
    // resolved wiki-link to "what-is-a-process"
    const wikiLink = page.locator('a[href="/wiki/how-computers-work/what-is-a-process"]');
    await expect(wikiLink).toBeVisible();
  });

  test("backlinks appear on the linked-to page", async ({ page }) => {
    await page.goto("/wiki/how-computers-work/what-is-a-process");
    await expect(page.getByRole("heading", { name: "이 페이지를 인용한 곳" })).toBeVisible();
    // the index page links here
    await expect(page.getByRole("link", { name: "인덱스가 뭐예요?" })).toBeVisible();
  });

  test("tag page lists matching pages", async ({ page }) => {
    await page.goto("/wiki/tag/DB");
    await expect(page.getByRole("heading", { name: "#DB" })).toBeVisible();
    await expect(page.getByRole("link", { name: "인덱스가 뭐예요?" })).toBeVisible();
  });

  test("search box returns a hit", async ({ page }) => {
    await page.goto("/wiki");
    await page.getByRole("searchbox", { name: "Search wiki" }).fill("인덱스");
    await expect(page.getByRole("link", { name: "인덱스가 뭐예요?" })).toBeVisible();
  });
});
```

- [ ] **Step 4: Run e2e tests**

Run: `cd D:/Education && npm run test:e2e`
Expected: 6 tests pass. (May take 30-60s; Playwright spins up the dev server.)

If any fail, inspect screenshots/traces under `test-results/` and fix the underlying bug before continuing.

- [ ] **Step 5: Commit**

```bash
git -C D:/Education add playwright.config.ts tests/e2e/
git -C D:/Education commit -m "test(e2e): wiki render smoke tests (homepage → page → backlinks → search)"
```

---

### Task 1.20: README + closing commit

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write README**

Create `D:/Education/README.md`:

```markdown
# vibeforge-site

[VibeForge](./docs/superpowers/specs/2026-04-30-vibeforge-design.md) — 바이브코더를 위한 CS 학습·토론 사이트. Next.js 15 (App Router) + TypeScript.

이 repo는 사이트 코드. 콘텐츠(위키 페이지)는 [`vibeforge-wiki`](https://github.com/<user>/vibeforge-wiki) repo에 있고 `content/`로 git submodule 마운트됨.

## 첫 셋업

\`\`\`bash
git clone --recurse-submodules <this-repo>
cd vibeforge-site
npm install
\`\`\`

이미 clone 했고 submodule만 가져오려면:

\`\`\`bash
git submodule update --init --recursive
\`\`\`

## 개발

\`\`\`bash
npm run dev
# → http://localhost:3000
\`\`\`

빌드 시작 전 `scripts/build-indexes.ts`가 자동으로 vault를 스캔해서 `public/wiki-data/`에 backlink/tag/search 인덱스를 만듭니다.

## 테스트

\`\`\`bash
npm test            # vitest unit
npm run test:e2e    # playwright e2e
npm run typecheck   # tsc strict
\`\`\`

## 위키 콘텐츠 추가

→ [vibeforge-wiki](https://github.com/<user>/vibeforge-wiki) repo로 PR 보내주세요. [CONTRIBUTING.md](https://github.com/<user>/vibeforge-wiki/blob/main/CONTRIBUTING.md) 참조.

## 다음 단계 (Plans 2~6)

- Plan 2: design.png 톤 적용 (frontend-design skill)
- Plan 3: Supabase + GitHub OAuth + Forum
- Plan 4: Wiki ↔ Q&A 양방향 백링크
- Plan 5: 그래프뷰 + giscus + About
- Plan 6: 폴리시 + 시드 콘텐츠 톤 재포장

각 plan: `docs/superpowers/plans/`.
```

- [ ] **Step 2: Commit**

```bash
git -C D:/Education add README.md
git -C D:/Education commit -m "docs: README for Plan 1 (bootstrap + wiki engine)"
```

- [ ] **Step 3: Final sanity check**

Run all of:
```bash
cd D:/Education
npm run typecheck    # PASS
npm test             # PASS (all unit suites)
npm run build:indexes # PASS, writes 4 JSON files
npm run build         # next build PASS
npm run test:e2e      # 6 tests PASS
```

If everything passes, Plan 1 is complete.

- [ ] **Step 4: Tag the milestone**

```bash
git -C D:/Education tag plan1-bootstrap-wiki-engine
```

---

## Self-Review Checklist (post-write)

The skill requires re-reading the spec against the plan. Checks I performed inline:

**Spec coverage:**
- ✅ Repo split (vibeforge-site + vibeforge-wiki, submodule) → Tasks 0.5-0.7
- ✅ `[[wiki-link]]` parser → Task 1.3
- ✅ Backlinks → Tasks 1.5, 1.12
- ✅ Tags → Tasks 1.6, 1.16
- ✅ Search → Tasks 1.7, 1.17, 1.18
- ✅ Frontmatter (`title`/`tags`/`aliases`/`video`/`updated`) → Task 1.2
- ✅ Build-time JSON indexes → Task 1.9
- ✅ EditOnGitHub → Task 1.13
- ✅ Friendly category labels (B IA) → Task 1.15
- ✅ Broken `[[wiki-link]]` styled (CSS) → Task 1.11
- ✅ Quartz cleanup → Task 0.1
- ⏸️ Graph view → **Plan 5** (out of Plan 1 scope per opening)
- ⏸️ giscus → **Plan 5**
- ⏸️ Forum / Auth / Supabase → **Plan 3**
- ⏸️ Wiki ↔ Q&A backlinks → **Plan 4**
- ⏸️ design.png tone (frontend-design skill) → **Plan 2**
- ⏸️ About / Contribute pages → **Plan 5**
- ⏸️ Tone reformat seed content → **Plan 6**

**Placeholder scan:** No "TBD" / "TODO" / "implement later" / "add appropriate error handling". Each step has actual content.

**Type consistency:** `Page`, `PageFrontmatter`, `BacklinkMap`, `TagMap`, `SearchIndex`, `SearchHit` — all defined in `lib/wiki/types.ts` (Task 1.1) and `lib/wiki/search-index.ts` (Task 1.7). Function names checked: `loadVault`, `buildBacklinks`, `buildAliasMap`, `buildTagMap`, `buildSearchIndex`, `searchPages`, `loadSearchIndex`, `renderBody`, `loadOnePage`, `getAllSlugs` — used consistently across tasks 1.4-1.18.

**Open dependencies for downstream plans:**
- `editBaseUrl` env var `NEXT_PUBLIC_WIKI_REPO_URL` set when wiki repo URL is known (manual `.env.local` after Task 0.6).
- `content/` submodule pin will need `git submodule update --remote --merge` whenever wiki repo gets new commits, then commit the new pointer (covered in standard submodule workflow, no plan task needed).

**Scope check:** ~27 tasks, ~3 weeks of work. Single working deliverable: a navigable wiki site. Sized correctly for one plan.

---

**Plan 1 complete. Ready to execute.**
