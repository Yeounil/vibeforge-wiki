---
title: OLAP
type: concept
area: [book, school, research]
tags: [data-mining, olap, data-cube, multidimensional]
created: 2026-04-18
updated: 2026-04-18
source_count: 1
aliases: [Online Analytical Processing, 온라인 분석 처리]
---

# OLAP

온라인 분석 처리 (Online Analytical Processing). 관계형 DB를 제안한 [[E.F. Codd]]이 제안. 데이터를 **다차원 배열**로 표현하여 빠른 탐색·집계를 지원.

## [[관계형 데이터 모델]]과의 비교

| | 관계형 DB | OLAP |
|---|---|---|
| 표현 | 테이블 | 다차원 배열 |
| 주 용도 | 트랜잭션 처리 (OLTP) | 분석·집계 |

## 구성

- **타겟 속성** (target): 셀 값 (판매액·수량 등).
- **축 속성** (dimension): 인덱스 (시간·지역·상품 등).
- **차원 수** = 축 속성의 수.

## 주요 연산

| 연산 | 의미 |
|---|---|
| **데이터 큐브** (data cube) | 부분집합에 대한 집계 (sum·avg 등) |
| **슬라이싱** (slicing) | 하나 이상의 축을 중심으로 셀 선택 |
| **다이싱** (dicing) | 셀의 사각 집합 선택 |
| **롤-업** (roll-up) | 작은 단위 → 큰 단위 집계 (day → month → year) |
| **드릴-다운** (drill-down) | 큰 단위 → 작은 단위 분해 |

## 계층 구조

- 속성은 일반적으로 계층을 가짐 (day → month → year, 도시 → 국가).
- 롤업·드릴다운은 이 계층 위에서 작동.

## 참고 소스

- [[2026-04-18-dm-l03-데이터-탐색]]
