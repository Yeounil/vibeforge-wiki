# VibeForge Plan 6 — Final Polish (Content + Friend-PR Readiness) Design

**Date:** 2026-05-01
**Phase:** 6 of 6 (master spec `2026-04-30-vibeforge-design.md` Phase Plan §"Phase 6 (Wk 7+)")
**Predecessor:** Plan 5 (Graph view + giscus + About/Contribute) — branch `plan3/supabase-forum`, tag `plan5-graph-giscus-about`, head `5d9be90`

## 1. Goal

Close out the master-spec phase plan with the final polish phase: ship 2 new seed pages on the DB topic, refresh tone on the existing 3 pages, plug Plan 5's lone real defect, and stand up the minimum infra (`npm run lint`, `npm run check:content`) needed to receive a friend's wiki PR with confidence.

**Non-goals.** No new site React components. No new site routes. No new server modules. No DB schema changes. No CI workflow yet (deferred to v2). The only genuinely new code in the site repo is one validation script + its tests.

## 2. Architecture

Plan 6 has two destinations:

```
vault repo (content/)         site repo (D:\Education)
├─ 2 new markdown pages        ├─ eslint.config.mjs (new — flat config)
├─ tone pass on 3 existing     ├─ scripts/check-content.ts (new)
├─ CONTRIBUTING.md polish      ├─ scripts/check-content.test.ts (new)
└─ PR template +1 line         ├─ package.json (+ check:content script)
                               ├─ app/wiki/graph/page.tsx (Plan 5 #1 fix)
                               ├─ app/about/page.tsx (copy polish)
                               └─ site-pages/about.md (copy polish)
```

The content-validator script reuses existing site modules (`lib/wiki/page-loader.ts` `getAllPages` / `getAliasMap`, `lib/wiki/backlinks.ts` `WIKI_LINK_RE`) — it's a thin orchestrator over already-tested pieces, not a new parser.

## 3. Module Layout

### New files

```
content/data/data-handling/what-is-a-transaction.md
content/data/data-handling/what-is-an-n-plus-one.md
eslint.config.mjs
scripts/check-content.ts
scripts/check-content.test.ts
```

### Modified files

```
content/data/data-handling/what-is-an-index.md      tone pass + new wikilinks
content/data/code-flow/what-is-an-array.md          tone pass + new wikilinks
content/data/how-computers-work/what-is-a-process.md tone pass + new wikilinks
content/CONTRIBUTING.md                              first-timer guide + topic suggestions + check:content
content/.github/PULL_REQUEST_TEMPLATE.md             one-line check:content row
package.json                                         scripts.check:content
app/wiki/graph/page.tsx                              flex-1 min-h-0 chain (replace h-[calc(100vh-180px)])
app/about/page.tsx                                   copy polish (1-2 lines)
site-pages/about.md                                  copy polish (1-2 lines)
```

## 4. Content additions

### 4.1 `what-is-a-transaction.md`

Frontmatter:
```yaml
title: 트랜잭션이 뭐예요?
tags: [DB, 데이터 무결성]
aliases: [transaction, ACID]
updated: 2026-05-01
```

Body shape (200~600 단어, style-guide tone):
- 진입: AI가 짠 코드가 두 군데를 연달아 바꾸는 상황 (송금: 차감-증가)
- 정의: "한 묶음으로 성공하거나, 한 묶음으로 없던 일이 되거나"
- ACID 풀어쓰기 (Atomicity 원자성, Consistency 일관성, Isolation 격리, Durability 영속)
- 실전 시그널: "이 두 SQL이 따로 실패하면 데이터가 어긋나는가?" → yes면 트랜잭션
- wikilinks: `[[what-is-an-index]]` (락이 인덱스 레벨에서 잡힘), `[[what-is-an-n-plus-one]]` (트랜잭션이 길어지면 N+1 락이 더 위험)

### 4.2 `what-is-an-n-plus-one.md`

Frontmatter:
```yaml
title: N+1이 뭐예요?
tags: [DB, 성능, ORM]
aliases: [n+1, N+1 problem, n plus one]
updated: 2026-05-01
```

