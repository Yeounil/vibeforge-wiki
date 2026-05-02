# Concept Hierarchy in Wiki — Design

**Date:** 2026-05-02
**Branch:** plan3/supabase-forum
**Status:** Draft → review

## Problem

`content/data/concepts/` 안에는 50+ 개념 페이지가 모두 같은 깊이로 평면 나열되어 있다. "데이터베이스 → DBMS → 3단계 스키마"처럼 명백한 종속·계층 관계는 본문 산문과 `## 관련` 섹션의 `[[wiki-link]]`에만 암묵적으로 표현돼 있고, **데이터에도 UI에도 반영되지 않는다**.

구체 증상:

- `Sidebar.tsx`는 `slug.split("/")[0]`로 카테고리만 묶어 평면 리스트로 렌더 (`app/wiki/page.tsx:14-31`).
- `/wiki` 인덱스도 카테고리 카드마다 페이지 50+개를 alphabetical grid로 한 번에 펼친다.
- `lib/wiki/types.ts`의 `PageFrontmatter`에 부모/선수 관계를 표현할 필드가 없다.
- `[[wiki-link]]`는 모두 동등한 무방향 엣지로 처리되어 그래프뷰에서도 계층이 안 보인다.

학습자는 어디서 시작해야 할지 알기 어렵고, 저자는 새 페이지를 어디에 둘지 가이드가 없다.

## Goals

1. 같은 top-level 폴더 안에서 페이지가 부모-자식 관계로 묶이고, 사이드바에 트리로 나타난다.
2. 페이지 헤더에 부모 체인(브레드크럼)과 선수지식 박스가 표시되어 학습 순서가 즉시 보인다.
3. `/wiki` 인덱스가 표층 구조(루트 + 즉시 자식)를 한눈에 보여준다.
4. 어노테이션이 0인 상태에서도 회귀 없음 (모든 페이지가 root로 표시 = 현재 평면 동작).
5. 잘못된 hierarchy(사이클·cross-folder·미존재 부모)는 빌드 시점에 잡힌다.

## Non-goals (YAGNI)

- 그래프뷰의 DAG 강화 (방향성 엣지·계층 색·학습 경로 펼침) — 후속 spec.
- 한 줄 요약 (`description` 필드) — 자식 목록·선수지식 박스에 풍부함을 더하지만 별도 데이터 작업.
- 형제 정렬 키 (`order` 필드) — 알파벳 정렬로 충분한지 본 뒤 결정.
- Cross-folder `parent` 허용 — 의미 정합성 검토 필요.
- `entities/`·`people/`·기타 폴더 어노테이션 — 인프라는 모든 폴더에 동작하지만 1차 출시는 `concepts/`만 어노테이션.
- 호버 미리보기 카드 / 페이지 이동 애니메이션 등.

## Decisions

브레인스토밍 중 사용자가 선택한 결정:

| # | 결정 사항 | 선택 |
|---|---|---|
| 1 | 개선의 주된 목적 | **B**: 사이드바·인덱스를 트리로 (탐색자 우선) |
| 2 | 계층을 어디에 기록 | **B**: frontmatter 필드 (폴더 구조는 불변) |
| 3 | 관계의 모양 | **C**: 단일 `parent` + 배열 `prerequisites` (소속과 횡적 의존을 분리) |
| 4 | 적용 범위 | **B**: 모든 폴더에서 메커니즘 사용 가능, **부모는 같은 top-level 폴더 안에서만** |
| 5 | 출시 범위 | **안 2**: 데이터 + 사이드바 + 페이지 헤더 통합 (인덱스 포함). 그래프 DAG 강화는 분리. |

## Architecture

### Frontmatter 스키마 확장

`lib/wiki/types.ts`의 `PageFrontmatter`에 두 필드 추가. 둘 다 optional.

```ts
export interface PageFrontmatter {
  title: string;
  tags: string[];
  aliases: string[];
  video: string | null;
  updated: string;
  parent: string | null;        // 추가 — 빌드 시점에 slug로 정규화됨
  prerequisites: string[];      // 추가 — 빌드 시점에 slug로 정규화됨
}
```

YAML에서는 wiki-link와 동일하게 **타이틀 또는 alias로** 적는다 (저자 인지 부담 0):

```yaml
parent: DBMS
prerequisites:
  - 데이터 독립성
  - 관계형 데이터 모델
```

해석은 `lib/wiki/backlinks.ts`의 alias map 재사용. 같은 맵이라 `[[wiki-link]]`와 의미가 1:1로 일치한다.

