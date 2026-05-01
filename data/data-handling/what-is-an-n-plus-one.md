---
title: N+1이 뭐예요?
tags: [DB, 성능, ORM]
aliases: [n+1, N+1 problem, n plus one]
updated: 2026-05-01
---

ORM(객체-관계 매퍼) 한 번 써본 바이브코더가 한 번은 만나는 이름. 의미는 단순해요 — 1번 쿼리로 끝낼 일을 N+1번 쿼리로 한다.

## 어떻게 N+1번이 되나요?

"유저 10명 + 각 유저의 글 개수"가 전형 예. 순진하게 짜면:

1. 유저 10명 가져오기 — SQL 1번
2. 각 유저별 글 개수 — SQL 10번

= 11번. 100명이면 101번. ORM이 lazy하게 관련 테이블을 *나중에* 가져올 때 자주 발생.

## 발견 신호

- 로그에 똑같은 모양의 SQL이 N번 찍혀요
- 페이지 로딩이 데이터 양에 정확히 비례해 느려져요
- DB CPU가 갑자기 100% — N개 동시 접속 시 곱연산이라

## 처방 한 줄씩

- **eager loading** — ORM에 "글 개수도 같이 가져와" 알려주기 (Django `select_related/prefetch_related`, Prisma `include`)
- **JOIN** — 1번 쿼리로 합쳐서 가져오기
- **batch fetch** — N개 ID를 모아 `WHERE id IN (...)` 한 번에
- **DataLoader 패턴** — GraphQL에서 자주. 같은 요청 안 N번 호출을 자동으로 배치

## 왜 위험해요?

[[what-is-an-index]]가 없으면 한 쿼리당 풀 스캔 — N+1이 N×풀스캔으로 폭발. 또 [[what-is-a-transaction]] 안에 있으면 락을 N배 더 오래 잡아요. 처음 만났을 때 *반드시* 한 번은 짚고 가야 하는 패턴.