Body shape:
- 진입: ORM 한 번 써본 바이브코더가 자주 만나는 상황. "유저 목록 + 각 유저의 글 개수" 같은 N+1
- 정의: 1번 쿼리 + N번 추가 쿼리 = 총 N+1번
- 발견 신호: 로그에 똑같은 SQL 모양이 N번 찍힘
- 처방 한 줄씩: eager loading / JOIN / batch fetch / DataLoader
- wikilinks: `[[what-is-an-index]]` (인덱스 없으면 N배 더 나쁨), `[[what-is-a-transaction]]` (트랜잭션 안에선 락 보유 시간이 N배)

### 4.3 Tone pass on existing 3 pages

`what-is-an-index.md`, `what-is-an-array.md`, `what-is-a-process.md`:
- style-guide §"피하기" 항목 점검 (위와 같이/이는 다음과 같이/본 시스템은)
- 약어 풀어쓰기 누락 확인 (OS / DB / SQL / CPU 등 첫 등장 시 한국어)
- 새 페이지 2개로 이어지는 wikilink 1-2개씩 자연스러운 위치에 추가
- frontmatter `updated` 2026-05-01로 갱신
- 본문 의미 변경은 금지 — 톤·연결성 폴리시만

## 5. Site infra additions

### 5.1 `eslint.config.mjs` (ESLint 9 flat config)

Goal: `npm run lint` 비-인터랙티브화. Next 15는 ESLint 9 flat config 지원.

Shape:
```js
import { FlatCompat } from "@eslint/eslintrc";
const compat = new FlatCompat({ baseDirectory: import.meta.dirname });
export default [
  ...compat.extends("next/core-web-vitals"),
  { ignores: ["content/**", ".next/**", "scripts/build-indexes.ts"] },
];
```

Plan-6 책임: `npm run lint`이 인터랙티브 프롬프트 없이 끝나는 것까지. ESLint warnings 0건 강제는 v2.

### 5.2 `scripts/check-content.ts`

**Contract:**

| Rule | Severity | Check |
|---|---|---|
| frontmatter `title` non-empty string | error | gray-matter parse |
| frontmatter `tags` non-empty array of strings | error | type check |
| frontmatter `updated` matches `/^\d{4}-\d{2}-\d{2}$/` | error | regex |
| Every `[[wikilink]]` resolves via aliasMap | error | reuse `getAliasMap()` + `WIKI_LINK_RE` |
| Same `[[link]]` repeated >5× in one page | warn | dedup + count |

**Scope:** `content/data/**/*.md` only. Excludes `content/CONTRIBUTING.md`, `content/README.md`, `content/style-guide.md`, `content/.github/**`.

**Output:**
```
✓ data/data-handling/what-is-an-index.md
✗ data/data-handling/what-is-a-transaction.md
  - frontmatter: missing 'updated'
  - broken wikilink: [[unknown-page]]

1 error, 0 warnings, 5 pages checked
```

**Exit code:** errors=0 → 0; errors≥1 → 1. Warnings never affect exit code.

**Reuse:**
- `lib/wiki/page-loader.ts` `getAllPages()` for the page list
- `lib/wiki/page-loader.ts` `getAliasMap()` for link resolution
- `lib/wiki/backlinks.ts` `WIKI_LINK_RE` for the link regex

No new parsers, no fork.

### 5.3 `scripts/check-content.test.ts`

4 Vitest tests (uses fs fixtures or mocked vault path):

1. **happy path** — fixture with 2 valid pages → exit 0, "0 errors"
2. **frontmatter missing** — fixture with no `title` → exit 1, error mentions `missing 'title'`
3. **broken wikilink** — fixture with `[[ghost-page]]` → exit 1, error mentions `[[ghost-page]]`
4. **warn-only** — fixture with same `[[link]]` 6× → exit 0 but stdout contains "warning"

Tests should drive the path-injection design: `runCheck(vaultDir): Promise<{exitCode, output}>` — pure async function, no `process.exit` inside until the CLI shim.

### 5.4 `app/wiki/graph/page.tsx` — Plan 5 minor #1

Current structure (verified):
```tsx
<div className="min-h-screen flex flex-col ...">           // root: flex col ✓
  ...header...
  <div className="flex-1 px-4 md:px-6 pb-6">              // line 55: flex-1, NOT flex-col
    <div className="vf-card h-[calc(100vh-180px)] ...">    // line 56: magic number
      <GraphView data={data} />
    </div>
  </div>
</div>
```

