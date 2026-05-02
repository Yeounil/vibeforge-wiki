---
title: SQL
type: concept
area: [book, school, research]
tags: [database, sql, query-language, db-강의]
created: 2026-04-18
updated: 2026-04-18
source_count: 2
aliases: [Structured Query Language, SEQUEL]
parent: 관계형 데이터 모델
prerequisites:
  - 관계 해석
  - 관계 대수
---

# SQL (Structured Query Language)

[[관계형 데이터 모델]]의 **표준 질의 언어**. 비절차적(What만 명시) 고급 언어.

## 역사적 기반

- **튜플 [[관계 해석]]** 기반.
- IBM **산호세 연구소**에서 System R(1974) 프로토타입 내에서 개발됨.
- 그 이후 상용 DBMS의 표준이 됨.

## 3가지 기능 분류

| 언어 | 역할 | 예시 |
|---|---|---|
| **DDL** (Data Definition) | 구조 정의 | `CREATE`, `ALTER`, `DROP` |
| **DML** (Data Manipulation) | 데이터 조작 | `SELECT`, `INSERT`, `UPDATE`, `DELETE` |
| **DCL** (Data Control) | 권한·트랜잭션 제어 | `GRANT`, `REVOKE`, `COMMIT`, `ROLLBACK` |

## 처리 내부 원리

사용자가 작성한 SQL은 내부적으로 **[[관계 대수]]** 로 변환되어 실행됨 → 질의 최적화의 대상.

## 비교: QBE

**QBE** (Query By Example) — 도메인 관계 해석 기반 시각적 질의 도구. IBM 왓슨 연구소 1975년 개발. MS-Access에서 지원.

## 이 강의에서의 위치

**7주차** 에서 실습 형태로 심화:
- SQL 기초 문법
- DML 실습 — 삽입·갱신·삭제

## 역사

- **1974** — IBM San Jose Lab에서 **SEQUEL**로 개발. System R용.
- **1986** — ANSI 표준 인증 (SQL-86 / SQL1).
- **1992** — SQL-92 / SQL2
- **1999** — SQL-99 / SQL3
- **2003** — SQL-2003 / SQL4 (객체 지향 개념 추가)

## 관계 대수와의 차이

SQL 결과는 **Bag (중복 허용)** — 관계 대수의 Set(중복 불허)와 다름. 이유: 중복 제거는 정렬이 필요해 성능 비용이 큼. 필요시 `DISTINCT`.

## 소스

- [[2026-04-18-db-w02-관계형-모델-관계대수]]
- [[2026-04-18-db-w07-sql-기초]]
