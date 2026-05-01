---
title: Edsger Dijkstra
type: person
area: [research, book, school]
tags: [computer-science, os, concurrency, algorithm, semaphore, deadlock, dutch]
created: 2026-04-18
updated: 2026-04-18
aliases: [Dijkstra, 다익스트라, Edsger Wybe Dijkstra, Edsger W. Dijkstra]
source_count: 2
---

# Edsger Dijkstra

네덜란드 출신 컴퓨터 과학자 (1930–2002). 튜링상 수상자 (1972). 동시성(concurrency)·운영체제·알고리즘 분야의 핵심 기여자.

## OS 분야 주요 기여

### Semaphore (1965)
- **Binary / Counting semaphore** 개념 제안.
- **P()** (Probern, 검사·감소) + **V()** (Verhogen, 증가) 연산.
- Busy waiting 해결. **대부분 OS의 기본 동기화 기법**.
- 해결 가능 문제: Mutual exclusion, Process synchronization, **Producer-Consumer**, Reader-Writer, Dining philosopher.

### N-process Mutual Exclusion (SW)
- 최초로 N개 프로세스의 상호배제 문제를 소프트웨어적으로 해결.
- `flag[]` 3상태 (idle / want-in / in-CS).

### Banker's Algorithm
- **Deadlock avoidance**의 이론적 기법.
- 시스템을 항상 **safe state**로 유지.
- 자원 요청 시 **safe sequence** 존재 여부 검증 → accept/reject.
- 한 종류 자원 다수 유닛 가정. **Habermann이 multi-resource로 확장**.

### Dining Philosophers Problem
- 고전 동기화 문제 제안 (5명 철학자 + 포크 공유).

## OS 외 기여 (참고)

- **Dijkstra's shortest path algorithm** (1956 제안, 1959 발표) — 그래프 최단 경로.
- **Structured programming** 주창 (`GOTO considered harmful`, 1968).
- **THE operating system** (1968) — 계층적 OS 설계 선구.

## 등장 소스

- [[2026-04-18-os-lec06-상호배제-동기화]] — Semaphore, N-proc ME.
- [[2026-04-18-os-lec07-교착상태]] — Banker's algorithm (사진 명시).

## 관련

- Habermann (Banker's algorithm 확장자) — OS Lec7에서 언급.
