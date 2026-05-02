# Graph View — Obsidian-style Visual & Interaction Upgrade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate `/wiki/graph` from `react-force-graph-2d` to `sigma.js` with degree-based node sizing, category colors, zoom-aware labels, and 1-hop hover highlighting — preserving the existing layout fix, click-to-navigate behavior, and `data-testid="graph-canvas"` test contract.

**Architecture:** Single client component `components/wiki/GraphView.tsx` houses a `<SigmaContainer>` whose children compose the four concerns (graph load, layout worker, camera fit, hover/click). Pure helpers (`computeDegrees`, `clampNodeSize`) live in `lib/wiki/graph-render.ts` for unit testing. Page route (`app/wiki/graph/page.tsx`) and source data (`lib/wiki/graph.ts`) are unchanged — `GraphView`'s `Props { data: GraphData }` interface is preserved.

**Tech Stack:** Next.js 15 / React 19 / TS strict + `sigma` (WebGL renderer) + `graphology` (graph data model) + `graphology-layout-forceatlas2` (force layout) + `@react-sigma/core` (React bindings) + `@react-sigma/layout-forceatlas2` (worker hook) + `vitest` (unit tests) + `playwright` (e2e).

**Spec:** `docs/superpowers/specs/2026-05-03-graph-view-obsidian-style-design.md`

---

## File map

| File | Change |
|---|---|
| `package.json` + lockfile | Add: `sigma`, `graphology`, `graphology-layout-forceatlas2`, `@react-sigma/core`, `@react-sigma/layout-forceatlas2`. Remove: `react-force-graph-2d`. |
| `lib/wiki/graph-render.ts` | **Create** — pure helpers `computeDegrees`, `clampNodeSize`. |
| `lib/wiki/graph-render.test.ts` | **Create** — vitest unit tests for helpers. |
| `components/wiki/GraphView.tsx` | **Full rewrite** — sigma-based, internal subcomponents (`GraphLoader`, `LayoutDriver`, `InteractionLayer`). Preserves empty-state card and `data-testid`. |
| `app/wiki/graph/page.tsx` | **No change** — `<GraphView data={data} />` interface unchanged. |
| `lib/wiki/graph.ts` | **No change** — `GraphData` type and `buildGraphData` reused. |
| `lib/design/categories.ts` | **No change** — `getCategoryMeta` reused. |
| `tests/e2e/plan5-surfaces.spec.ts` | **No change** — `getByTestId("graph-canvas")` selector preserved. |

---

## Task 1: Swap dependencies

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1.1: Verify the target packages exist on the registry**

Run: `npm view sigma version && npm view graphology version && npm view @react-sigma/core version && npm view @react-sigma/layout-forceatlas2 version && npm view graphology-layout-forceatlas2 version`

Expected: each command prints a version string. If any 404s, stop and re-check the package name (sigma v3 / @react-sigma v5 are the current major lines as of 2026-05).

- [ ] **Step 1.2: Install the new packages**

Run:
```bash
npm install sigma graphology graphology-layout-forceatlas2 @react-sigma/core @react-sigma/layout-forceatlas2
```

Expected: install completes with no peer-dependency errors. If `@react-sigma/core` warns about React peer mismatch (it lists React 18 in its peerDeps but works with 19), proceed — note in commit message.

- [ ] **Step 1.3: Remove the old package**

Run:
```bash
npm uninstall react-force-graph-2d
```

Expected: `package.json`'s `dependencies` no longer contains `react-force-graph-2d`. Lockfile updated.

- [ ] **Step 1.4: Confirm typecheck breaks where expected**

Run: `npx tsc --noEmit > /tmp/tsc.log 2>&1; echo "exit=$?"`

Expected: exit ≠ 0. The error must reference `components/wiki/GraphView.tsx` (the now-unresolvable `react-force-graph-2d` import). This confirms removal worked and tells us the next task must rewrite that file.

