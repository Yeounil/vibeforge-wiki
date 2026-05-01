---
title: R
type: entity
area: [book, school, research]
tags: [r, programming-language, statistics, data-analysis]
created: 2026-04-18
updated: 2026-04-18
source_count: 5
aliases: [R 언어, R Programming Language]
---

# R

통계·데이터 분석을 위한 프로그래밍 언어 및 환경. Auckland 대학의 Ross Ihaka, Robert Gentleman이 1993년 개발. S 언어의 GPL 구현. [[데이터마이닝]] 실습의 표준 도구 중 하나.

## 특징

- **함수형 언어** — 연산자도 실제로는 함수.
- **인터랙티브 모드** 중심 사용. 배치 모드도 지원.
- **벡터화 연산** — 벡터 입력에 자동으로 원소 단위 적용.
- 할당: `<-` (전통).
- 인덱스 **1부터 시작** (C/Python과 다름).

## 핵심 데이터 구조

| 구조 | 특징 |
|---|---|
| 벡터 | 핵심. 단일 타입. 스칼라도 길이 1 벡터. |
| 행렬 | 행·열 속성 가진 벡터. 2차원 배열. |
| 배열 | 고차원 (3차원+). |
| 리스트 | 혼합 타입. C 구조체·Python dict 유사. |
| [[데이터 프레임]] | 실전 데이터셋의 표준 컨테이너. |

## 언어적 특징

- NA (불확실) vs NULL (없음).
- Recycling — 짧은 쪽이 자동 재사용.
- 벡터·행렬은 **크기 불변** → 변경 = 재할당.

## 생태계

- 패키지: CRAN (Comprehensive R Archive Network).
- 예: MASS (다변량 정규 분포), dplyr, ggplot2.
- RStudio — 대표 IDE.

## 참고 소스

- [[2026-04-18-dm-p01-r-시작하기]]
- [[2026-04-18-dm-p02-벡터]]
- [[2026-04-18-dm-p03-행렬-배열]]
- [[2026-04-18-dm-p04-리스트]]
- [[2026-04-18-dm-p05-데이터프레임]]
