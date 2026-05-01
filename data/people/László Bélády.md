---
title: László Bélády
type: person
area: [research, school]
tags: [person, computer-scientist, os, virtual-memory, page-replacement, ibm]
created: 2026-04-18
updated: 2026-04-18
aliases: [Belady, 벨라디, László A. Bélády, 라즐로 벨라디]
source_count: 1
---

# László Bélády

헝가리 출신 컴퓨터 과학자. IBM 연구원. OS 가상 메모리 분야의 선구자로, **MIN algorithm(OPT)** 및 **Belady's anomaly**로 유명.

## 주요 공헌

### MIN algorithm (OPT, 1966)
- Fixed allocation에서 **page fault frequency를 최소화하는 optimal page replacement algorithm**.
- "앞으로 가장 오랫동안 참조되지 않을 page를 교체".
- Page reference string 사전 지식 필요 → **unrealizable** (실현 불가).
- 현재까지도 다른 교체 알고리즘의 **성능 평가 기준선(baseline)**으로 사용.

### Belady's anomaly (FIFO anomaly)
- **FIFO 교체 기법에서 할당 page frame 수를 늘렸는데도 page fault 수가 증가하는 반직관 현상**.
- FIFO가 locality를 고려하지 않음을 보여주는 대표 사례.
- 예) ω=1 2 3 4 1 2 5 1 2 3 4 5: 3-frame → 9 PF, 4-frame → **10 PF**.

## 등장 소스

- [[2026-04-18-os-lec10-가상-메모리-관리]] — Lec10에서 MIN algorithm과 FIFO anomaly로 2회 등장.
