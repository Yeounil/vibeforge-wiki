# CLAUDE.md — vibeforge-wiki content rules

이 파일은 **AI 에이전트(Claude 등)가 이 위키에 콘텐츠를 추가·수정할 때** 따르는 규칙을 정의합니다. 사람 기여자는 [CONTRIBUTING.md](./CONTRIBUTING.md)를 보세요.

## 컨텍스트

이 위키(`vibeforge-wiki`)는 비공개 Obsidian 볼트(`my-workspace`, `notebook` 등)에서 큐레이션된 일부 콘텐츠를 받아 공개합니다. 비공개 볼트의 모든 페이지를 그대로 가져오면 안 됩니다 — 저작권·프라이버시·중복 정렬 정보를 거르고 가져옵니다.

## 임포트 규칙

### 1. 복사 대상 vs 제외 대상

복사 가능 (volumes that ship to public wiki):

- `concepts/` — 추상 개념 (자작 노트만)
- `entities/` — 도구·시스템 (자작 노트만)
- `sources/` — 강의 노트·요약 (자작 요약만, 원문 본문 X)

**복사 금지 (private/copyright)**:

- `people/` — 인물 약력은 외부 출처 의존도가 높아 저작권 위반 위험. 기존 `data/people/`은 큐레이션된 자작본으로 유지하지만, **신규 인물 페이지는 사용자가 직접 작성한 경우에만** 추가하고, 워크스페이스에서 일괄 임포트 금지.
- `raw/` — 원본 PDF·전사·강의 자료. 절대 위키에 포함 X.
- `notes/`, `projects/`, `log.md`, `index.md` — 개인 작업 공간 메타. 위키에 노출하지 않음.

### 2. Source 제목 정규화

`sources/` 안의 강의·교안 파일은 `title` frontmatter에서 **강의 번호 prefix를 제거**합니다.

| 패턴 | ❌ Bad | ✅ Good |
|------|--------|---------|
| 주차 | `DB 1주차 — 데이터베이스 개념` | `데이터베이스 개념` |
| 강의 | `DM 강의 01 — 데이터마이닝 개요` | `데이터마이닝 개요` |
| 실습 | `DM 실습 P-01 — R 시작하기` | `R 시작하기` |
| Lec | `OS Lec1 — 컴퓨터 시스템 개요` | `컴퓨터 시스템 개요` |
| Ch | `SA Ch1: 시스템 설계 기초` | `시스템 설계 기초` |

이유: 위키는 강의 번호를 노출하지 않습니다 (학교·교재마다 번호가 다르고, 페이지 본질을 가립니다). 파일명(`2026-04-18-os-lec01-...`)은 시간순 정렬용이라 그대로 둡니다.

`aliases:`에 `Lec1 컴퓨터 시스템 개요`, `1주차 교안` 같은 구 명칭은 **유지 가능** — 비공개 볼트에서의 참조를 위해.

### 3. Wiki-link 무결성

- 페이지 간 참조는 **slug(파일명) 기반** `[[2026-04-18-db-w01-데이터베이스-개념]]` 또는 **title/alias 기반** `[[데이터베이스]]` 둘 다 가능 (대소문자 무시).
- 제목을 정규화(2번)할 때 파일명은 안 바꾸므로 slug 링크는 영향 없음. title 기반 링크는 정규화 후 lint로 검증.
- 모든 `[[...]]`는 실제 페이지(slug/title/alias 중 하나)에 매칭돼야 함. 매칭 실패 = 끊어진 백링크 = lint 에러.
- **저작권 제외 폴더(`people/`, `raw/`)에 있던 페이지로의 링크가 끊어지는 것은 자주 발생**하는 패턴 — 자가 수정 절차는 아래 참조.

## Lint

위 규칙 위반을 자동 검사합니다.

```bash
# content/ 폴더 root에서
python scripts/lint-rules.py
```

검사 항목:
1. `data/sources/*.md` title에 강의 prefix(주차·Lec·강의 NN·실습 P-NN·Ch N) 잔존 여부
2. `data/` 하위에 금지 디렉토리(`notes/`, `projects/`, `raw/`)가 들어왔는지
3. `data/` root에 금지 파일(`log.md`, `index.md`)이 있는지
4. **모든 `[[wiki-link]]`이 slug/title/alias 중 하나에 매칭되는지** (끊어진 백링크 검출)

에러 0건이어야 PR merge 가능. 더 광범위한 frontmatter·구조 검증은 parent repo의 `npm run check:content` 사용.

## 임포트 워크플로우 (Claude용)

사용자가 "워크스페이스에서 가져와줘" 요청 시:

1. `my-workspace/{concepts,entities,sources}/`와 `data/{concepts,entities,sources}/` 비교 → 신규 파일 식별
2. **`people/`, `raw/`, `notes/`, `projects/`는 보지도 않음**
3. 복사 시 source 제목은 위 2번 규칙대로 prefix 제거
4. 복사 후 `python scripts/lint-rules.py` 실행 → 통과 확인
5. 끊어진 백링크가 보고되면 아래 **백링크 자가 수정** 절차 적용
6. 사용자에게 신규/수정 파일 + 자가 수정 내역 리포트

## 백링크 자가 수정 절차 (Claude용)

`python scripts/lint-rules.py`가 `broken [[X]]`를 보고하면 **수동 수정 없이 다음 결정 트리로 자체 처리**:

```
broken [[X]]
├─ X가 my-workspace/{concepts,entities,sources}/에 있는가?
│   └─ Yes → 해당 파일을 복사 (제목 정규화 규칙 2 적용). 새 파일도 동일 절차로 백링크 재검사.
│
├─ X가 my-workspace/raw/ 또는 people/에만 있는가? (저작권 제외 영역)
│   └─ 두 경우로 분기:
│       (a) 본문이 이미 위키 안의 source/concept에 충분히 들어 있다 (예: sa-ch02 안에 신뢰성 섹션)
│           → 해당 위키 콘텐츠에서 발췌하여 stub concept 페이지 생성.
│             frontmatter는 인접 페이지(CAP 정리.md 등)와 동일한 형식.
│             본문은 5-10줄 요약 + "## 소스" 섹션에 출처 source 페이지 wiki-link.
│       (b) 본문이 위키 어디에도 없다
│           → 새 정보를 만들어내지 말고, [[X]]를 일반 텍스트 X로 풀기 (브래킷 제거).
│
└─ X가 어디에도 없는가? (오타·타이틀 변경 가능성)
    └─ 비슷한 slug/title/alias가 있는지 검색.
        있으면 해당 정식 명칭으로 [[X]] 교정.
        없으면 (b)와 동일 — 브래킷 제거.
```

수정 후 반드시 lint 재실행. 모호한 경우(예: stub 만들 만큼 본문이 충분한지 애매)는 사용자에게 물어봄.

처음에 이 위키 구조와 어울리지 않는 자가 수정을 했다면 사용자가 되돌릴 수 있도록 **수정 내역(파일·변경 종류·근거)을 항상 리포트**.