- [ ] **Step 1.5: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): swap react-force-graph-2d for sigma + graphology"
```

---

## Task 2: Pure helpers with unit tests (TDD)

**Files:**
- Create: `lib/wiki/graph-render.ts`
- Create: `lib/wiki/graph-render.test.ts`

- [ ] **Step 2.1: Write the failing tests first**

Create `lib/wiki/graph-render.test.ts` with this exact content:

```ts
import { describe, it, expect } from "vitest";
import { clampNodeSize, computeDegrees } from "./graph-render";
import type { GraphData } from "./graph";

describe("clampNodeSize", () => {
  it("returns the minimum (4) for an isolated node (degree 0)", () => {
    expect(clampNodeSize(0)).toBe(4);
  });

  it("scales sub-linearly with degree", () => {
    expect(clampNodeSize(1)).toBeCloseTo(6, 5);
    expect(clampNodeSize(4)).toBeCloseTo(8, 5);
    expect(clampNodeSize(9)).toBeCloseTo(10, 5);
  });

  it("clamps at the maximum (16) for very high degree", () => {
    expect(clampNodeSize(100)).toBe(16);
    expect(clampNodeSize(10_000)).toBe(16);
  });
});

describe("computeDegrees", () => {
  it("returns 0 for every node when there are no edges", () => {
    const data: GraphData = {
      nodes: [
        { id: "a", label: "A", group: "concepts" },
        { id: "b", label: "B", group: "concepts" },
      ],
      edges: [],
    };
    const d = computeDegrees(data);
    expect(d.get("a")).toBe(0);
    expect(d.get("b")).toBe(0);
  });

  it("counts both endpoints of every edge", () => {
    const data: GraphData = {
      nodes: [
        { id: "a", label: "A", group: "concepts" },
        { id: "b", label: "B", group: "concepts" },
        { id: "c", label: "C", group: "concepts" },
      ],
      edges: [
        { source: "a", target: "b" },
        { source: "b", target: "c" },
      ],
    };
    const d = computeDegrees(data);
    expect(d.get("a")).toBe(1);
    expect(d.get("b")).toBe(2);
    expect(d.get("c")).toBe(1);
  });

  it("ignores edges referencing unknown node ids (defensive — shouldn't happen in real data)", () => {
    const data: GraphData = {
      nodes: [{ id: "a", label: "A", group: "concepts" }],
      edges: [{ source: "a", target: "ghost" }],
    };
    const d = computeDegrees(data);
    expect(d.get("a")).toBe(1);
    expect(d.has("ghost")).toBe(false);
  });
});
```

- [ ] **Step 2.2: Run tests to verify they fail**

Run: `npx vitest run lib/wiki/graph-render.test.ts`

Expected: FAIL with module-not-found for `./graph-render`.

- [ ] **Step 2.3: Implement the helpers**

Create `lib/wiki/graph-render.ts` with this exact content:

```ts
import type { GraphData } from "./graph";

const MIN_SIZE = 4;
const MAX_SIZE = 16;

/** Map degree → node radius in pixels. Sub-linear (sqrt) growth, clamped to [4, 16]. */
export function clampNodeSize(degree: number): number {
  const raw = MIN_SIZE + Math.sqrt(Math.max(0, degree)) * 2;
  return Math.min(MAX_SIZE, Math.max(MIN_SIZE, raw));
}

