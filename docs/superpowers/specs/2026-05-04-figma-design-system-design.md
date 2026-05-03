# Figma 디자인 시스템 마이그레이션 — 디자인

**작성일**: 2026-05-04
**대상 repo**: `vibeforge-site` (이 저장소)
**참조 디자인**: `docs/design.md` (Figma 마케팅 사이트 디자인 토큰·컴포넌트 추출)

## 목표

VibeForge 사이트의 비주얼 시스템을 `docs/design.md`가 정의한 Figma 디자인 어휘로 정렬한다. 핵심은 두 가지:

1. **컴포넌트 일관성** — 모든 버튼·카드·섹션이 동일한 토큰 셋과 동일한 형태 어휘(필 버튼, 색 블록, mono eyebrow)를 따르도록 강제
2. **다크 모드 지원** — `prefers-color-scheme` 자동 감지로 시스템 설정에 동조

페이지 레이아웃 자체는 재설계하지 않는다 (별도 작업).

## 핵심 결정 (브레인스토밍 결과)

| 결정 항목 | 선택 | 근거 |
|---|---|---|
| 적용 강도 | **B. 하이브리드** | Figma의 컴포넌트 시스템(필 버튼·색 블록·mono eyebrow·8px 그리드·가는 weight)은 도입하되, 현재의 보라/핑크 그라디언트 accent는 브랜드 정체성으로 보존 |
| 폰트 스택 | **C. Geist + Pretendard Variable + Geist Mono** | Geist는 라틴 글리프에서 Figma 톤에 가장 근접 (Vercel 산), 한글은 Pretendard Variable(가는 weight 지원), 코드/eyebrow는 Geist Mono |
| 다크 모드 전략 | **B. 깊은 색조 (Deep Tint)** | 색 블록 자체를 어두운 채도 버전으로 치환 (lilac → deep purple, pink → deep magenta). 라이트와 1:1 토큰 페어로 매핑 |
| 다크 모드 토글 | **A. 시스템 설정만** | `prefers-color-scheme` 미디어 쿼리만 사용. 토글 버튼·localStorage 없음 → JS 없음 → 하이드레이션 이슈 없음 |
| 구현 접근법 | **2. Token + Primitive 컴포넌트** | 토큰은 한 군데서 관리, primitive가 변형을 강제. 페이지 재설계는 별도 PR로 미룸 |

## 아키텍처 — 3-Layer

```
┌─────────────────────────────────────────────────────────┐
│ Layer 3: Consumer                                        │
│  AppShell, SiteHeader, 포럼/위키 컴포넌트, 페이지         │
│  → primitive를 import하여 사용. 인라인 색·간격 X         │
└──────────────────────────┬──────────────────────────────┘
                           │ uses
┌──────────────────────────▼──────────────────────────────┐
│ Layer 2: Primitive (components/ui/)                      │
│  Pill, ColorBlock, Card, Eyebrow, IconButton, TextInput  │
│  → variant prop만 받음. 토큰 값을 prop으로 안 받음       │
└──────────────────────────┬──────────────────────────────┘
                           │ consumes via Tailwind utilities
┌──────────────────────────▼──────────────────────────────┐
│ Layer 1: Token (lib/design/tokens.css)                   │
│  CSS 변수 + Tailwind 4 @theme 등록                       │
│  다크 모드는 @media (prefers-color-scheme: dark) 1군데   │
└─────────────────────────────────────────────────────────┘
```

**원칙**:
- Layer 1을 바꾸면 모든 primitive·consumer가 자동 반영
- 다크 모드 분기는 Layer 1에만 존재. Layer 2·3에는 다크 분기 코드 0줄
- primitive는 토큰 값을 prop으로 받지 않음 — 시스템 외 조합을 원천 차단

## 토큰 시스템

### 색 (Color)

라이트·다크 페어로 정의. 다크 변형은 `@media (prefers-color-scheme: dark)` 블록 안에서 같은 변수명에 새 값 할당.

