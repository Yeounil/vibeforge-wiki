---
title: CAP 정리
type: concept
area: [school, research]
tags: [distributed-systems, consistency, availability, partition-tolerance]
created: 2026-05-03
updated: 2026-05-03
aliases: [CAP Theorem, CAP theorem]
source_count: 1
---

# CAP 정리

분산 시스템은 **일관성(Consistency)·가용성(Availability)·파티션 허용성(Partition Tolerance)** 세 속성을 동시에 모두 만족할 수 없으며, 네트워크 파티션 발생 시 C와 A 중 하나를 선택해야 한다는 정리.

## 핵심 주장

- **P(파티션 허용성)는 필수**: 현대 분산 시스템에서 네트워크 단절은 '어쩌다 일어나는 불운'이 아닌 '반드시 일어나는 상수'. 따라서 P는 항상 보장해야 하며, **C vs A 선택**이 실질적 트레이드오프.
- **네트워크 파티션**: 노드는 정상이지만 노드 간 통신이 단절되는 현상 (스플릿 브레인, Split-brain).

## CP vs AP

| | CP 시스템 | AP 시스템 |
|--|-----------|-----------|
| 파티션 발생 시 | 에러 응답·응답 거부 | 구버전 데이터라도 응답 |
| 우선순위 | 데이터 정확성 | 서비스 연속성 |
| 예시 | 은행 계좌 잔고 | SNS 피드, 쇼핑몰 추천 |

## 관련 개념

- [[일관성]] — CAP의 C
- [[가용성]] — CAP의 A
- [[2026-05-03-sa-ch02-분산-시스템-핵심-속성]]