### 검증 규칙

`scripts/build-indexes.ts`의 빌드 시점 + `npm run check:content`에서 동일하게 적용.

| 위반 | 처리 | 이유 |
|---|---|---|
| `parent`가 존재하지 않는 페이지 참조 | **빌드 실패** | 깨진 트리로 사이트가 뜨면 안 됨 |
| `parent`가 다른 top-level 폴더 | **빌드 실패** | 결정 4에 의한 제약 |
| 사이클 (A→B→A) | **빌드 실패** | 트리·DAG 모두 위반 |
| `parent: 자기 자신` | **빌드 실패** | 자명한 오류 |
| `prerequisites`에 자기 자신 / 미존재 | **빌드 실패** | 자명한 오류 |
| `prerequisites`에 cross-folder | **경고** | 도구·인물 페이지가 선수지식일 수 있음 (예: SQL의 prereq에 `E.F. Codd` 가능) |

실패는 `process.exit(1)`로 빌드 자체를 중단. 메시지는 페이지 path와 위반 종류 포함:
```
✗ data/concepts/SQL.md: parent "관계형 데이터 모델" — OK
✗ data/concepts/foo.md: parent "존재안함" — 알 수 없는 페이지
✗ data/concepts/A.md: 사이클 감지 (A → B → A)
✗ data/concepts/SQL.md: parent "Oracle"이 cross-folder (entities/)
```

### 빌드 산출물 — `tree.json`

기존 `public/wiki-data/{backlinks,tags,search,manifest}.json`과 같은 위치에 `tree.json` 추가:

```ts
// public/wiki-data/tree.json
{
  "concepts": {
    "roots": ["concepts/데이터베이스", "concepts/데이터마이닝", ...],
    "children": {
      "concepts/데이터베이스": ["concepts/DBMS", "concepts/관계형 데이터 모델"],
      "concepts/DBMS": ["concepts/3단계 스키마"],
      "concepts/3단계 스키마": []
    },
    "parents": {
      "concepts/3단계 스키마": "concepts/DBMS",
      "concepts/DBMS": "concepts/데이터베이스"
    },
    "prerequisites": {
      "concepts/3단계 스키마": ["concepts/데이터 독립성"]
    }
  },
  "entities": { ... },
  "people": { ... },
  ...
}
```

`children`은 한글 `localeCompare`로 정렬. 100 페이지 기준 5KB 미만 예상.

### 새 모듈 — `lib/wiki/hierarchy.ts`

빌드 스크립트와 런타임 로더가 공유:

```ts
export interface HierarchyTree {
  roots: string[];
  children: Record<string, string[]>;
  parents: Record<string, string>;
  prerequisites: Record<string, string[]>;
}

export type VaultHierarchy = Record<string /* topLevelFolder */, HierarchyTree>;

export interface ValidationError {
  page: string;       // file path
  kind: "missing-parent" | "cross-folder-parent" | "cycle" | "self-parent"
       | "missing-prereq" | "self-prereq" | "cross-folder-prereq";
  detail: string;
}

export function buildHierarchy(pages: Page[], aliasMap: AliasMap): VaultHierarchy;
export function validateHierarchy(pages: Page[], aliasMap: AliasMap): ValidationError[];
```

### 런타임 로딩

- `lib/wiki/page-loader.ts`에 `getHierarchy()` 추가. `tree.json`을 읽어 모듈 메모리에 캐시 (현재 `pages` 캐시와 동일 패턴, Next.js 프로세스 수명 동안 유지).
- 서버 컴포넌트(`/wiki/page.tsx`, `/wiki/[...slug]/page.tsx`)에서 한 번 로드 → prop으로 내려줌.
- `predev` 훅이 이미 `build:indexes`를 돌리므로 dev 시작 시 자동 갱신. dev 도중 frontmatter 변경 시 재시작 필요 (현재 정책 동일).

### 사이드바 트리 (`components/layout/Sidebar.tsx`)

#### Props 변화
```ts
interface SidebarProps {
  pages: { slug: string; title: string; category: string }[];
  tree: VaultHierarchy;          // 추가
  currentSlug: string | null;
}
```

#### 렌더 동작
- 카테고리(top-level 폴더)별 섹션 헤더 유지 — 카테고리 자체는 트리가 아님 (결정 4).
- 각 카테고리 안에서 `tree[category].roots → children`을 따라 들여쓰기 트리 렌더.
- 자식이 있는 노드 앞에 disclosure indicator (`▸` 닫힘 / `▾` 열림). leaf는 indicator 없음.
- `parent`가 없는 페이지는 카테고리 바로 아래 root로 표시.

