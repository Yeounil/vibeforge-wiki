# vibeforge-site

[VibeForge](./docs/superpowers/specs/2026-04-30-vibeforge-design.md) — 바이브코더를 위한 CS 학습·토론 사이트. Next.js 15 (App Router) + TypeScript.

이 repo는 사이트 코드. 콘텐츠(위키 페이지)는 [`vibeforge-wiki`](https://github.com/Yeounil/vibeforge-wiki) repo에 있고 `content/`로 git submodule 마운트됨.

## 첫 셋업

```bash
git clone --recurse-submodules <this-repo>
cd vibeforge-site
npm install
```

이미 clone 했고 submodule만 가져오려면:

```bash
git submodule update --init --recursive
```

## 개발

```bash
npm run dev
# → http://localhost:3000
```

빌드 시작 전 `scripts/build-indexes.ts`가 자동으로 vault를 스캔해서 `public/wiki-data/`에 backlink/tag/search 인덱스를 만듭니다.

## Admin promotion

The first admin must be minted manually in Supabase Studio (the SQL editor against your project) — once, with:

```sql
update public.profiles set role = 'admin' where github_login = '<your-github-login>';
```

After that, all admin promotion/demotion happens at `/admin` in-app. Non-admins (including anonymous visitors) are 404'd from that route — it does not appear in the public nav.

The `role` column is locked from `authenticated` GRANTs (see `supabase/migrations/0004_lock_role_column.sql`), so no client can self-promote even by crafting a raw Supabase request.

## 테스트

```bash
npm test            # vitest unit
npm run test:e2e    # playwright e2e
npm run typecheck   # tsc strict
```

## 위키 콘텐츠 추가

→ [vibeforge-wiki](https://github.com/Yeounil/vibeforge-wiki) repo로 PR 보내주세요. [CONTRIBUTING.md](https://github.com/Yeounil/vibeforge-wiki/blob/main/CONTRIBUTING.md) 참조.

## 다음 단계 (Plans 2~6)

- Plan 2: design.png 톤 적용 (frontend-design skill)
- Plan 3: Supabase + GitHub OAuth + Forum
- Plan 4: Wiki ↔ Q&A 양방향 백링크
- Plan 5: 그래프뷰 + giscus + About
- Plan 6: 폴리시 + 시드 콘텐츠 톤 재포장

각 plan: `docs/superpowers/plans/`.
