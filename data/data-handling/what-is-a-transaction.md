---
title: 트랜잭션이 뭐예요?
tags: [DB, 데이터 무결성]
aliases: [transaction, ACID]
updated: 2026-05-01
---

AI가 짜준 코드가 데이터를 두 군데 연달아 바꿔야 할 때, 한쪽만 성공하면 데이터가 어긋나요. 그래서 묶어요.

## 한 묶음으로 성공하거나, 한 묶음으로 없던 일이 되거나

송금이 좋은 예. "내 잔액 -1만" + "친구 잔액 +1만" 두 SQL이 *같이* 성공해야 의미가 있어요. 한쪽만 되면 1만원이 증발하거나 복사돼요.

```sql
BEGIN;
  UPDATE balance SET amount = amount - 10000 WHERE user_id = 1;
  UPDATE balance SET amount = amount + 10000 WHERE user_id = 2;
COMMIT;
```

`COMMIT` 전에 한 줄이라도 실패하면 `ROLLBACK` — 두 줄 다 없던 일.

## ACID 네 글자

- **A**tomicity 원자성 — 한 묶음, 한 결말
- **C**onsistency 일관성 — 시작도 끝도 규칙(제약 조건)에 맞아야
- **I**solation 격리 — 동시에 도는 다른 트랜잭션에 어중간한 상태가 새지 않아야
- **D**urability 영속 — `COMMIT` 이후엔 정전이 와도 살아있어야

## 언제 묶어야 해요?

"이 두 SQL이 따로 실패하면 데이터가 어긋나는가?" — yes면 트랜잭션이에요. 결제, 재고 차감, 상태 전이 같은 데가 단골.

길어지면 락(lock)을 오래 잡아 다른 사용자가 기다려요. 트랜잭션이 길수록 [[what-is-an-n-plus-one]] 같은 패턴이 더 위험해져요. 락 잡는 위치는 [[what-is-an-index]]와 깊이 엮여 있어요.