After:
```tsx
<div className="flex-1 px-4 md:px-6 pb-6 flex flex-col min-h-0">  // promote wrapper
  <div className="vf-card flex-1 min-h-0 overflow-hidden">         // canvas card
    <GraphView data={data} />
  </div>
</div>
```

Why both changes: `flex-1 min-h-0` chain only works if every ancestor in the height chain is also `flex flex-col` with `min-h-0`. The line 55 wrapper currently isn't flex, so promoting it is required for the inner card's `flex-1` to resolve. Visual regression target: window resize keeps the canvas filling remaining height; header/legend strip stays put.

### 5.5 Copy polish

**`app/about/page.tsx`** — currently renders `site-pages/about.md`. Polish: nothing to do at the page level; the change is in the markdown.

**`site-pages/about.md`** — current copy is functional but flat. Add 1-2 lines of personality matching style-guide tone (e.g., "AI가 짜준 코드를 한 단계 더 깊게 이해하고 싶을 때 들어오는 곳" 같은 미세 카피). 신규 페이지로 이어지는 링크가 있다면 자연스럽게 노출.

## 6. CONTRIBUTING & PR template polish

### 6.1 `content/CONTRIBUTING.md` — additions

New subsections to append (does not replace existing):

**처음 기여자 가이드** (after PR 절차):
- GitHub fork 버튼 위치
- 로컬 clone — `git clone <your-fork-url>`
- branch 생성 — `git checkout -b add/<slug>`
- 페이지 작성 → commit → push → PR
- 한 PR = 한 페이지 (review 단순화)

**추천 토픽** (after 처음 기여자 가이드):
- 깨진 `[[wikilink]]`(빨간 strikethrough)이 좋은 후보 — 누군가가 이미 인용하려 했다는 뜻
- vault `data/data-handling/` 안의 미작성 자매 토픽: 정규화·격리수준·JOIN
- 본인 PR이 처음이라면 200-400단어 1페이지부터

**검증 (npm run check:content)** (마지막):
- vibeforge-site repo에서 `npm install` → `npm run check:content`
- frontmatter / wikilink 자동 검사. error=0이어야 PR merge 가능
- 워닝(같은 link 6번 등)은 안내성, blocking 아님

### 6.2 `content/.github/PULL_REQUEST_TEMPLATE.md`

체크리스트에 1줄 추가:
```
- [ ] vibeforge-site에서 `npm run check:content` 통과했어요 (선택, 있으면 빠른 review)
```

## 7. Content authoring paths (User-Facing Answer)

조사 결과 **현 아키텍처에서 콘텐츠 추가 경로는 단일 — vault repo에 git push** 외 없다.

**현재 파이프라인:**
```
vault repo markdown push → npm run build:indexes → SSG 빌드 → site 정적 페이지
```

`scripts/build-indexes.ts` (Plan 1)이 vault `content/`를 읽어 site 빌드 인덱스를 만든다. Site 런타임에는 vault를 다시 읽지 않는다 (Plan 1 결정).

**fork → PR이 외부인 표준 흐름:**
- Yeounil/vibeforge-wiki repo fork → branch → 페이지 작성 → push to fork → PR → 운영자 merge
- 본인은 fork 없이 main 브랜치에 직접 push 가능
- merge 후 site Vercel 빌드가 자동 트리거되어야 vault 변경이 site에 반영 (Vercel webhook 또는 git submodule sync 설정 필요 — 운영자 검증 항목으로 분리)

**다른 경로를 만들려면 신규 모듈 필요:**

| 경로 | 신규 작업 | 대략 비용 |
|---|---|---|
| (a) Admin UI + Supabase 페이지 테이블 | Supabase schema + admin route + 빌드 파이프라인 이중화 | 큼 — plan 단위 |
| (b) Site에서 GitHub API로 commit/PR | octokit + GitHub OAuth scopes 확장 + UI | 중간 — sub-plan |
| (c) 로컬 vault 자동 push 스크립트 | filesystem watcher + git push 래퍼 | 작음 — 본인 전용 |

**Plan 6 권고:** (a)·(b)·(c) 모두 Plan 6에 포함 안 함. (c)가 본인 워크플로에 도움된다면 Plan 7 단독 후보. (a)·(b)는 외부 기여 트래픽이 실제로 늘었을 때 검토.

이 절은 "콘텐츠 추가 방법이 push 외 없는지" 사용자 질문에 대한 베이스라인 답변. 향후 admin UI 논의가 나올 때 이 spec을 참조.

