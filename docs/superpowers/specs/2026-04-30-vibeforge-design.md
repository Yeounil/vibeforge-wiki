# VibeForge — Design Spec

- **Date:** 2026-04-30
- **Status:** DRAFT
- **Branch:** master
- **Predecessor:** `DESIGN.md` (/office-hours, 2026-04-30) — Quartz route 폐기, 본 spec으로 대체
- **Brainstormed via:** `superpowers:brainstorming`

## TL;DR / Vision

**VibeForge**는 바이브코더 — AI(Cursor / Claude Code / Copilot)로 코딩을 시작한 비전공자 — 가 *AI에게 시키는 단계에서 한 걸음 더 나아가도록* 돕는 CS 학습·토론 사이트다.

세 가지가 사이트 안에서 한 사이클을 만든다:

1. **Wiki** — 큐레이트된 CS 지식 (vault 시드 + 외부 PR 기여)
2. **Forum (Q&A 핀 카테고리 + 일반 + 공지)** — 실전 시나리오에서 출발하는 토론
3. **Wiki ↔ Q&A 양방향 백링크** — 실전 질문이 정제된 지식과 연결되어 학습 사이클이 사이트 *안*에서 닫힌다

Quartz로 발행하던 1인 노트 모델을 폐기하고, **외부인이 PR로 위키에 기여**할 수 있는 큐레이트된 오픈 위키 + Next.js 풀 사이트로 전환한다.

## Audience & Tone

- **오디언스:** 바이브코더. AI로 코드는 짜지만 *왜 그렇게 짜는지* 이해하고 싶은 비전공자.
- **콘텐츠 톤:** "친근한 라벨, 진중한 알맹이." 카테고리는 친근하게 부드럽게(`데이터 다루기`, `컴퓨터는 어떻게 일하나`, `코드 흐름`), 페이지 내용은 vault 원본의 CS 깊이를 유지.
- **시각 톤:** `design.png` 참조 — 보라/핑크 그라데이션 배경, 화이트 카드, 컬러 코딩 카테고리, 모던 sans-serif. 활기 있되 가볍지 않음.

## Decision Recap

| Item | Decision |
|---|---|
| Site name | **VibeForge** |
| Stack | Next.js 15 (App Router) + React 19 + TypeScript + Tailwind |
| Content type | 위키 메인. 영상은 페이지 임베드 보조 (day-1엔 영상 0개) |
| Wiki features | Full LLM-WIKI: `[[wiki-link]]`, 백링크, 그래프뷰, 검색, 태그 |
| Vault import | 빌드 타임 정적 변환 (vault repo → site build) |
| Repo structure | **분리**: `vibeforge-site` + `vibeforge-wiki` |
| 외부 기여 | wiki repo PR 워크플로우. trusted contributors는 Collaborator로 직접 push |
| Main nav | `Wiki / Forum / About` |
| Wiki IA | 친근 라벨 카테고리 (B안) |
| Forum 카테고리 | Q&A (핀, 시나리오 태그) + 일반 + 공지 |
| Forum 포맷 | 글 + 댓글 (추천/채택 없음, day-1 minimal) |
| 페이지 댓글 | giscus (모든 wiki/forum 페이지) |
| Wiki ↔ Q&A 연결 | 양방향 백링크 (자동, 본문 링크 인식) |
| Auth | Supabase Auth + GitHub OAuth (forum); GitHub 자체 (wiki edit/PR) |
| DB | Supabase Cloud Postgres (무료 tier로 시작) |
| Deploy | Vercel |
| Layout | 3-column (카테고리 / 본문 / 컨텍스트) |

## Architecture

### Repo Structure