/** Count undirected degree per node id. Edges referencing unknown ids are silently dropped. */
export function computeDegrees(data: GraphData): Map<string, number> {
  const degrees = new Map<string, number>();
  for (const n of data.nodes) degrees.set(n.id, 0);
  for (const e of data.edges) {
    if (degrees.has(e.source)) degrees.set(e.source, (degrees.get(e.source) ?? 0) + 1);
    if (degrees.has(e.target)) degrees.set(e.target, (degrees.get(e.target) ?? 0) + 1);
  }
  return degrees;
}
```

- [ ] **Step 2.4: Run tests to verify they pass**

Run: `npx vitest run lib/wiki/graph-render.test.ts`

Expected: 7 passing tests, 0 failures.

- [ ] **Step 2.5: Commit**

```bash
git add lib/wiki/graph-render.ts lib/wiki/graph-render.test.ts
git commit -m "feat(wiki): add pure helpers for sigma node sizing/degree"
```

---

## Task 3: Rewrite GraphView with the sigma shell

**Files:**
- Modify: `components/wiki/GraphView.tsx` (full rewrite)

This task delivers a sigma-rendered graph that loads the data, applies degree-based size + category color, but does not yet run a force layout — nodes will appear at random positions. Layout comes in Task 4. We split the work this way so each commit is independently buildable and visually inspectable.

- [ ] **Step 3.1: Rewrite `components/wiki/GraphView.tsx`**

Replace the entire file contents with this **exact** code (imports limited to what Task 3 actually uses; Tasks 4 and 5 add the rest):

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  SigmaContainer,
  useLoadGraph,
  useRegisterEvents,
} from "@react-sigma/core";
import "@react-sigma/core/lib/style.css";
import Graph from "graphology";
import { getCategoryMeta } from "@/lib/design/categories";
import type { GraphData } from "@/lib/wiki/graph";
import { clampNodeSize, computeDegrees } from "@/lib/wiki/graph-render";

interface Props {
  data: GraphData;
}

const SIGMA_SETTINGS = {
  labelFont: "Pretendard, system-ui, sans-serif",
  labelColor: { color: "#6b7280" },
  labelSize: 12,
  labelWeight: "500",
  labelRenderedSizeThreshold: 8,
  labelDensity: 0.07,
  labelGridCellSize: 60,
  defaultNodeColor: "#9ca3af",
  defaultEdgeColor: "rgba(0,0,0,0.08)",
  renderEdgeLabels: false,
  zIndex: true,
};

function resolveColor(group: string): string {
  if (typeof window === "undefined") return "#9ca3af";
  const meta = getCategoryMeta(group);
  const computed = getComputedStyle(document.documentElement)
    .getPropertyValue(meta.colorVar)
    .trim();
  return computed || "#9ca3af";
}

function GraphLoader({ data }: { data: GraphData }) {
  const loadGraph = useLoadGraph();
  useEffect(() => {
    const graph = new Graph();
    const degrees = computeDegrees(data);
    for (const n of data.nodes) {
      graph.addNode(n.id, {
        x: Math.random(),
        y: Math.random(),
        size: clampNodeSize(degrees.get(n.id) ?? 0),
        color: resolveColor(n.group),
        label: n.label,
      });
    }
    for (const e of data.edges) {
      if (
        graph.hasNode(e.source) &&
        graph.hasNode(e.target) &&
        !graph.hasEdge(e.source, e.target)
      ) {
        graph.addEdge(e.source, e.target, { size: 0.6, color: "rgba(0,0,0,0.08)" });
      }
    }
    loadGraph(graph);
  }, [data, loadGraph]);
  return null;
}

function ClickHandler() {
  const router = useRouter();
  useRegisterEvents({
    clickNode: (e) => router.push(`/wiki/${e.node}` as never),
  });
  return null;
}

export function GraphView({ data }: Props) {
  if (data.nodes.length < 2) {
    return (
      <div className="vf-card p-8 text-center">
        <p className="text-[var(--text-secondary)]">
          페이지가 더 쌓이면 그래프가 풍성해져요.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full flex-1 min-h-0" data-testid="graph-canvas">
      <SigmaContainer
        style={{ width: "100%", height: "100%" }}
        settings={SIGMA_SETTINGS}
      >
        <GraphLoader data={data} />
        <ClickHandler />
      </SigmaContainer>
    </div>
  );
}
```

- [ ] **Step 3.2: Typecheck**

Run: `npx tsc --noEmit > /tmp/tsc.log 2>&1; echo "exit=$?"; cat /tmp/tsc.log | head -30`

Expected: `exit=0`. If sigma's types complain about `useRegisterEvents` payload shape, the fix is `clickNode: (e: { node: string }) => router.push(...)`.

- [ ] **Step 3.3: Lint**

Run: `npm run lint`

Expected: no errors. Warnings about exhaustive-deps on `useEffect([data, loadGraph])` are acceptable.

- [ ] **Step 3.4: Manual smoke test**

Run: `npm run dev` (will use port 3000 or 3001). Open `http://localhost:<port>/wiki/graph`.