## 8. Error handling

| Failure | Behavior |
|---|---|
| `check-content` page parse fail | error로 보고, 다음 파일로 진행 (스크립트는 계속 실행) |
| `check-content` aliasMap 로드 실패 | exit 2 (config error — 사용자 환경 문제) |
| eslint config 누락 시 | `npm run lint`이 옛 인터랙티브 프롬프트로 회귀 — 회귀 감지 위해 plan 6 task에서 비-인터랙티브 동작 직접 확인 |
| graph height 변경 후 시각 회귀 | manual smoke 단계에서 발견 — 회귀 시 원복 (한 줄 변경) |

## 9. Testing strategy

**Unit:** check-content 4건 신규. 기존 99건 변동 없음(scripts/는 `lib/`에 새 의존성을 만들지 않고 import만 함).

**E2E:** 신규 0건. 기존 18건 변동 없음.

**Manual smoke (Plan 6 종료 시 운영자 — 스펙에 미수행 항목으로 박지 않고 user-facing 체크리스트로):**
- `npm run check:content` 0 error
- `npm run lint` 비-인터랙티브 (warnings는 OK)
- `/wiki/graph` 신규 매직넘버 교체 시각 회귀 없음 (창 리사이즈)
- 신규 페이지 2개 `/wiki/graph`에서 노드로 보임, wikilink 엣지 잡힘
- 신규 페이지 2개 `/wiki/<slug>`로 200 응답 + giscus iframe (env 세팅됨)

## 10. Out of scope (v2 / 후속 plan)

- Site `.github/workflows/ci.yml` — content check + typecheck + tests on PRs
- 콘텐츠 자동 publish (vault merge → site 빌드) Vercel webhook 설정
- Admin UI / WYSIWYG / Supabase-backed 콘텐츠
- Local vault auto-push watcher
- 그래프 메모이제이션, hover preview, 검색·필터 컨트롤
- giscus dark-mode toggle
- 외부인 활동 통계
- 이슈 템플릿
- 콘텐츠 5+ 페이지 점진 확대

## 11. Success criteria

- [ ] `npm run check:content` exit 0 with 5 vault pages valid
- [ ] `npm run lint` 비-인터랙티브 종료 (warnings OK)
- [ ] `/wiki/graph` 새 페이지 2개 + 기존 3개 = 5 노드, wikilink 엣지 정상
- [ ] CONTRIBUTING.md "처음 기여자 가이드" + "추천 토픽" + "검증" 3 섹션 추가
- [ ] PR 템플릿에 check:content 체크박스 추가
- [ ] 신규 페이지 2개 styling/톤이 style-guide 따름
- [ ] 기존 unit 99건 + 신규 4건 = 103건 green
- [ ] e2e 18건 green
- [ ] typecheck clean

## 12. Open questions

- **Vercel auto-deploy on vault merge:** site repo가 vault submodule을 어떻게 추적하는지(submodule pin vs floating)에 따라 vault PR merge가 자동으로 site 재빌드를 트리거하지 않을 수 있음. 운영자가 한 번 수동 검증하고, 필요 시 별도 plan으로 분리.
- **첫 외부 PR 시 review 흐름:** 운영자가 첫 외부 wiki PR을 받았을 때 review checklist는 별도 문서로 둘지(예: `docs/operator/review-checklist.md`) — Plan 6에선 작성 안 함, 첫 PR 받은 직후 retro에서 결정.
- **N+1 페이지 톤 캘리브레이션:** "ORM 쓰는 바이브코더"가 master spec 가정 페르소나에 맞는지. 본인 (Yeounil)이 작성 시 본인 직관 우선.

## 13. References

- Master spec: `docs/superpowers/specs/2026-04-30-vibeforge-design.md` §"Phase Plan", §"Open Questions / Validate Later", §"Success Criteria"
- Plan 5 spec/plan: `docs/superpowers/specs/2026-05-01-vibeforge-graph-giscus-about-design.md`, `docs/superpowers/plans/2026-05-01-vibeforge-graph-giscus-about.md`
- Style guide: `content/style-guide.md`
- Contributing baseline: `content/CONTRIBUTING.md`
- ESLint flat config: <https://eslint.org/docs/latest/use/configure/configuration-files>
- Next.js + flat ESLint: <https://nextjs.org/docs/app/api-reference/config/eslint>