```
vibeforge-site/                 # Next.js 사이트 코드
├── app/                        # App Router
│   ├── (marketing)/            # /, /about, /about/contribute
│   ├── wiki/                   # /wiki, /wiki/[...slug], /wiki/graph, /wiki/tag/[tag]
│   ├── forum/                  # /forum, /forum/[category], /forum/post/[id], /forum/new
│   ├── api/                    # Route Handlers (Supabase 프록시)
│   └── auth/                   # Supabase Auth callback
├── lib/
│   ├── wiki/                   # 빌드 타임 vault 처리 (parser, backlinks, graph, search index)
│   ├── forum/                  # Supabase 클라이언트 + Server Actions
│   └── design/                 # frontend-design skill 산출물 적용
├── components/
├── content/                    # ← 빌드 시 vibeforge-wiki에서 fetch (submodule or CI script)
├── public/
└── design.png                  # 시각 reference asset (이 spec의 동반 자료)

vibeforge-wiki/                 # Vault — Markdown 콘텐츠만
├── data/
│   ├── data-handling/          # 친근 라벨 카테고리 (vault 폴더 = 사이트 카테고리)
│   ├── how-computers-work/
│   └── code-flow/
├── CONTRIBUTING.md             # 기여 규칙 — 사이트 /about/contribute에 미러됨
├── style-guide.md              # 바이브코더 톤 가이드 (예시 포함)
├── .github/
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── ISSUE_TEMPLATE/
└── README.md
```

**Rationale (분리):** vault repo가 *콘텐츠의 단일 진실 원천*이 됨. 사이트 코드 변경 없이도 누구나 콘텐츠에 PR 가능. 사이트와 콘텐츠의 라이프사이클이 다름 — 사이트는 가끔 deploy, vault는 자주 commit.

### Build Pipeline (Wiki)

1. **Vault fetch:** Vercel 빌드 시 `vibeforge-wiki`를 git submodule로 update (`content/` 경로). submodule pinning으로 콘텐츠 버전이 사이트 빌드와 일치 보장. wiki repo main에 push 시 site repo의 submodule pointer 업데이트 → site rebuild webhook.
2. **Parse:** `unified` + `remark` + `rehype` 파이프라인
   - `gray-matter` — frontmatter:
     - `title` (string)
     - `tags` (string[])
     - `aliases` (string[]) — `[[wiki-link]]` 매칭 시 별칭으로 인식
     - `video` (string | null) — YouTube URL. 있으면 페이지 상단에 `<iframe>` 임베드 (lite-youtube-embed로 lazy)
     - `updated` (ISO date string)
   - `remark-wiki-link` (또는 자작 plugin) — `[[Page Name]]` → `<Link href="/wiki/...">` (별칭 / 누락 페이지 처리 포함)
   - `remark-gfm` — GFM 테이블, 체크박스, strikethrough
3. **Indexing (build-time):**
   - **Backlink graph:** 모든 페이지 스캔 → `{ slug → [referenced_by_slug...] }` 맵. JSON으로 dump.
   - **Tag index:** `{ tag → [slug...] }`. JSON.
   - **Graph data:** `{ nodes: [{id, label, group}], edges: [{from, to}] }`. JSON, lazy load.
   - **Search index:** `MiniSearch` 또는 `FlexSearch` 인덱스 빌드 → JSON. 클라이언트 사이드 검색.
4. **Render:** 정적/ISR Next.js 페이지로 빌드.

### Forum (Supabase)

**Tables (간략):**

```sql
posts (
  id uuid pk, category text check in ('qa','general','notice'),
  title text, body_md text, author_id uuid fk users,
  created_at, updated_at, tags text[]
)

comments (
  id uuid pk, post_id uuid fk posts,
  body_md text, author_id uuid fk users,
  created_at, updated_at
)

qa_wiki_refs (
  post_id uuid fk posts, wiki_slug text,
  primary key (post_id, wiki_slug)
)

-- users는 Supabase Auth가 관리. profiles에 github_login, avatar_url 미러
profiles (
  id uuid pk fk auth.users,
  github_login text, display_name text, avatar_url text,
  role text not null default 'user' check (role in ('user','admin'))
)
```

**RLS 정책:**
- `posts`, `comments`: 누구나 SELECT. INSERT/UPDATE는 `auth.uid() = author_id`. DELETE는 본인 또는 `profiles.role = 'admin'`.
- `notice` 카테고리는 `profiles.role = 'admin'`만 INSERT (RLS 정책에 join 또는 SECURITY DEFINER 함수 사용).
- `qa_wiki_refs`: server-side(Service role)에서만 write. read는 누구나.

**API:** Next.js Server Actions로 forum CRUD. 브라우저는 Supabase JS SDK 직접 사용 안 함 (서버 경유).