Expected:
- The page header, "Wiki로 돌아가기" link, "104 pages · 440 links", and category legend all render as before.
- The white card area is filled. Nodes appear inside the canvas — they may be randomly scattered (no layout yet). Sizes vary visibly. Colors match the category legend (purple for `data-handling`, teal for `how-computers-work`, green for `code-flow`, orange default).
- Clicking any node navigates to `/wiki/<id>`.
- Refresh the page — re-renders cleanly, no console errors.

If any console errors mention `process is not defined` or SSR-related issues, wrap `SigmaContainer` in `next/dynamic({ ssr: false })`. (Most likely not needed since this whole file is `"use client"`.)

- [ ] **Step 3.5: E2E sanity**

Run: `npx playwright test tests/e2e/plan5-surfaces.spec.ts --reporter=line`

Expected: all 4 tests pass (1 skipped if giscus env unset). The "graph canvas mount" test in particular must pass — it asserts `getByTestId("graph-canvas")` is visible.

- [ ] **Step 3.6: Commit**

```bash
git add components/wiki/GraphView.tsx
git commit -m "feat(wiki/graph): rewrite GraphView on sigma + graphology

Initial scaffold: nodes load with degree-based size + category color.
Layout, camera fit, and hover highlighting follow in subsequent commits.
Click-to-navigate preserved. data-testid='graph-canvas' preserved."
```

---

## Task 4: Add layout worker + camera fit

**Files:**
- Modify: `components/wiki/GraphView.tsx`

- [ ] **Step 4.1: Add LayoutDriver and CameraFitter components**

Open `components/wiki/GraphView.tsx`. Update the imports:

1. Add `useCamera` to the existing `@react-sigma/core` import block. After this edit it should read:

```tsx
import {
  SigmaContainer,
  useLoadGraph,
  useRegisterEvents,
  useCamera,
} from "@react-sigma/core";
```

2. Add a new import line below it:

```tsx
import { useWorkerLayoutForceAtlas2 } from "@react-sigma/layout-forceatlas2";
```

Add these two components below `GraphLoader`:

```tsx
function LayoutDriver({ nodeCount }: { nodeCount: number }) {
  const { start, stop } = useWorkerLayoutForceAtlas2({
    settings: {
      gravity: 1,
      scalingRatio: 8,
      slowDown: 1.5,
      barnesHutOptimize: nodeCount > 50,
    },
  });
  useEffect(() => {
    start();
    const cooldown = Math.min(2500 + nodeCount * 5, 6000);
    const t = setTimeout(() => stop(), cooldown);
    return () => {
      clearTimeout(t);
      stop();
    };
  }, [start, stop, nodeCount]);
  return null;
}

function CameraFitter({ nodeCount }: { nodeCount: number }) {
  const { reset } = useCamera({ duration: 600, factor: 1.5 });
  useEffect(() => {
    const cooldown = Math.min(2500 + nodeCount * 5, 6000);
    const t = setTimeout(() => reset(), cooldown + 200);
    return () => clearTimeout(t);
  }, [reset, nodeCount]);
  return null;
}
```

Update the `GraphView` JSX to include them as children of `SigmaContainer`:

```tsx
<SigmaContainer style={{ width: "100%", height: "100%" }} settings={SIGMA_SETTINGS}>
  <GraphLoader data={data} />
  <LayoutDriver nodeCount={data.nodes.length} />
  <CameraFitter nodeCount={data.nodes.length} />
  <ClickHandler />
</SigmaContainer>
```

- [ ] **Step 4.2: Typecheck**

Run: `npx tsc --noEmit > /tmp/tsc.log 2>&1; echo "exit=$?"`

Expected: `exit=0`. If `useCamera` complains about its options shape, drop the options arg and call `reset()` with no args (sigma will use its defaults).

- [ ] **Step 4.3: Manual verification**

Refresh `http://localhost:<port>/wiki/graph`.

Expected:
- Nodes start scattered, then move into a force-directed layout over ~2.5s. Highly-linked nodes congregate; isolated nodes drift to the periphery.
- After ~2.7s the camera animates to fit the whole layout in view (similar to the previous `zoomToFit` behavior).
- Pinch / scroll-zoom and pan still work.
- Resize the window — the canvas resizes smoothly without redoing the layout.

