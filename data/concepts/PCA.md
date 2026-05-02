---
title: PCA
type: concept
area: [book, school, research]
tags: [data-mining, dimensionality-reduction, linear-algebra]
created: 2026-04-18
updated: 2026-04-18
source_count: 1
aliases: [Principal Component Analysis, 주성분 분석]
parent: 차원의 저주
---

# PCA

주성분 분석 (Principal Component Analysis). n차원 데이터를 직교하는 새로운 축들로 표현하고, 최적의 k개 축만 남겨 **차원 축소**.

## 핵심 아이디어

- n개 속성을 가진 튜플에 대해, 데이터 표현에 최적으로 사용될 수 있는 **n차원 직교벡터** 중 k개 (k ≤ n) 를 찾음.
- 분산이 큰 방향부터 선택 → 정보 손실 최소화.
- 감소된 차원 공간 생성.

## 용도

- **[[차원의 저주]]** 완화.
- 연산·메모리 절약.
- 데이터 시각화 (2-3차원으로 투영).
- 노이즈·상관없는 특징 제거.

## 관련 기법

- **SVD** (Singular Value Decomposition) — PCA의 수치적 구현 기반.

## 참고 소스

- [[2026-04-18-dm-l02-데이터-전처리-유사도]]
