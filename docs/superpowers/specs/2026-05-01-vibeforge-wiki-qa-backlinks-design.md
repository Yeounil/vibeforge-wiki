# VibeForge Plan 4 — Wiki ↔ Q&A 양방향 백링크 (Design Spec)

- **Date:** 2026-05-01
- **Status:** PENDING USER REVIEW (brainstorming approved, awaiting spec doc review before plan)
- **Branch:** `plan3/supabase-forum` (plan 3 완료 위에 plan 4 진행 — `plan3-supabase-forum` 태그 base)
- **Predecessor spec:** `docs/superpowers/specs/2026-04-30-vibeforge-design.md` §"Wiki ↔ Q&A 양방향 백링크" (L141-152)
- **Brainstormed via:** `superpowers:brainstorming`

## TL;DR

Q&A 글 본문에서 wiki 참조(`/wiki/<slug>` 절대경로 + `[[Page Name]]` 위키문법)를
**작성 시점에** 추출 → `qa_wiki_refs` 테이블 sync. 양쪽 페이지에서 관계를 surface:

- `/wiki/<slug>` 페이지 RightPanel — `<RelatedQA>` (이 위키를 인용한 Q&A들)
- `/forum/post/<id>` 페이지 RightPanel — `<RelatedWiki>` (이 글이 인용한 위키들)

scope 한정: **create-only sync** (post 작성 시). 삭제는 `posts` ON DELETE CASCADE로 자동.
update action은 plan 3에도 없으므로 out of scope (sync 함수는 idempotent하게 만들어
update 도입 시 그대로 재호출 가능).

## Decision Recap

| Item | Decision |
|---|---|
| Link 인식 범위 | 절대경로 `/wiki/<slug>` + `[[Page Name]]` 위키문법 (alias resolve) |
| Write 경로 | Server Action 안에서 service-role client로 sync (`SUPABASE_SERVICE_ROLE_KEY`) |
| Sync 시점 | createPostAction 한 곳. delete는 ON DELETE CASCADE 자동. update는 out of scope |
| Sync 대상 | 모든 post 카테고리 (`qa`/`general`/`notice`) — 공통 경로, UI에서 카테고리 배지로 구분 |
| 깨진 slug | alias map resolve 안 되는 참조는 저장 안 함 (drop) |
| Q&A 페이지 UI | `/forum/post/[id]`에 RightPanel 추가, `<RelatedWiki>` 배치. 빈 경우 패널 미렌더 |
| Wiki 페이지 UI | 기존 RightPanel에 `<RelatedQA>` 추가 (TableOfContents/Backlinks 다음) |
| Wiki revalidation | `app/wiki/[...slug]/page.tsx`에 `export const revalidate = 60` 추가 (spec L146) |
| frontend-design skill | 호출하지 않음. 새 시각 변경 없이 기존 vf-card / Backlinks 패턴 재사용 |

## Architecture

### Module Layout

```
lib/
├── supabase/
│   ├── server.ts        (existing, user-bound)
│   ├── browser.ts       (existing)
│   └── service.ts       NEW — createServiceClient() reading SUPABASE_SERVICE_ROLE_KEY
├── wiki-qa/             NEW — cross-cutting "관계" 모듈
│   ├── extract.ts       extractWikiRefs(body_md, aliasMap) → string[]   (pure)
│   ├── sync.ts          syncWikiRefs(admin, postId, body_md)            (delete-then-insert)
│   └── queries.ts       listPostsByWikiSlug(supabase, slug, limit?)
│                        listWikiRefsByPost(supabase, postId)
├── wiki/page-loader.ts  EXTEND — export getAliasMap(): Promise<Map<string,string>>
└── forum/
    └── actions.ts       EDIT — createPostAction calls syncWikiRefs after insert

components/
├── wiki/
│   └── RelatedQA.tsx    NEW
└── forum/
    └── RelatedWiki.tsx  NEW

app/
├── wiki/[...slug]/page.tsx   EDIT — RightPanel에 <RelatedQA/> + revalidate=60
└── forum/post/[id]/page.tsx  EDIT — right={<RightPanel><RelatedWiki/></RightPanel>}
```