- [ ] **Step 4.4: Commit**

```bash
git add components/wiki/GraphView.tsx
git commit -m "feat(wiki/graph): force-atlas2 worker layout + auto camera fit"
```

---

## Task 5: Hover state + 1-hop reducers

**Files:**
- Modify: `components/wiki/GraphView.tsx`

- [ ] **Step 5.1: Replace the `ClickHandler` component with a unified `InteractionLayer`**

In `components/wiki/GraphView.tsx`, update the imports:

1. Add `useState` to the existing `react` import. After this edit it should read:

```tsx
import { useEffect, useState } from "react";
```

2. Add `useSigma` to the existing `@react-sigma/core` import block. After this edit it should read:

```tsx
import {
  SigmaContainer,
  useLoadGraph,
  useRegisterEvents,
  useCamera,
  useSigma,
} from "@react-sigma/core";
```

Then delete the `ClickHandler` function. Add this in its place:

```tsx
function InteractionLayer() {
  const router = useRouter();
  const sigma = useSigma();
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  useRegisterEvents({
    enterNode: (e) => setHoveredNode(e.node),
    leaveNode: () => setHoveredNode(null),
    clickNode: (e) => router.push(`/wiki/${e.node}` as never),
  });

  useEffect(() => {
    const graph = sigma.getGraph();
    sigma.setSetting("nodeReducer", (node, attrs) => {
      if (!hoveredNode) return attrs;
      if (node === hoveredNode || graph.areNeighbors(hoveredNode, node)) {
        return { ...attrs, zIndex: 1, forceLabel: true };
      }
      return { ...attrs, color: "rgba(150,150,150,0.25)", label: "", zIndex: 0 };
    });
    sigma.setSetting("edgeReducer", (edge, attrs) => {
      if (!hoveredNode) return attrs;
      const ext = graph.extremities(edge);
      if (ext.includes(hoveredNode)) {
        return { ...attrs, color: "#7c3aed", size: 1.2 };
      }
      return { ...attrs, hidden: true };
    });
    sigma.refresh();
  }, [hoveredNode, sigma]);

  return null;
}
```

Update the JSX in `GraphView` — replace `<ClickHandler />` with `<InteractionLayer />`:

```tsx
<SigmaContainer style={{ width: "100%", height: "100%" }} settings={SIGMA_SETTINGS}>
  <GraphLoader data={data} />
  <LayoutDriver nodeCount={data.nodes.length} />
  <CameraFitter nodeCount={data.nodes.length} />
  <InteractionLayer />
</SigmaContainer>
```

- [ ] **Step 5.2: Typecheck and lint**

Run: `npx tsc --noEmit > /tmp/tsc.log 2>&1; echo "tsc=$?"; npm run lint`

Expected: `tsc=0`, lint clean.

- [ ] **Step 5.3: Manual verification — hover behavior**

Refresh `/wiki/graph`. Wait for layout to settle.

Expected:
- Hover over a high-degree node (the big purple one labeled `index` or `log` from the prior screenshots): that node and its directly connected neighbors stay full-color, edges between them turn purple (`#7c3aed`) and slightly thicker, every other node fades to grey, every other edge disappears, and labels for the hovered + neighbor nodes appear regardless of zoom level.
- Move the cursor off — all nodes/edges return to normal in one frame.
- Hover over an isolated node (degree 0): only that node stays colored, no edges visible (since there are none).
- Zoom in deeply, then hover — same behavior, labels still surface.

- [ ] **Step 5.4: Commit**

```bash
git add components/wiki/GraphView.tsx
git commit -m "feat(wiki/graph): 1-hop hover highlight via sigma reducers"
```

---

## Task 6: Final verification & cleanup

**Files:**
- (Verification only — modifications only if a check fails)

- [ ] **Step 6.1: Full typecheck**

Run: `npx tsc --noEmit > /tmp/tsc.log 2>&1; echo "exit=$?"; head -40 /tmp/tsc.log`

Expected: `exit=0`, no output.

- [ ] **Step 6.2: Full lint**

Run: `npm run lint`