```css
:root {
  /* Brand — 보라/핑크 그라디언트 (current 정체성 보존) */
  --brand-from: #7c3aed;          /* purple-600 */
  --brand-to:   #3b82f6;          /* blue-500  */
  --brand-gradient: linear-gradient(135deg, var(--brand-from), var(--brand-to));

  /* Surface */
  --canvas:        #ffffff;
  --surface-soft:  #f9fafb;
  --hairline:      #e5e7eb;
  --hairline-soft: #f3f4f6;

  /* Ink (text) */
  --ink:          #1f2937;
  --ink-inverse:  #ffffff;
  --ink-muted:    #6b7280;        /* eyebrow 보조용. 본문 mid-gray 금지 (Figma do/don't) */

  /* Color blocks — 라이트 파스텔 (보라 계열로 치환) */
  --block-lilac:  #ede9fe;
  --block-mint:   #d1fae5;
  --block-cream:  #fef3c7;
  --block-pink:   #fce7f3;
  --block-navy:   #1e1b4b;        /* dark variant: 라이트에서도 어두움 */

  /* Semantic */
  --semantic-success: #10b981;
  --accent-magenta:   #ec4899;     /* promo CTA 1회용 */
  --overlay-scrim:    rgba(0,0,0,0.6);
}

@media (prefers-color-scheme: dark) {
  :root {
    --canvas:        #14111e;
    --surface-soft:  #1c1828;
    --hairline:      rgba(255,255,255,0.08);
    --hairline-soft: rgba(255,255,255,0.04);

    --ink:          #ede8f5;
    --ink-inverse:  #14111e;
    --ink-muted:    #9ca3af;

    --block-lilac:  #3b2360;       /* deep purple */
    --block-mint:   #1f3d3a;       /* deep teal */
    --block-cream:  #3d3520;       /* deep amber */
    --block-pink:   #4a1d3f;       /* deep magenta */
    --block-navy:   #14111e;       /* navy = canvas in dark */

    --semantic-success: #34d399;
    --accent-magenta:   #f472b6;
    --overlay-scrim:    rgba(0,0,0,0.75);
  }
}
```

### 타이포

Geist + Geist Mono는 `next/font/google`로 로드 (CSS 변수로 노출: `--font-geist`, `--font-geist-mono`). Pretendard Variable은 `public/fonts/`에 self-host + `@font-face`로 `Pretendard Variable` 패밀리 등록.

```css
:root {
  /* 폰트 스택 — Geist는 next/font가 주입하는 CSS 변수 사용 */
  --font-sans: var(--font-geist), "Pretendard Variable", system-ui, -apple-system, sans-serif;
  --font-mono: var(--font-geist-mono), "JetBrains Mono", "SF Mono", monospace;

  /* Weight — 가는 단위로 미세 조정 (Figma 변형 weight 모방) */
  --w-thin:     320;
  --w-light:    330;
  --w-regular:  340;
  --w-medium:   480;
  --w-semibold: 540;
  --w-bold:     700;

  /* Size + line-height + letter-spacing 묶음 (Tailwind 4 text utility로 등록) */
  --t-display-xl:  86px;   /* 1.0  / -1.72px */
  --t-display-lg:  64px;   /* 1.10 / -0.96px */
  --t-headline:    26px;   /* 1.35 / -0.26px */
  --t-subhead:     26px;   /* 1.35 / -0.26px (다른 weight) */
  --t-card-title:  24px;   /* 1.45 /  0     */
  --t-body-lg:     20px;   /* 1.40 / -0.14px */
  --t-body:        18px;   /* 1.45 / -0.26px */
  --t-body-sm:     16px;   /* 1.45 / -0.14px */
  --t-button:      20px;   /* 1.40 / -0.10px */
  --t-eyebrow:     18px;   /* 1.30 / +0.54px (mono) */
  --t-caption:     12px;   /* 1.00 / +0.60px (mono) */
}
```

모바일에서 `--t-display-xl`은 48px로 축소 (반응형 미디어 쿼리).

### 간격 & Radius

```css
:root {
  /* 8px base */
  --s-hair:    1px;
  --s-xxs:     4px;
  --s-xs:      8px;
  --s-sm:      12px;
  --s-md:      16px;
  --s-lg:      24px;
  --s-xl:      32px;
  --s-xxl:     48px;
  --s-section: 96px;

  /* Radius */
  --r-xs:   2px;
  --r-sm:   6px;
  --r-md:   8px;
  --r-lg:   24px;
  --r-xl:   32px;
  --r-pill: 50px;
  --r-full: 9999px;
}
```

### Tailwind 4 통합

`tokens.css` 안에 `@theme` 블록으로 같은 변수를 Tailwind에 등록 → `bg-canvas`, `text-ink`, `font-weight-light`, `rounded-pill`, `text-body-sm` 등 유틸 자동 생성.

