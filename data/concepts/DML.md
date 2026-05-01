---
title: DML
type: concept
area: [book, school]
tags: [database, sql, dml, db-강의]
created: 2026-04-18
updated: 2026-04-18
source_count: 1
aliases: [Data Manipulation Language, 데이터 조작어]
---

# DML (Data Manipulation Language)

[[SQL]]의 3대 기능 중 **데이터 조작** 담당. 테이블 내용을 삽입·수정·삭제·조회.

## 4대 명령

```sql
INSERT INTO t (col, ...) VALUES (val, ...)
UPDATE t SET col = val [WHERE 조건]
DELETE [FROM] t [WHERE 조건]
SELECT cols FROM t [WHERE 조건]
```

## INSERT 패턴

- **단일 행**: `VALUES` 절.
- **다중 행 (서브쿼리)**: `INSERT ... SELECT ~`.
- **다중 행 VALUES** (MS-SQL 2008+): `VALUES (...), (...)`
- **질의 결과 → 새 테이블**:
  - MS-SQL: `SELECT ... INTO 새테이블 FROM ...`
  - 오라클: `CREATE TABLE ... AS SELECT ...`
- **구조만 복사**: `WHERE 1 > 2` 처럼 항상 거짓인 조건.

## UPDATE / DELETE 주의점

- `WHERE` 생략 시 **전체 행** 대상.
- 서브쿼리로 다른 테이블 참조 가능:
  ```sql
  UPDATE T SET col = (SELECT ... FROM ...) WHERE ...
  DELETE FROM T WHERE col IN (SELECT ... FROM ...)
  ```

## NULL 처리 (INSERT)

- 묵시적 — 속성명 생략
- 명시적 — `VALUES (..., NULL, ...)`
- `NOT NULL` 제약 시 입력 거부 → [[무결성 제약조건]] (개체 무결성)

## 관련

- [[SQL]] — DML의 상위 개념
- 나머지 SQL 기능: DDL (CREATE/ALTER/DROP), DCL (GRANT/REVOKE/COMMIT)

## 소스

- [[2026-04-18-db-w07-sql-기초]]