Expected: no errors. Resolve any new warnings introduced by this work.

- [ ] **Step 6.3: Full unit test suite**

Run: `npm test`

Expected: all vitest suites green, including the new `graph-render` tests.

- [ ] **Step 6.4: E2E suite (graph + adjacent)**

Run: `npx playwright test tests/e2e/plan5-surfaces.spec.ts tests/e2e/wiki-render.spec.ts --reporter=line`

Expected: all non-skipped tests pass.

- [ ] **Step 6.5: Production build smoke**

Run: `npm run build > /tmp/build.log 2>&1; echo "exit=$?"; tail -30 /tmp/build.log`

Expected: `exit=0`, route `/wiki/graph` shown in the build summary, no SSR-related errors mentioning sigma or WebGL. If a `window is not defined`-style error appears, the fix is to wrap `SigmaContainer` in a `next/dynamic({ ssr: false })` import inside `GraphView.tsx`.

- [ ] **Step 6.6: Manual checklist run-through**

With `npm run dev` running, walk the spec's verification checklist on `/wiki/graph`:

- [ ] 노드 크기·색상 차이가 한눈에 보임
- [ ] 줌 아웃 상태에서 라벨이 거의 없음
- [ ] 줌 인하면 라벨이 충돌 없이 등장 (LabelGrid 동작 확인)
- [ ] 노드 hover → 1-hop 이웃·엣지만 강조, 나머지는 회색 디밍
- [ ] 강조된 노드의 라벨은 임계값과 무관하게 항상 표시 (forceLabel)
- [ ] 노드 클릭 시 해당 wiki 페이지로 이동
- [ ] 빈 상태 카드 (노드 < 2개일 때) 정상 노출 — 임시로 `data.nodes = data.nodes.slice(0, 1)`로 page에서 mock해 확인 후 되돌리기. (선택)
- [ ] 윈도우 리사이즈 시 캔버스가 부드럽게 fit
- [ ] 콘솔에 sigma/WebGL 관련 에러 없음

- [ ] **Step 6.7: Diff sanity check**

Run: `git diff --stat origin/$(git rev-parse --abbrev-ref HEAD | sed 's|.*/||')..HEAD -- 'app/**' 'components/**' 'lib/**' 'tests/**' 'package*.json'`

(Or simpler: `git log --oneline origin/main..HEAD` to list this plan's commits.)

Expected: only the files listed in this plan's File map are changed.

- [ ] **Step 6.8: If everything green — final commit if any leftover tweaks, otherwise stop here**

If the manual checklist surfaced minor tweaks (cooldown timing, dim opacity, label threshold), make them as a single follow-up commit:

```bash
git add components/wiki/GraphView.tsx
git commit -m "polish(wiki/graph): tune <whatever was adjusted>"
```

If nothing needed adjustment, this task closes without a new commit.

---

## Risks & gotchas (from the spec)

- **CSS-var → hex**: only `getCategoryMeta(group).colorVar` is resolved at runtime via `getComputedStyle`. Two static values (`#6b7280` for label color, `#7c3aed` for hover edge) are inlined — if the design tokens change, update them in `SIGMA_SETTINGS` and `InteractionLayer`'s edge reducer.
- **Dim opacity (`rgba(150,150,150,0.25)`)** is a guess. If it visually disappears against the white card, bump to `0.4`. If it competes with neighbors, lower to `0.15`. Tune in Step 6.6 if needed.
- **forceatlas2 cooldown** (`Math.min(2500 + nodeCount * 5, 6000)`) is sized for ≤ 700 nodes. Beyond that, raise the cap.
- **React 19 peer warning** on `@react-sigma/core` is benign as of writing. If sigma calls a removed React 18 API at runtime (e.g., `findDOMNode`), pin a known-compatible version.
- **SSR**: `"use client"` should be sufficient. If `npm run build` fails with `window is not defined`, switch the `SigmaContainer` import to `next/dynamic({ ssr: false })`.

## Deferred / out-of-scope

- Click-to-pin / double-click navigate
- Dark mode toggle
- Keyboard navigation
- Search-driven highlight
- Mobile long-press hover
- Wiki page → graph mini-map integration
