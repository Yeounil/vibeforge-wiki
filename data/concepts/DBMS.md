---
title: DBMS
type: concept
area: [book, school, research]
tags: [database, dbms, db-강의]
created: 2026-04-18
updated: 2026-04-18
source_count: 1
aliases: [Database Management System, 데이터베이스 관리 시스템]
---

# DBMS (Database Management System)

[[데이터베이스]]와 응용 프로그램 사이의 **중계자** 역할을 하는 범용 소프트웨어 시스템. 여러 사용자·응용이 DB를 공유할 수 있도록 생성·관리·접근을 지원.

## 3대 기능

| 기능 | 언어 | 명령어 |
|---|---|---|
| 데이터 **정의** | DDL | `CREATE`, `ALTER`, `DROP` |
| 데이터 **조작** | DML | `INSERT`, `DELETE`, `UPDATE`, `SELECT` |
| 데이터 **제어** | DCL | `GRANT`, `REVOKE`, `COMMIT`, `ROLLBACK` |

제어 기능에는 **일관성(Consistency), 무결성(Integrity), 보안(Security), 병행 제어, 백업/회복(Recovery), 인증(Authorization)** 포함.

## 궁극 목적

**[[데이터 독립성]]** — 데이터의 논리적·물리적 구조가 변경되어도 응용 프로그램이 영향받지 않도록 하는 것.

## 세대 구분

- **1세대** — 네트워크 모델 ([[Charles Bachman]]) / 계층 모델 (IBM IMS)
- **2세대** — 관계형 DBMS ([[E.F. Codd]] 1970, System R 1974, [[Oracle]] 1978~)
- **3세대** — 객체 관계형 DBMS (ORDBMS) — 이미지·비디오·시공간 데이터 지원

## 상용 예시

- **대형 상용**: Oracle, IBM DB2, Ingres, Sybase, Informix
- **PC 기반**: MS-Access, dBase, FoxPro
- **오픈소스**: PostgreSQL, MySQL, MariaDB

## 관련

- [[데이터베이스]]
- [[데이터 독립성]]
- [[3단계 스키마]]
- [[관계형 데이터 모델]]

## 소스

- [[2026-04-18-db-w01-데이터베이스-개념]]