**Boundary rationale:**

- `wiki-qa/extract.ts` — vault-agnostic 순수 함수 (alias map을 인자로 받음). 단위 테스트에서 vault 의존성 없음.
- `wiki-qa/sync.ts` — service-role client로 `qa_wiki_refs`를 쓰는 **유일한 곳**. 보안 경계가 한 파일에 격리됨.
- `wiki-qa/queries.ts` — read-only. anon/user-bound client 어떤 것이든 가능 (RLS `qa_wiki_refs_select_all`).
- `lib/forum/`도 `lib/wiki/`도 아닌 **관계** 책임이 별도 모듈 (`lib/wiki-qa/`)로 격리.

### Data Flow — Write

```
User submits new-post form
  ↓
createPostAction (lib/forum/actions.ts)
  ├─ Zod validate (newPostSchema)
  ├─ const supabase = await createClient()        // user-bound
  ├─ const { data: post } = await supabase
  │     .from('posts').insert({...}).select('id').single()
  │     [RLS: posts_insert_authenticated]
  ├─ if (insert ok)
  │    try {
  │      const admin = createServiceClient()
  │      const slugs = await syncWikiRefs(admin, post.id, body_md)
  │      slugs.forEach(s => revalidatePath(`/wiki/${s}`))  // wiki 측 즉시 반영
  │    } catch (e) {
  │      console.error('[wiki-qa sync failed]', e)
  │      // best-effort: post는 이미 저장됨, sync 실패가 작성을 막지 않음
  │    }
  ├─ revalidatePath(`/forum/${category}`)
  ├─ revalidatePath('/forum')
  └─ redirect(`/forum/post/${post.id}`)
```

`syncWikiRefs(admin, postId, body)` 내부:

```
1. aliasMap = await getAliasMap()                          [page-loader cache]
2. slugs = extractWikiRefs(body, aliasMap)                 [pure, dedup, sorted]
3. await admin.from('qa_wiki_refs').delete().eq('post_id', postId)
4. if (slugs.length > 0)
     await admin.from('qa_wiki_refs')
       .insert(slugs.map(s => ({ post_id: postId, wiki_slug: s })))
5. return slugs   // for revalidatePath callers
```

### Data Flow — Read (wiki page)

```
/wiki/[...slug]  (export const revalidate = 60)
  → loadOnePage(slug)                                      [vault, build-time cache]
  → const supabase = await createClient()
  → posts = await listPostsByWikiSlug(supabase, slug, 20)
       supabase.from('qa_wiki_refs')
         .select('post:posts!inner(id, category, title, created_at,
                                   author:profiles!posts_author_id_fkey(...))')
         .eq('wiki_slug', slug)
         .order('created_at', { foreignTable: 'post', ascending: false })
         .limit(20)
  → <RightPanel>
      <TableOfContents.../>
      <Backlinks.../>
      <RelatedQA posts={posts} />
    </RightPanel>
```

### Data Flow — Read (Q&A page)

```
/forum/post/[id]
  → getPost(id), listComments(id)            [existing]
  → slugs = await listWikiRefsByPost(supabase, id)         // string[]
  → all = await getAllPages()                              [already used for sidebar]
  → titleMap = Object.fromEntries(all.map(p => [p.slug, p.frontmatter.title]))
  → if (slugs.length > 0)
      right={<RightPanel><RelatedWiki slugs={slugs} titleMap={titleMap} /></RightPanel>}
    else
      right={null}
```

### Extraction Rules (`extract.ts`)

Input: `body: string`, `aliasMap: Map<string, string>` (lowercased key → canonical slug; built by `lib/wiki/backlinks.ts:buildAliasMap` — reused).

1. **`/wiki/<slug>` 절대경로 매칭** — regex `\B/wiki/([\w/-]+?)(?=[\s)\]"'>]|$)`
   - 매칭된 raw slug를 `aliasMap.get(slug.toLowerCase())`로 정규화. 정규화 결과가 alias map에 있어야 valid.