### Wiki ↔ Q&A 양방향 백링크

- **Q&A 글 작성/수정 시** (Server Action):
  1. body_md에서 `/wiki/<slug>` 형태 링크 추출
  2. `qa_wiki_refs` 테이블에 (post_id, wiki_slug) upsert. 기존 ref 중 본문에 없어진 것 삭제.
- **Wiki 페이지 렌더 (ISR, revalidate=60s):**
  - `qa_wiki_refs` where wiki_slug = 현 페이지 → 관련 Q&A 리스트
  - 페이지 하단 `<RelatedQA>` 섹션
- **Q&A 페이지 렌더:**
  - `qa_wiki_refs` where post_id = 현 글 → 본문이 인용한 wiki 페이지 리스트
  - 페이지 사이드/하단 `<RelatedWiki>` 섹션
- **Day-1 자동 메커니즘만.** 콘텐츠 승격(Q&A → Wiki)은 운영자 수동 (out of scope v1).

### giscus (페이지 댓글)

- **`/wiki/...` 페이지 하단에만** 임베드. Forum 글은 자체 `comments` 테이블이 있으므로 giscus 중복 제거.
- GitHub Discussions 카테고리 = `Page Comments`.
- mapping: `pathname`.
- 의미: giscus는 *위키 콘텐츠에 대한 즉석 토론*. 더 본격적인 질문은 Forum Q&A로 유도 (위키 페이지에 "Q&A에 묻기" CTA).

### 외부 기여 (Wiki PR Workflow)

- `vibeforge-wiki` repo는 **public**.
- **Anonymous 외부인:** GitHub fork → branch → PR. 본인 review·merge.
- **Trusted contributors:** GitHub Collaborator 초대 → 직접 push.
- `CONTRIBUTING.md`에:
  - Frontmatter spec
  - 톤 가이드 (전공자 톤이 아니라 바이브코더 톤 — 예시 포함)
  - `[[wiki-link]]` 사용법 / 별칭 규칙
  - 카테고리 폴더 분류 기준
- 사이트 `/about/contribute`에 동일 내용 미러.
- **각 wiki 페이지 하단:** `<EditOnGitHub>` 버튼 → `https://github.com/<user>/vibeforge-wiki/edit/main/<path>`로 진입 → 비-개발자도 GitHub UI 직접 편집 가능.
- main merge → Vercel webhook → 자동 빌드/배포.

### Auth

- `Supabase Auth + GitHub OAuth` provider. 로그인 후 forum CRUD 가능.
- giscus는 별도 GitHub OAuth (giscus iframe 안에서). 사용자가 *두 번 로그인*해야 할 수 있음 — day-1엔 수용. v2에서 통합 검토.
- Wiki 편집/PR은 GitHub 계정 자체. 사이트 인증과 무관.

## IA / Routes

| Route | Purpose |
|---|---|
| `/` | Hero + 추천 wiki + 최근 Q&A |
| `/wiki` | 카테고리 진입 + 그래프뷰 toggle + 검색 |
| `/wiki/[...slug]` | 위키 페이지 (frontmatter, 본문, 영상 임베드, 백링크, 관련 Q&A, giscus 댓글, EditOnGitHub) |
| `/wiki/graph` | 전체 그래프뷰 |
| `/wiki/tag/[tag]` | 태그 인덱스 |
| `/forum` | 카테고리 리스트 + 최근 글 (3 카테고리: Q&A · 일반 · 공지) |
| `/forum/qa` | Q&A 리스트 + 시나리오 태그 필터 |
| `/forum/general` | 일반 |
| `/forum/notice` | 공지 (admin only write) |
| `/forum/post/[id]` | 글 상세 (댓글 트리, 관련 위키 백링크, giscus) |
| `/forum/new?cat=xxx` | 글 작성 (인증 필요) |
| `/about` | 사이트 소개 + 본인(운영자) 소개 |
| `/about/contribute` | 위키 기여 가이드 (`vibeforge-wiki/CONTRIBUTING.md` 미러) |
| `/auth/callback` | Supabase Auth callback |
| `/api/...` | Route Handlers (필요 시) |

## Design / Visual (`design.png` 참조)

