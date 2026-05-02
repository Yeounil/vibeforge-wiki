# Graph View — Obsidian-style Visual & Interaction Upgrade — Design

**Date:** 2026-05-03
**Branch:** plan3/supabase-forum
**Status:** Draft → review

## Problem

`/wiki/graph` 현재 상태(직전 레이아웃 fix 이후):

- 노드가 모두 동일 크기 단색 회색 점이라 **카테고리·중요도 식별이 사실상 불가능**.
- 라벨은 `react-force-graph-2d`의 브라우저 tooltip 기반 — **노드 위에 커서를 올려야만** 페이지 제목이 보이고, 한 번에 한 개만.
- 호버해도 **연결 관계 강조가 없음** — 어떤 노드가 어디로 연결되어 있는지 시각적 단서 부재.
- 위키가 **6개월 내 200~300 페이지**로 자랄 예정이라, 라벨 충돌 회피·레이아웃 쓰레드 분리 등의 빌트인 인프라가 필요해짐.

목표는 Obsidian Graph View의 인터랙션 패턴(샘플 이미지 #3~#5)을 사이트의 라이트 테마에 맞춰 이식하는 것.

## Goals

1. 노드를 **크기(degree 기반) + 색상(카테고리 토큰)** 으로 즉시 구분 가능.
2. **줌 인 시 라벨이 점진적으로 나타남** — `labelRenderedSizeThreshold` + LabelGrid로 충돌 회피.
3. **Hover → 1-hop 이웃 강조 + 비이웃 디밍** — `nodeReducer`/`edgeReducer` 패턴.
4. **클릭 → 위키 페이지로 이동** — 기존 동작 보존.
5. 200~300 노드 규모에서도 60fps — 레이아웃은 worker, 렌더는 WebGL.
6. 기존 `data-testid="graph-canvas"`, 빈 상태 카드, 헤더/legend/툴바, 직전 flex 레이아웃 fix 모두 보존.

## Non-goals (YAGNI)

- 다크 모드 토글 — 사이트 전체가 라이트.
- 카테고리 필터 / 검색 하이라이트 — 본 작업 범위 외, 별도 이터레이션.
- "현재 페이지 강조" — 위키 슬러그 페이지에서 그래프 미니맵을 사이드에 띄우는 식의 통합은 별도 스코프.
- 핀 / 더블클릭 / 키보드 네비게이션 — 기본 hover + click이면 충분.
- 모바일 long-press 커스텀 동작 — 표준 sigma touch(pinch zoom + tap)에 맡김.

## Decisions

브레인스토밍 중 사용자 선택:

| # | Decision | Choice |
|---|---|---|
| 1 | 라이브러리 | **sigma.js로 마이그레이션** (`react-force-graph-2d` 제거). LabelGrid·reducer·worker 레이아웃의 빌트인 가치가 200~300 노드 구간에서 결정적. |
| 2 | 컬러 테마 | **A. 라이트 (현재 사이트 톤 유지)** — `--bg-gradient` + vf-card 흰 배경 + 카테고리 색상. |
| 3 | Hover 강조 범위 | **A. 1-hop only** — Image #5 패턴. |
| 4 | 클릭 동작 | **A. wiki 페이지로 이동** (현재 동작 보존). |

## Architecture

### Stack

추가:
- `sigma` — WebGL 렌더러
- `graphology` — 그래프 데이터 모델
- `graphology-layout-forceatlas2` — 레이아웃 알고리즘
- `@react-sigma/core` — React 통합 (`SigmaContainer`, `useLoadGraph`, `useRegisterEvents`, `useSigma`, `useCamera`)
- `@react-sigma/layout-forceatlas2` — `useWorkerLayoutForceAtlas2` 훅 (web worker 기반)

제거:
- `react-force-graph-2d` — 사용처는 `components/wiki/GraphView.tsx`뿐. 의존성 정리.

### Data flow

서버 측은 변경 없음:

```
app/wiki/graph/page.tsx (server)
  └─ buildGraphData(pages, backlinks)  →  { nodes: GraphNode[], edges: { source, target }[] }
      └─ <GraphView data={...} />
```

클라이언트(`GraphView.tsx`) 내부:

```
GraphView (client)
  └─ <SigmaContainer settings={...}>     // ref div = data-testid="graph-canvas"
       ├─ <GraphLoader data={data} />     // useLoadGraph: GraphData → graphology Graph
       ├─ <LayoutDriver />                // useWorkerLayoutForceAtlas2 — start on mount, stop after settle
       ├─ <CameraFitter />                // useCamera — once layout settles, animate to fit
       └─ <InteractionLayer router={...} /> // useRegisterEvents + useSigma — hover state, reducers, click navigate
```

각 inner 컴포넌트는 `useSigma()` / `useRegisterEvents()` 같은 훅을 쓰기 위해 `SigmaContainer` 자식이어야 함 (context 의존).

### Node attributes (loaded via `useLoadGraph`)

```ts
graph.addNode(node.id, {
  x: Math.random(), y: Math.random(),  // forceatlas2가 위치 잡기 전 초기값
  size: clamp(4, 4 + Math.sqrt(degree) * 2, 16),
  color: resolveColor(node.group),     // getCategoryMeta(group).colorVar의 computed 값
  label: node.label,                   // 페이지 title
});
```

`resolveColor`는 기존 GraphView의 함수를 재사용 — `getComputedStyle(document.documentElement).getPropertyValue(meta.colorVar)`.

### Edges

```ts
graph.addEdge(edge.source, edge.target, {
  size: 0.6,
  color: "rgba(0,0,0,0.08)",
});
```

### Sigma settings

```ts
{
  labelFont: "Pretendard, system-ui, sans-serif",
  labelColor: { color: "#6b7280" },        // = var(--text-secondary)
  labelSize: 12,
  labelWeight: "500",
  labelRenderedSizeThreshold: 8,   // 노드 크기 8px 이상부터 라벨 노출
  labelDensity: 0.07,
  labelGridCellSize: 60,
  defaultNodeColor: "#9ca3af",
  defaultEdgeColor: "rgba(0,0,0,0.08)",
  renderEdgeLabels: false,
  zIndex: true,                    // hover 노드를 위로 끌어올리기 위함
}
```

### Hover state & reducers

```tsx
const [hoveredNode, setHoveredNode] = useState<string | null>(null);
const sigma = useSigma();
const graph = sigma.getGraph();

useRegisterEvents({
  enterNode: (e) => setHoveredNode(e.node),
  leaveNode: () => setHoveredNode(null),
  clickNode: (e) => router.push(`/wiki/${e.node}` as never),
});

useEffect(() => {
  sigma.setSetting("nodeReducer", (node, attrs) => {
    if (!hoveredNode) return attrs;
    const isHover = node === hoveredNode;
    const isNeighbor = graph.areNeighbors(hoveredNode, node);
    if (isHover || isNeighbor) {
      return { ...attrs, zIndex: 1, forceLabel: true };
    }
    return { ...attrs, color: "rgba(150,150,150,0.25)", label: "", zIndex: 0 };
  });
  sigma.setSetting("edgeReducer", (edge, attrs) => {
    if (!hoveredNode) return attrs;
    const ext = graph.extremities(edge);
    if (ext.includes(hoveredNode)) {
      return { ...attrs, color: "#7c3aed", size: 1.2 }; // = var(--accent-from)
    }
    return { ...attrs, hidden: true };
  });
  sigma.refresh();
}, [hoveredNode, sigma, graph]);
```

`forceLabel: true`는 sigma의 라벨 임계값을 우회해 hover 강조 노드만 라벨을 강제 표시함.

### Layout

```tsx
const { start, stop, isRunning } = useWorkerLayoutForceAtlas2({
  settings: { gravity: 1, scalingRatio: 8, slowDown: 1.5, barnesHutOptimize: true },
});

useEffect(() => {
  start();
  const t = setTimeout(() => stop(), 2500);
  return () => { clearTimeout(t); stop(); };
}, [start, stop]);
```

2.5초 후 simulation 중단 → 정적 레이아웃 확정 → CameraFitter가 `useCamera().reset({ duration: 600 })`로 화면에 맞춤.

### Empty state

`data.nodes.length < 2`일 때 기존과 동일한 vf-card 빈 상태 메시지 — `<SigmaContainer>` 자체를 렌더하지 않음.

### Resize 대응

`SigmaContainer`는 부모 크기에 맞춰 자동 refresh됨 (라이브러리 ResizeObserver). 직전 task의 flex 레이아웃 fix(`vf-card flex flex-col` + `flex-1 min-h-0`) 위에서 그대로 작동.

### SSR

`SigmaContainer`는 WebGL을 쓰므로 서버에서 import해도 렌더는 client-only. 컴포넌트 파일 첫 줄 `"use client"` + `next/dynamic`으로 `ssr: false` 보장.

## Files to change

| File | Change |
|---|---|
| `package.json` | + `sigma`, `graphology`, `graphology-layout-forceatlas2`, `@react-sigma/core`, `@react-sigma/layout-forceatlas2`. − `react-force-graph-2d`. |
| `components/wiki/GraphView.tsx` | 전면 리라이트 (sigma 기반). |
| `app/wiki/graph/page.tsx` | 변경 없음 — props 인터페이스 동일. |
| `lib/wiki/graph.ts` | 변경 없음 — `GraphData` 타입 그대로 사용. |
| `tests/e2e/plan5-surfaces.spec.ts` | 변경 없음 — `data-testid="graph-canvas"` 보존되므로 통과. |

## Testing

1. `npm run typecheck` 통과.
2. `npm run lint` 통과.
3. `npx playwright test tests/e2e/plan5-surfaces.spec.ts` — `/wiki/graph renders the canvas mount` 테스트가 빈 상태가 아닌 sigma 캔버스를 잡는지 확인.
4. **수동 검증**: `npm run dev` → `/wiki/graph` 접속.
   - [ ] 노드 크기·색상 차이가 한눈에 보임
   - [ ] 줌 아웃 상태에서 라벨 거의 없음, 줌 인하면 라벨 등장 (충돌 없이)
   - [ ] 노드에 hover → 1-hop 이웃·엣지만 강조, 나머지는 디밍
   - [ ] 강조된 노드 라벨은 임계값과 무관하게 표시
   - [ ] 노드 클릭 시 해당 wiki 페이지로 이동
   - [ ] 빈 상태 (현재 발생 시) 카드 메시지 정상 노출
   - [ ] 윈도우 리사이즈 시 캔버스가 부드럽게 fit

## Risks & open questions

- **그래프 색상 인접 노드 가독성**: 비이웃 디밍 색 `rgba(150,150,150,0.25)`이 라이트 배경에서 충분히 대비되는지 실측 후 조정 필요. 너무 옅으면 "사라지는" 느낌, 너무 진하면 강조가 안 살아남.
- **forceatlas2 파라미터 튜닝**: 2.5초 cooldown이 104 노드에선 충분하지만 200+에서 느려질 가능성. 노드 수 따라 동적 시간 부여 (`Math.min(2500 + nodeCount * 5, 6000)`) 가능.
- **CSS 변수 → hex 변환**: sigma는 CSS 변수를 직접 못 받음. `lib/design/tokens.css`에 정의된 값을 sigma settings에 hex로 주입 (`#6b7280` = `--text-secondary`, `#7c3aed` = `--accent-from` for hover edge). 카테고리 색상은 기존 `resolveColor()`처럼 `getComputedStyle`로 runtime 추출.
- **Bundle size**: sigma + graphology + react-sigma는 대략 ~80KB gzipped 추가, react-force-graph-2d 제거로 ~100KB 감소 → 순감소 예상.

## Verification of completion

- [ ] 위 testing checklist 전부 통과
- [ ] dev에서 hover/zoom/click 시각 검증 완료
- [ ] `git diff --stat`로 의도된 파일만 변경됐는지 확인
- [ ] memory에 plan 진행 상황 업데이트는 본 작업 종료 후