```css
@theme {
  --color-canvas: var(--canvas);
  --color-ink: var(--ink);
  --color-block-lilac: var(--block-lilac);
  /* ... */
  --radius-pill: var(--r-pill);
  --spacing-section: var(--s-section);
  /* ... */
}
```

## Primitive 컴포넌트

신규 디렉토리: `components/ui/`

### 시그니처

```tsx
// components/ui/Pill.tsx
type PillProps = {
  variant?: "primary" | "secondary" | "magenta";
  size?: "default" | "sm";
  href?: string;          // 있으면 next/link <Link>로 렌더, 없으면 <button>
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>;

// components/ui/ColorBlock.tsx
type ColorBlockProps = {
  variant: "lilac" | "mint" | "cream" | "pink" | "navy";
  as?: "section" | "div";                  // 기본 "section"
  children: ReactNode;
};

// components/ui/Card.tsx
type CardProps = {
  variant?: "default" | "soft";            // default = canvas + hairline border
  children: ReactNode;
};

// components/ui/Eyebrow.tsx
type EyebrowProps = { children: ReactNode };
// → 자동으로 mono · uppercase · letter-spacing +0.54px 적용

// components/ui/IconButton.tsx
type IconButtonProps = {
  variant?: "default" | "inverse";
  "aria-label": string;                    // 필수
  children: ReactNode;                     // icon
} & ButtonHTMLAttributes<HTMLButtonElement>;

// components/ui/TextInput.tsx
type TextInputProps = InputHTMLAttributes<HTMLInputElement>;
// → variant 없음. focus는 ring 한 종류로 통일
```

### 디렉토리 구조

```
components/ui/
├── Pill.tsx          + Pill.test.tsx
├── ColorBlock.tsx    + ColorBlock.test.tsx
├── Card.tsx          + Card.test.tsx
├── Eyebrow.tsx
├── IconButton.tsx    + IconButton.test.tsx
├── TextInput.tsx     + TextInput.test.tsx
└── index.ts          // re-export
```

### 의도적으로 만들지 않는 것

- ❌ `Heading` / `Body` / `Text` 컴포넌트 — 그냥 `<h1 class="text-display-xl">`, `<p class="text-body">` 사용
- ❌ `Section` 컴포넌트 — `<section>` + Tailwind 유틸
- ❌ Modal / Dialog / Toast — 현재 사이트에 사용처 없음. 필요 시 별도 PR

## 다크 모드 동작

- **감지**: `@media (prefers-color-scheme: dark)` 만 사용. JavaScript 없음, theme provider 없음, localStorage 없음
- **토글 UI**: 없음. OS 설정 따름
- **하이드레이션**: CSS-only이므로 SSR/CSR 미스매치 0
- **flash 방지**: CSS 변수 자체가 다크에서 다른 값을 갖도록 정의되어 있으므로 첫 페인트부터 다크. FOUC(flash of unstyled content) 없음
- **이미지·아이콘**: 현재 사이트에 다크 전용 이미지가 필요한 곳 없음 (아이콘은 currentColor 사용)
- **giscus 댓글 위젯**: giscus 자체가 dark 테마 지원 → embed 시 `theme="preferred_color_scheme"` prop 전달
- **graph view (sigma.js)**: 노드/엣지 색을 토큰 변수로 바꿔서 다크 자동 반영

## 마이그레이션 계획

PR 단위로 5개로 분할. 각 단계는 `npm run typecheck && npm test && npm run build`가 모두 통과해야 다음 단계로.

### PR 1 — 토큰 + 폰트
- `lib/design/tokens.css` 전면 재작성
- `app/layout.tsx`에 `next/font/google`로 Geist + Geist Mono 추가
- `public/fonts/`에 Pretendard Variable woff2 추가, `tokens.css`의 `@font-face`로 등록
- `unicode-range`로 라틴은 Geist, 한글은 Pretendard fallback 명시
- 기존 `--bg-gradient`, `--surface-card` 등 변수는 임시로 새 토큰을 가리키는 alias 유지 → 후속 PR이 안전하게 진행

### PR 2 — Primitive 6개
- `components/ui/` 디렉토리 생성, 6개 컴포넌트 + 테스트
- `index.ts` re-export
- 어떤 consumer도 아직 사용 안 함 (별개 PR)