#### 펼침 정책
- **현재 페이지의 부모 체인은 자동 펼침** (`tree[category].parents`로 위로 거슬러 올라감).
- 그 외 노드는 기본 접힘.
- 사용자 토글 상태는 **`localStorage`에 보존** (`vf:sidebar:expanded:<slug>`). 페이지 이동·새 세션 모두 복원.
- 자동 펼침은 union — 사용자가 닫지 않은 상태는 그대로.

#### 정렬
- 같은 부모 아래 형제는 alphabetical (한글 `localeCompare`).
- 정렬 키 필드는 후속.

#### Fallback
- `tree.json`에 페이지가 없거나 (빌드 실패 직후 등) `tree`가 비어 있으면 카테고리 평면 리스트로 fallback. 사이드바가 통째로 죽지 않게.

#### SSR 안전성
- localStorage 의존 부분은 `useEffect`로 mount 후 hydrate. 첫 렌더는 "현재 페이지 부모 체인만 펼쳐진" 상태로 동기 결정 → 서버·클라이언트 첫 마크업 일치.

### 페이지 헤더 통합

세 개의 신규 컴포넌트는 **`components/wiki/WikiPage.tsx` 안에** 통합 (이미 article 헤더·본문·"GitHub 편집" 링크를 한 곳에서 다루므로 응집도가 가장 높음). `app/wiki/[...slug]/page.tsx`는 prop만 추가로 내려준다.

`WikiPage` 내부 컴포지션 (위→아래):

```
<article>
  [Breadcrumb]                  ← 신규
  <header>
    <h1>{title}</h1>            ← 기존
    updated · tags              ← 기존
  </header>
  [video iframe]                ← 기존, video 있을 때만
  [Prerequisites]               ← 신규, prereqs 있을 때만
  <div className="prose">
    [본문 markdown 렌더]         ← 기존
  </div>
  [ChildPages]                  ← 신규, children 있을 때만
  [GitHub 편집 링크]              ← 기존
  [slug 표시]                   ← 기존
</article>
```

`app/wiki/[...slug]/page.tsx`의 다른 영역(`GiscusEmbed`는 main 끝, `TableOfContents`·`Backlinks`·`RelatedQA`는 right rail)은 모두 그대로.

#### Breadcrumb (`components/wiki/Breadcrumb.tsx`)

```
Wiki › Concepts › 데이터베이스 › DBMS › 3단계 스키마
```

- `tree[category].parents`를 따라 루트까지 거슬러 올라가 `[루트, …, 부모]` 체인 생성.
- 마지막 항목은 현재 페이지 title (비링크, `text-primary`).
- 부모 체인 없는 페이지: `Wiki › Concepts › <현재 title>` (탐색 컨텍스트는 항상 보여줌).
- 시각: 작은 텍스트, `›` 구분자, `text-secondary`.
- 모바일에서 길어지면 가로 스크롤 (잘라내지 않음).

```ts
interface BreadcrumbProps {
  chain: { slug: string | null; title: string }[];  // 마지막 = 현재, slug=null
}
```

#### Prerequisites (`components/wiki/Prerequisites.tsx`)

- `prerequisites`가 비어 있으면 **null 반환** (박스 자체 숨김).
- `vf-card` 변형 + 좌측 accent 보더 (`--accent-cta`).
- 헤더 카피: "**먼저 보면 좋아요**" (style-guide.md의 친근 톤).
- 각 항목: title 링크. (한 줄 요약은 후속.)

```ts
interface PrerequisitesProps {
  items: { slug: string; title: string }[];
}
```

#### ChildPages (`components/wiki/ChildPages.tsx`)

- `tree[category].children[currentSlug]`로 자식 목록.
- 비면 **null 반환** (섹션 숨김).
- 헤더: `## 이 개념을 더 깊게 다루는 글`.
- 각 항목: title 링크. (한 줄 요약 후속.)

```ts
interface ChildPagesProps {
  items: { slug: string; title: string }[];
}
```

#### Title 룩업
세 컴포넌트 모두 slug → title 매핑이 필요. 페이지 컴포넌트가 `getAllPages()`에서 한 번 만들어 props로 내려준다 (서버 컴포넌트, 캐시 활용).

### `/wiki` 인덱스 페이지 (`app/wiki/page.tsx`)

