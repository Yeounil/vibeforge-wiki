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

## 부모와 선수지식

페이지 frontmatter에 두 가지 관계를 표현할 수 있습니다.

- **`parent:`** — 같은 폴더 안에서 "이 페이지는 어떤 큰 개념의 한 단원인가". 단일 값. 예: `parent: DBMS`
- **`prerequisites:`** — "이 페이지를 이해하려면 먼저 알아야 하는 다른 페이지들". 배열. 다른 폴더의 페이지도 가능 (예: 도구·인물). 예:

  ```yaml
  prerequisites:
    - 데이터 독립성
    - 함수적 종속성
  ```

값은 wiki-link와 같은 규칙으로 적습니다 — 페이지의 `title` 또는 `aliases` 중 하나면 자동 해석됩니다.

판단 기준:

- "이게 X의 한 챕터/세부 주제다" → `parent: X`
- "X를 모르면 이 글을 못 읽는다" → `prerequisites: [X, ...]`

둘 다 해당하면 둘 다 적습니다. `parent`는 같은 top-level 폴더 안의 페이지여야 합니다 (cross-folder는 빌드 실패).
