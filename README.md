# vibeforge-wiki

[VibeForge](../vibeforge-site)의 콘텐츠 저장소. 바이브코더를 위한 CS 위키.

이 repo의 markdown이 [vibeforge-site의 빌드 파이프라인](../vibeforge-site/scripts/build-indexes.ts)에 의해 정적 사이트로 변환됩니다.

## 기여하고 싶다면

- [CONTRIBUTING.md](./CONTRIBUTING.md) — PR 절차 + frontmatter 규칙
- [style-guide.md](./style-guide.md) — 톤·문장 가이드
- [CLAUDE.md](./CLAUDE.md) — **임포트 규칙** (저작권 제외 폴더 + source 제목 정규화). PR 보내기 전 필독.

## PR 전 체크

```bash
python scripts/lint-rules.py     # 이 repo 안에서: 제목 prefix·금지 폴더 검사
```

더 광범위한 frontmatter·`[[wiki-link]]` 검증은 site repo의 `npm run check:content`로 합니다.