2. **`[[Target]]` / `[[Target|Display]]` 위키문법** — `lib/wiki/backlinks.ts`의 regex 재사용:
   `(?<!\[)\[\[([^\[\]|]+?)(?:\|[^\[\]]+?)?\]\](?!\])`. target만 추출 후 `aliasMap.get(target.trim().toLowerCase())`.
3. **Resolve 실패 → drop.** 깨진 ref는 DB에 들어가지 않음.
4. **Dedup** — `Set<string>`로 unique.
5. **Sort** — `Array.sort()` deterministic output (테스트 안정성).

**day-1 한계 (의도적):**
- 코드블록(```) / 인라인 코드(`) 안의 `/wiki/...`도 매칭됨 → false-positive 가능.
  v1엔 단순 regex 유지. v2에서 markdown 파싱 후 추출로 정교화.
- HTML escape나 zero-width 문자 등 edge case 미고려.

### Read Queries (`queries.ts`)

```ts
// Used on wiki page — list posts referencing this slug
export async function listPostsByWikiSlug(
  supabase: SupabaseClient,
  slug: string,
  limit = 20
): Promise<RelatedPost[]>

// Used on forum post page — list wiki slugs referenced by this post
export async function listWikiRefsByPost(
  supabase: SupabaseClient,
  postId: string
): Promise<string[]>

interface RelatedPost {
  id: string;
  category: ForumCategory;
  title: string;
  created_at: string;
  author: { display_name: string | null; github_login: string | null } | null;
}
```

기존 `lib/forum/queries.ts` 패턴 (Supabase client 인자 주입, 테스트에서 stub) 동일 적용.

### `lib/supabase/service.ts`

```ts
import { createClient } from "@supabase/supabase-js";
import { getServerEnv } from "@/lib/env";

export function createServiceClient() {
  const env = getServerEnv();
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for service client");
  }
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
```

> **env 확장 필요 여부:** 현재 `lib/env.ts`가 `SUPABASE_SERVICE_ROLE_KEY`를 노출하는지 확인.
> 없으면 plan 4 첫 단계에서 `getServerEnv()`(server-only) 헬퍼 추가 또는 기존 헬퍼 확장.
> implementation plan에서 정확히 짚는다.

### `lib/wiki/page-loader.ts` — extend

기존:
```ts
async function ensureCache(): Promise<{ all, titleMap, aliasMap, backlinks }>
```
은 module-private. plan 4에서 export 추가:

```ts
export async function getAliasMap(): Promise<Map<string, string>> {
  const { aliasMap } = await ensureCache();
  return aliasMap;
}
```

vault는 build-time에 fs로 읽힘 (Vercel 빌드 시 submodule). Server Action에서 호출 시
이미 캐시된 인스턴스 재사용 (모듈 스코프 `cache` 변수).

## Components

### `<RelatedQA>` — `components/wiki/RelatedQA.tsx`

Server Component (props만 받음, 상태 없음).

```ts
interface RelatedQAProps {
  posts: RelatedPost[];   // already sorted desc by created_at
}
```

- 빈 배열 → "이 페이지를 인용한 토론이 아직 없어요." 한 줄 + Q&A로 가는 CTA 링크 (`/forum/qa`)
- non-empty → 카드 안에 list. 각 item: `CategoryBadge` + 제목(Link) + 작성자 + `created_at.slice(0, 10)`
- 카드 헤더: `<h2>관련 토론</h2>` (기존 Backlinks 패턴과 톤 일치)
- 시각: `vf-card` 클래스 + 기존 Backlinks와 동일한 padding / 타이포

### `<RelatedWiki>` — `components/forum/RelatedWiki.tsx`

```ts
interface RelatedWikiProps {
  slugs: string[];                        // sorted, validated
  titleMap: Record<string, string>;       // slug → title
}
```

- props.slugs 빈 배열은 caller가 차단 (`right={null}`). 컴포넌트 자체는 non-empty 가정.
- list item: 작은 dot (카테고리 색은 v1 단순화 — 모두 동일 보라 액센트, 추후 카테고리별 컬러는 카테고리 메타가 surface될 때) + title (Link to `/wiki/<slug>`)
- 카드 헤더: `<h2>이 글이 인용한 위키</h2>`

### Right panel placement