- **3-column layout** (1280px 이상):
  - Wiki 페이지: 왼쪽 = 카테고리 트리 + 현재 페이지 hilite, 중앙 = 문서 본문 + 영상 임베드, 오른쪽 = 목차 + 백링크 + 관련 Q&A
  - Forum 페이지: 왼쪽 = 카테고리/태그 필터, 중앙 = 스레드 카드 또는 글 상세, 오른쪽 = 활성 사용자 또는 추천 위키
- **배경:** 보라/핑크 그라데이션 (페이지 자체)
- **카드:** 화이트, 라운드 (≈12-16px), 부드러운 shadow
- **액센트:** 보라 그라데이션 CTA (예: `linear-gradient(135deg, #7c3aed, #3b82f6)`)
- **카테고리 컬러 코딩:** 카테고리/태그마다 dot/배지 색 (보라·청록·초록·오렌지 등)
- **타이포:** 한글 가독성 우선 — `Pretendard` 또는 `Inter`. 본문 16px, 큰 헤딩 굵게.
- **모바일:** 3-col → 1-col stack. 사이드바는 drawer/시트.

## Components (high-level)

- `<SiteHeader>` (logo, nav, search, auth state)
- `<Sidebar>` 카테고리 트리, 현 페이지 highlight
- `<RightPanel>` (목차/백링크/관련Q&A 또는 forum 컨텍스트)
- `<WikiPage>` frontmatter, markdown render, 영상 임베드, EditOnGitHub
- `<Backlinks>` 페이지를 인용한 다른 wiki 페이지
- `<RelatedQA>` 양방향 백링크의 Q&A 측
- `<RelatedWiki>` Q&A에서 참조한 wiki 페이지
- `<GraphView>` `react-force-graph` 또는 `@cosmograph/cosmos`
- `<SearchBox>` + `<SearchResults>` MiniSearch/FlexSearch
- `<ForumList>` / `<PostCard>` / `<PostDetail>` / `<CommentList>` / `<NewPostForm>`
- `<TagFilter>` 시나리오 태그 (Q&A에서 사용)
- `<GiscusEmbed>` 페이지 댓글
- `<AuthButton>` / `<UserMenu>`
- `<EditOnGitHub>` 위키 페이지 편집 진입

## Error Handling / Edge Cases

- **깨진 `[[wiki-link]]`:** 빌드 시 경고 출력 + 페이지에 회색 strikethrough로 렌더 (alt text 보존)
- **vault syntax error:** 빌드 실패 명확히 표시. Vercel은 마지막 정상 빌드 유지.
- **Supabase 다운:** forum surface read-only fallback. UI에 일시적 오류 안내.
- **giscus 로드 실패:** skeleton + retry 안내. (페이지 본문은 영향 없음)
- **로그아웃 상태에서 글 작성 시도:** 로그인 모달 → callback 후 작성 화면 복귀
- **그래프뷰 큰 vault (100+ 페이지):** 첫 렌더 무거움 — placeholder + lazy hydrate. v1엔 100 노드 내외로 검증, 그 이상은 카테고리별 부분 그래프로 fallback.
- **외부 PR로 들어온 깨진 markdown:** wiki repo CI에서 `markdownlint` + frontmatter schema validation으로 거름.
- **이중 로그인 (사이트 + giscus):** 사이트 헤더에서 "GitHub로 로그인" 시 giscus도 자연스럽게 인증되도록 동일 OAuth scope 사용. v2 통합 검토.

## Testing Strategy

- **Unit:** wiki link parser, frontmatter parser, 백링크 인덱서, Q&A 본문 wiki 링크 추출
- **Integration:** vault → 빌드 → static output snapshot 검증
- **E2E (Playwright):** 핵심 flow
  - 위키 페이지 열기 → 백링크 표시 확인
  - 그래프뷰 진입 → 노드 클릭 → 페이지 이동
  - Forum 글 작성 (auth 포함) → wiki 링크 입력 → 해당 wiki 페이지에 자동 백링크 표시 확인
  - giscus 임베드 로드 확인
- **Visual regression:** 핵심 페이지 screenshot 비교 — day-1엔 수동, v2에 자동화 도입 검토
- **Lint:** TypeScript strict, ESLint, Prettier (site repo) / markdownlint + frontmatter schema (wiki repo CI)