#### 변경 후 — 카테고리 카드 안에서 **2단 깊이 트리**

```
┌─ Concepts ──────────────────────────────────────────┐
│                                                     │
│  데이터베이스                                       │
│    DBMS · 관계형 데이터 모델 · 데이터 독립성 · 키  │
│                                                     │
│  데이터마이닝                                       │
│    분류 · 클러스터링 · 연관규칙마이닝 · …           │
│                                                     │
│  · 차원의 저주 · LLM Wiki Pattern · …               │
│  (parent 없는 페이지들 — 마지막에 평면 묶음)        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

#### 결정
- **루트 + 즉시 자식 (2단계)만**. 손주는 노출 안 함 — 보고 싶으면 루트 클릭 → 페이지의 `ChildPages` 섹션에서 다시 펼침.
- 루트 = 큰 글씨 + 링크. 자식들은 그 아래 줄에 작은 글씨, `·`로 구분된 인라인 리스트.
- 자식 없는 root는 한 줄.
- **`parent` 없는 페이지들**은 카테고리 카드 맨 아래에 별도 평면 묶음 — "아직 어디에도 못 붙인 개념" 영역. 마이그레이션 진행도가 시각적으로 드러난다.
- 카테고리에 페이지가 없으면 카드 숨김 (현재 동작 유지).
- 헤더 카드 우측의 `그래프뷰 →` 버튼은 그대로.

#### 구현
새 컴포넌트는 만들지 않고 `app/wiki/page.tsx` 내부에서 처리. 단순함 우선.

### 의도적 비대칭 (인덱스 vs 사이드바)

같은 데이터를 쓰지만 의도가 다름:

- **사이드바**: 모든 깊이 표현, 접고 펼침, 탐색 도구.
- **인덱스**: 표층 구조 일별, 펼침 없음, "이 주제에 뭐가 있구나" 한 번 보기.

## Migration

**원칙: 인프라 ≠ 어노테이션 분리.** 한 PR에 다 묶지 않는다.

### Phase 1 — 인프라 (이 spec 구현)

- 위 모든 변경 (스키마·빌드·UI) 머지.
- `parent` / `prerequisites`는 전부 optional이므로 어노테이션 0개여도 빌드 성공.
- 모든 페이지가 root로 표시 = 현재 평면 동작과 동일. **회귀 없음**.

### Phase 2 — 어노테이션 (이 spec 구현 마지막 단계, 별도 커밋)

- 모든 `concepts/` 페이지의 본문 "관련" 섹션과 wiki-link 분석 → `parent` / `prerequisites` 매핑 초안을 markdown 표로 제출 → 사용자 검토·승인.
- 승인된 매핑을 일괄 적용하는 별도 커밋 (vibeforge-wiki submodule에 PR).
- 명확하지 않은 페이지는 root로 두고 후속 PR에서 추가. `/wiki` 인덱스의 "parent 없는 묶음"이 남은 작업을 가시화.

### 후속 (이 spec 밖)

- `entities/`·`people/`·기타 폴더 어노테이션.
- 한 줄 요약·정렬키·그래프 DAG 강화.

## Testing

### 단위 (vitest)

- `lib/wiki/hierarchy.test.ts`
  - `buildHierarchy` 정상 케이스 (단일·다층 트리, 형제 정렬).
  - `validateHierarchy` 케이스: 사이클 / cross-folder parent / 미존재 parent / self-parent / 미존재 prereq / cross-folder prereq (경고만).
- `components/wiki/Breadcrumb.test.tsx` — 부모 체인 / parent 없는 경우 / 클릭 링크.
- `components/wiki/Prerequisites.test.tsx` — 항목 렌더 / 비면 null.
- `components/wiki/ChildPages.test.tsx` — 항목 렌더 / 비면 null.
- `components/layout/Sidebar.test.tsx` (확장) — 트리 들여쓰기 / 현재 페이지 부모 체인 자동 펼침 / fallback 평면 모드.

### E2E (playwright)

`tests/e2e/wiki-hierarchy.spec.ts` 신규:

1. 사이드바에서 `데이터베이스` 펼침 → `DBMS` 클릭 → `DBMS` 페이지 진입.
2. `DBMS` 페이지의 브레드크럼이 `Wiki › Concepts › 데이터베이스 › DBMS` 표시.
3. `3단계 스키마`로 이동 → 선수지식 박스에 `데이터 독립성` 표시 + 클릭 시 해당 페이지로.
4. `데이터베이스` 페이지의 자식 목록 섹션에 `DBMS`, `관계형 데이터 모델` 등 표시.
5. 사이드바 펼침 토글 후 새로고침 → 상태 복원 (localStorage).

### 빌드 검증

- ad-hoc 픽스처로 `npm run check:content`가 사이클 / cross-folder / 미존재 케이스에서 실패하는지 확인.
- CI에서 자동 실행.

## Known Risks

1. **localStorage SSR 미스매치** — Sidebar는 `useEffect`로 mount 후 hydrate. 첫 렌더는 "현재 페이지 부모 체인만 펼쳐진" 상태로 결정해 서버·클라이언트 첫 마크업이 일치하도록.
2. **모바일 깊은 트리** — 깊이 4단계 이상이면 들여쓰기 가독성 저하. 현재 도메인 최대 깊이 3 예상이라 문제 없음. 깊어지면 깊이별 indent 단위 조정.
3. **`tree.json` 사이즈** — 100 페이지 기준 5KB 미만. `manifest.json`과 같은 수준.
4. **저자가 `parent` vs `prerequisites` 헷갈림** — 콘텐츠 repo의 `CONTRIBUTING.md`에 한 단락 가이드 추가 (이 spec 구현 시 함께).

## Files Touched

### Site repo (`D:/Education/`)
- `lib/wiki/types.ts` — `PageFrontmatter`에 `parent`, `prerequisites` 추가.
- `lib/wiki/frontmatter.ts` — 두 필드 파싱.
- `lib/wiki/hierarchy.ts` — **신규**. `buildHierarchy`, `validateHierarchy`.
- `lib/wiki/page-loader.ts` — `getHierarchy()` 추가.
- `scripts/build-indexes.ts` — `tree.json` 생성, 검증 실패 시 exit 1.
- `scripts/check-content.ts` — `validateHierarchy` 호출 추가.
- `scripts/check-content.test.ts` — hierarchy 검증 케이스 추가.
- `components/layout/Sidebar.tsx` — 트리 렌더, localStorage 펼침 상태.
- `components/layout/Sidebar.test.tsx` — 트리 케이스 추가.
- `components/wiki/Breadcrumb.tsx` — **신규**.
- `components/wiki/Breadcrumb.test.tsx` — **신규**.
- `components/wiki/Prerequisites.tsx` — **신규**.
- `components/wiki/Prerequisites.test.tsx` — **신규**.
- `components/wiki/ChildPages.tsx` — **신규**.
- `components/wiki/ChildPages.test.tsx` — **신규**.
- `app/wiki/page.tsx` — 인덱스 카드를 2단 트리로.
- `components/wiki/WikiPage.tsx` — Breadcrumb · Prerequisites · ChildPages 통합 (위 다이어그램).
- `app/wiki/[...slug]/page.tsx` — `getHierarchy()` 호출 후 새 props (`tree`, `titleMap`) 전달.
- `tests/e2e/wiki-hierarchy.spec.ts` — **신규**.

### Content repo (`content/` submodule)
- `concepts/*.md` 일괄 — Phase 2에서 어노테이션 추가 (별도 PR).
- `CONTRIBUTING.md` — `parent` / `prerequisites` 작성 가이드 한 단락.

## Acceptance Criteria

- [ ] `npm run build:indexes`가 `public/wiki-data/tree.json`을 생성한다.
- [ ] frontmatter에 `parent` 또는 `prerequisites`가 없는 상태에서 모든 빌드·테스트가 통과한다 (회귀 없음).
- [ ] 사이클·cross-folder parent·미존재 parent를 가진 픽스처에서 `npm run build:indexes`와 `npm run check:content`가 둘 다 실패한다.
- [ ] `concepts/3단계 스키마` 페이지(어노테이션 후)에서:
  - 사이드바에 `데이터베이스 > DBMS > 3단계 스키마` 트리가 보이고 현재 페이지가 강조됨.
  - 페이지 상단에 브레드크럼 `Wiki › Concepts › 데이터베이스 › DBMS › 3단계 스키마`.
  - 선수지식 박스에 `데이터 독립성`.
- [ ] `concepts/데이터베이스` 페이지에서 본문 끝에 자식 목록 섹션이 보인다.
- [ ] `/wiki` 인덱스에서 Concepts 카드가 2단 트리(루트 + 인라인 자식) + 맨 아래 "parent 없는 묶음"으로 렌더된다.
- [ ] 사이드바 펼침 토글 후 새로고침 시 상태가 복원된다.
- [ ] 단위·E2E 테스트 모두 통과.
