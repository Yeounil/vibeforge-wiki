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
updated: 2026-04-30
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