**`/wiki/[...slug]/page.tsx`** — 기존:
```tsx
right={<RightPanel><TableOfContents.../><Backlinks.../></RightPanel>}
```
변경:
```tsx
right={<RightPanel>
  <TableOfContents.../>
  <Backlinks.../>
  <RelatedQA posts={relatedQA} />
</RightPanel>}
```
순서 의미: 페이지 내(목차) → 위키 내(Backlinks) → 사이트 간(Q&A).

**`/forum/post/[id]/page.tsx`** — 기존: right panel 없음 (AppShell에 right prop 안 넘김).
변경:
```tsx
right={slugs.length > 0
  ? <RightPanel><RelatedWiki slugs={slugs} titleMap={titleMap} /></RightPanel>
  : null}
```

> **AppShell의 right prop이 null/undefined일 때 처리** 확인 필요.
> 현재 AppShell이 right ? null fallback을 안 가지면, 미세 수정 (column rendering conditional).
> Plan 단계에서 정확히 검증.

## Error Handling

| 상황 | 처리 |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` 미설정 | `createServiceClient()` throw → action catch → console.error → post 저장은 성공한 상태로 정상 완료. |
| Vault alias map 로드 실패 (fs 에러) | `getAliasMap()` reject → action catch (위와 동일). |
| Q&A 본문 wiki 링크 0개 | extract → 빈 배열 → delete-by-post_id만 실행, insert 0건. 정상. |
| 동일 slug 본문에 여러 번 등장 | extract dedup → PK 충돌 없음. |
| 깨진 wiki slug | extract 단계 drop — DB에 안 들어감. UI 자연 미표시. |
| Wiki slug rename 후 기존 ref orphan | DB read 시 매칭 없음 → wiki 페이지에 안 보임. 데이터 정합 깨지지 않으나 사용자 관점 "유실" 발생. **out of scope v1**. v2에서 cleanup job 또는 wiki migration 도구. |
| service-role insert 실패 | syncWikiRefs throw → action catch (위와 동일). |
| Supabase down (read) | RelatedQA/RelatedWiki 쿼리 실패 → 빈 카드 또는 미렌더. 페이지 본문 영향 없음. |
| `revalidatePath('/wiki/<bad>')` | Next.js no-op. 안전. |
| anon read | `qa_wiki_refs_select_all` 정책에 따라 OK. |

**Invariant:** post 저장과 ref sync는 **분리된 best-effort 단계**. ref sync 실패가 post 작성을 막지 않는다.

## Testing Strategy

### Unit (Vitest)

- `lib/wiki-qa/extract.test.ts`
  - `/wiki/<slug>` markdown link target & 베어 URL 추출
  - `[[Page Name]]` + `[[Page Name|alias]]` 추출 + alias resolve
  - 두 형식 혼합 본문
  - 깨진 slug 드롭 (alias map miss)
  - 동일 slug 중복 → dedup
  - sorted output (deterministic)
  - 빈 body → 빈 배열
  - 코드블록 안 매칭은 **현재 false-positive로 매칭됨을 명시적 테스트** (v2 개선 항목 표시)

- `lib/wiki-qa/sync.test.ts`
  - 스텁된 admin client (forum/queries.test.ts 패턴 재사용)
  - delete-then-insert 호출 검증 (인자 정확성)
  - extract → 빈 배열일 때 insert skip
  - alias map 로드 실패 시 throw 표면화 (caller가 catch)

- `lib/wiki-qa/queries.test.ts`
  - `listPostsByWikiSlug` — 정렬·limit·embed 모양 검증 (forum/queries.test.ts 스텁 패턴)
  - `listWikiRefsByPost` — 정렬

### Integration

- 별도 통합 테스트 추가 안 함. Server Action 통합 검증은 e2e가 담당 (plan 3 정책 동일).

### E2E (Playwright)

`tests/e2e/wiki-qa-backlinks.spec.ts`:

1. 인증 storage state 재사용 (plan 3 e2e 인증 fixture가 있는지 first task에서 확인. 없으면 read-only 부분만 추가하고 인증 path는 follow-up).
2. seeded vault 상태에서 알려진 wiki slug 1개 선택 (e.g., `data-handling/postgres-intro` 또는 첫 페이지 slug).
3. `/forum/new?cat=qa` → body에 `[link](/wiki/<seed-slug>)` + `[[<seed-title>]]` 둘 다 작성 → 제출.
4. 리다이렉트된 post 페이지에서 `<RelatedWiki>` 카드에 두 wiki 링크 모두 (또는 dedup된 1개 — seed-slug == seed-title인지에 따라) 표시 검증.
5. `/wiki/<seed-slug>` 이동 → `<RelatedQA>` 카드에 방금 작성한 post 제목 표시 검증.

> **선결 확인:** plan 3 e2e (`tests/e2e/forum.spec.ts` 등)가 인증 storage state 또는 OAuth bypass를 갖췄는지. 없으면 plan 4의 e2e는 read-only path 검증으로 한정 (스크립트로 직접 fixture insert 후 RelatedQA/RelatedWiki 표시만 검증).

### Lint / Type / Visual

- TypeScript strict, ESLint, Prettier — 기존 pipeline 그대로.
- visual regression — 새 시각 컴포넌트 적지만 기존 패턴 재사용. day-1 별도 검증 안 함.

## Out of Scope (v1)

- post **update/edit** 액션 자체 (sync 함수는 idempotent하므로 update 도입 시 그대로 호출하면 됨)
- 코드블록 내부 `/wiki/...` false-positive 정교화
- wiki slug rename 시 orphan ref cleanup
- "관련 토론 더 보기" (limit 20 초과)
- 카테고리별 컬러 dot for `<RelatedWiki>` (v2에서 카테고리 메타데이터 surface와 함께)
- Q&A page에 추천 위키 (RelatedWiki 외 추가 right-panel 카드)
- giscus, 그래프뷰 (plan 5)

## Open Questions / Validate at Plan Time

- `lib/env.ts`가 `SUPABASE_SERVICE_ROLE_KEY` 노출 함수를 가지고 있는지 — 없으면 server-only env 헬퍼 추가
- `AppShell`이 `right={null}` (또는 미전달) 케이스를 그레이스풀하게 처리하는지
- plan 3 e2e 인증 fixture 존재 여부 (e2e scope 결정에 영향)

## Success Criteria (Plan 4)

이 plan이 끝났을 때 만족해야 하는 동작:

- [ ] Q&A 글 작성에서 본문에 `/wiki/<slug>` 또는 `[[Page Title]]` 링크를 포함하고 제출하면, `qa_wiki_refs`에 해당 (post_id, wiki_slug) row가 생긴다.
- [ ] 같은 wiki slug를 인용한 다른 Q&A 글들이 그 wiki 페이지의 RightPanel "관련 토론" 카드에 표시된다.
- [ ] 그 Q&A 글 상세 페이지의 RightPanel "이 글이 인용한 위키" 카드에 wiki 페이지(들) 링크가 표시된다.
- [ ] 깨진 wiki 참조(`/wiki/foo/nope`, `[[Unknown]]`)는 `qa_wiki_refs`에 들어가지 않는다.
- [ ] post 삭제 시 `qa_wiki_refs`의 관련 row들이 자동 삭제된다 (CASCADE).
- [ ] `SUPABASE_SERVICE_ROLE_KEY` 미설정 등 sync 실패가 post 저장 자체를 막지 않는다.
- [ ] 모든 단위 테스트 (`extract`, `sync`, `queries`) 통과.
- [ ] 가능한 경우 e2e: 작성 → wiki/Q&A 양측 surface 검증.

## References

- Predecessor design spec: `docs/superpowers/specs/2026-04-30-vibeforge-design.md` §"Wiki ↔ Q&A 양방향 백링크"
- Plan 3 plan: `docs/superpowers/plans/2026-05-01-vibeforge-supabase-forum.md`
- DB migrations: `supabase/migrations/0001_init.sql` (qa_wiki_refs schema), `0002_rls.sql` (read public, write service-role)
- Reused wiki link parser: `lib/wiki/backlinks.ts:buildAliasMap`, `lib/wiki/wiki-link.ts:WIKI_LINK_RE`
