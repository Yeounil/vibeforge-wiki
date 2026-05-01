---
title: Peter Denning
type: person
area: [research, school]
tags: [person, computer-scientist, os, virtual-memory, working-set, locality, acm]
created: 2026-04-18
updated: 2026-04-18
aliases: [Peter J. Denning, 피터 데닝, Denning]
source_count: 1
---

# Peter Denning

미국 컴퓨터 과학자. 가상 메모리·운영체제 분야의 핵심 이론가. **Working Set model**과 **locality 이론 정립**으로 유명. ACM 전 회장, ACM Fellow.

## 주요 공헌

### Working Set Model (1968)
- **변수 할당(Variable allocation) 기반 page replacement의 대표 기법**.
- **Working set** `W(t, ∆)`: 시간 `[t-∆, t]` 구간 동안 참조된 page들의 집합.
  - ∆ (window size): system parameter, 고정.
  - Memory allocation은 가변.
- 원리: Working set을 메모리에 항상 유지 → **page fault rate 및 thrashing 감소**.
- Locality 개념의 수학적·실용적 기반 제공.

### Locality 이론
- 프로세스가 특정 영역을 집중 참조하는 현상을 formalize.
- 시간적(Temporal) · 공간적(Spatial) locality 구분은 현대 OS·캐시 설계의 근간.

## 등장 소스

- [[2026-04-18-os-lec10-가상-메모리-관리]] — Lec10 WS algorithm의 제안자로 등장.