## Implementation Notes

- **frontend-design skill 사용 (사용자 명시):** brainstorming 종료 → writing-plans → 실행 단계에서 frontend-design skill 호출. design.png를 input으로 전달, 컴포넌트별 polished UI 산출.
- vault → site build pipeline은 별도 모듈 (`lib/wiki/`) — 테스트 가능하게.
- Forum CRUD는 Server Actions 우선. RLS로 보안 이중화.
- Graph data는 빌드 시 JSON 생성, 클라 lazy load.
- 한글 콘텐츠 우선. `Pretendard` 폰트 self-host.

## Out of Scope (v1)

- 강의 영상 카탈로그 surface (영상 0개로 launch)
- StackOverflow 풀스펙 Q&A (추천/채택 없음)
- Q&A → Wiki 자동 승격 (수동 운영만)
- Wiki 페이지 안에 Q&A 인라인 임베드 — 백링크 리스트만
- 다국어 (한국어 only)
- 알림 시스템 (이메일/푸시)
- 모바일 앱
- 사이트 내 wiki 직접 편집 (GitHub fork/PR이 단일 경로)

## Open Questions / Validate Later

- **Day-1 시드 토픽:** vault DB / OS / DM 중 어디부터? DESIGN.md DB 추천 살아있음. 첫 1-2 토픽만 친근 라벨로 재포장 + 발행, 나머지는 점진.
- **Vercel + Supabase 무료 tier 한도:** 현 사용량 추정 시 충분. 트래픽 늘어나면 비용 발생 시점 모니터.
- **giscus + Supabase Auth 이중 로그인 UX:** 실제로 마찰 큰지 첫 사용자 피드백으로 검증.
- **그래프뷰 성능:** vault가 100+ 페이지로 늘어날 때.
- **`vibeforge-wiki/CONTRIBUTING.md` & `style-guide.md` 초안:** 별도 작업 — 이 spec과 분리해 작성.

## Success Criteria

DESIGN.md "두 번째 PR이 강요 없이 오는가" 정신 유지:

- [ ] **Wk 4-6:** VibeForge 사이트 Vercel 배포. `vibeforge-wiki` repo public.
- [ ] **Wk 4-6:** Wiki 한 토픽 (DB 추천) 친근 라벨로 발행 + `[[wiki-link]]` 백링크 + 검색 동작
- [ ] **Wk 4-6:** Forum Q&A / 일반 / 공지 카테고리 글 작성·열람 동작
- [ ] **Wk 4-6:** Q&A 글에 wiki 링크 → wiki 페이지에 자동 백링크 표시 확인
- [ ] **Wk 4-6:** 페이지 댓글 (giscus) 임베드 동작
- [ ] **Wk 6-8:** 본인 + 친구 1명이 wiki PR 1건 merge
- [ ] **Wk 8-12:** 외부인(친구 외)이 사이트 보고 wiki PR 1건 시도 — *가치 신호*
- [ ] **Wk 8-12:** Q&A 첫 외부 글 1건

## Phase Plan (rough, weeks)

- **Phase 1 (Wk 1-2):** Next.js 셋업, vault build pipeline, `[[wiki-link]]`/백링크/검색, 위키 페이지 기본 렌더
- **Phase 2 (Wk 3):** Tailwind + frontend-design skill 적용 (design.png), 3-col layout
- **Phase 3 (Wk 4):** Supabase 셋업, GitHub OAuth, Forum CRUD (3 카테고리)
- **Phase 4 (Wk 5):** Wiki ↔ Q&A 양방향 백링크 시스템
- **Phase 5 (Wk 6):** 그래프뷰, giscus 페이지 댓글, About / Contribute
- **Phase 6 (Wk 7+):** 폴리시, 시드 콘텐츠 톤 재포장 (DB 토픽), 친구 PR 받기

## References

- `DESIGN.md` (이 spec의 전신, /office-hours 결과)
- `design.png` (시각 톤 reference)
- `D:/my-workspace` (vault 시드 콘텐츠 — 추후 `vibeforge-wiki` repo로 이전)
- `quartz/` (사용 안 함, 다음 정리 단계에서 archive 또는 삭제)
