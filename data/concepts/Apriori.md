---
title: Apriori
type: concept
area: [book, school]
tags: [data-mining, association-rules, algorithm]
created: 2026-04-18
updated: 2026-04-18
source_count: 1
aliases: [Apriori 알고리즘, AprioriTid]
parent: 연관규칙마이닝
prerequisites:
  - 빈발 항목집합
---

# Apriori

[[연관규칙마이닝|연관규칙]] 마이닝의 기본 알고리즘. **Apriori 원리**(anti-monotone)를 이용해 후보 공간을 가지치기.

## Apriori 원리

> 어떤 항목집합이 빈발하면, 그 모든 부분집합도 빈발하다.
>
> 역: 부분집합이 빈발하지 않으면 상위집합도 빈발할 수 없음.

이는 지지도가 **anti-monotone** 성질을 갖기 때문 — 항목집합이 커질수록 지지도가 줄거나 같음.

## 알고리즘

```
L₁ = {빈발 1-항목집합}
for k = 1, L_k != ∅, k++:
    C_{k+1} = Lₖ × Lₖ (Join + Prune)
    각 트랜잭션 t에 대해 t에 포함된 C_{k+1} 후보 카운트
    L_{k+1} = C_{k+1} 중 minsup 만족
return ⋃ Lₖ
```

- **Join**: Lk 자기-조인 (앞 k-1개 동일, 마지막 두 개를 결합).
- **Prune**: Ck+1의 모든 k-부분집합이 Lk에 존재해야.

## 효율 개선

| 기법 | 요약 |
|---|---|
| Hash-based counting | 해시 버킷 카운트 < minsup인 k-항목집합 제거 |
| Transaction reduction | 빈발 k-항목집합 미포함 트랜잭션 제거 |
| Partition | DB 분할 후 국소 빈발 항목집합 → 전역 후보 |
| Sampling | 부분 DB에서 먼저 후보 탐색 |
| AprioriTid | Ck' (<TID, {Xk}>)로 원본 DB 대체 |

## 단점

- 너무 많은 후보 (10⁴ 빈발 1-항목 → 10⁷ 후보 2-항목).
- 반복 DB 스캔 (길이 n 패턴에 n+1회).

→ 이를 해결하기 위해 [[FP-Growth]] 제안됨.

## 참고 소스

- [[2026-04-18-dm-l04-연관규칙마이닝]]