### PR 3 — 다크 활성화 + 외부 컴포넌트 동조
- 다크 토큰 페어는 PR 1에 이미 포함됨 — 이 PR은 **외부 의존**의 다크 테마 동조에 집중
- `GiscusEmbed`의 `theme` prop을 `"preferred_color_scheme"` 으로 변경 (giscus 자체 다크 모드 트리거)
- `GraphViewInner`의 sigma.js 노드·엣지·라벨 색을 토큰 변수로 교체 → 다크 모드 자동 반영
- `e2e` 다크 스크린샷 baseline 첫 생성

### PR 4 — Consumer 마이그레이션
4개 sub-step (각각 별도 commit, 같은 PR):
- 4a: `AppShell` + `SiteHeader` → `Pill` 적용
- 4b: forum 컴포넌트 (PostList, PostDetail, NewPostForm, CommentList) → `Pill` + `Card`
- 4c: wiki `Backlinks`, `RelatedQA`, `TableOfContents` → `ColorBlock`
- 4d: 랜딩(`app/page.tsx`) + `app/about/page.tsx` → `Pill` + `ColorBlock` 1~2개

### PR 5 — Cleanup
- `vf-card` 글로벌 클래스 제거
- PR 1의 임시 alias 변수 제거
- 산재된 button 클래스, ad-hoc CSS 정리
- `npm run lint`, typecheck, test 모두 통과

## 테스트 전략

| 레벨 | 도구 | 범위 |
|---|---|---|
| Unit | Vitest + React Testing Library | primitive 6개: 모든 variant 렌더, props 전달, a11y(role/aria) |
| 회귀 | Vitest | 기존 `*.test.tsx` 전부 PR 5 후에도 통과 |
| 시각 | Playwright | 핵심 경로 6개 × {light, dark} 스크린샷: `/`, `/wiki`, `/wiki/concepts/데이터베이스`, `/forum`, `/forum/qa`, `/about` |
| 수동 | dev | OS 테마 토글 → 다크 시각 확인. GitHub OAuth 로그인. 새 글 작성 1회. wiki graph 페이지 다크에서 가독성 확인 |

Playwright 스크린샷은 `tests/e2e/visual/` 하위에 baseline. PR 4·5에서 baseline 갱신 의도적.

## Out of Scope

이번 작업에서 **명시적으로 안 하는 것**:

- ❌ 페이지 레이아웃 재설계 (접근법 3 — 색 블록 리듬으로 랜딩·forum 인덱스 재배치) → 별도 spec
- ❌ 새 breakpoint·반응형 변경
- ❌ 애니메이션·모션 디자인 (Figma의 marquee 스크롤·color block 등장 애니메이션)
- ❌ 다크 모드 토글 버튼 (system-only로 결정)
- ❌ Modal/Toast/Dialog primitive (사용처 없음)
- ❌ 신규 페이지·기능
- ❌ giscus·sigma.js 자체 기능 변경 (테마만 토큰화)

## 위험 요소

| 위험 | 완화 |
|---|---|
| Tailwind 4 `@theme` 토큰 네이밍 호환 안 됨 | PR 1에서 build 통과 검증. 안 되면 토큰 prefix만 `--color-` 형태로 강제 |
| Pretendard Variable woff2 크기 (~1MB) | `font-display: swap` + 한글 subset (KS X 1001 기본 영역만 추출) 검토. 안 되면 Geist만 라틴 default + 한글은 system font fallback 임시 허용 |
| Geist에 한글 글리프 없음 → 폰트 fallback 트리거 안 되면 깨짐 | CSS `unicode-range`로 라틴 코드포인트만 Geist에 할당, 나머지는 Pretendard로 자동 fallback |
| 다크 모드에서 graph view 노드 색 가독성 저하 | sigma.js 노드 색을 토큰 변수로 바꿔서 다크 페어 정의. PR 3 수동 QA 항목 |
| 기존 `.prose` 스타일이 새 토큰과 충돌 | PR 1에서 `.prose` 안의 색 변수를 새 토큰으로 명시 매핑 |

## Known Gaps

- 모바일 색 블록 동작 (`docs/design.md`는 768px 이하에서 색 블록 풀-블리드를 권장) — primitive 단계에서는 데스크톱 동작만 정의. 모바일 풀-블리드는 향후 페이지 재설계 PR에서 처리
- 폼 에러 상태 스타일 — 디자인 문서에도 미정의. 현재 사용처도 없음. 필요 시 별도 작업
- `accent-magenta` promo 사용처 — 사이트에 promo banner 없음. 토큰만 정의하고 사용 보류
