import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useActiveHeading } from "./useActiveHeading";

type Cb = (entries: IntersectionObserverEntry[]) => void;

class MockIO {
  static last: MockIO | null = null;
  cb: Cb;
  observed: Element[] = [];
  constructor(cb: Cb) {
    this.cb = cb;
    MockIO.last = this;
  }
  observe(el: Element) { this.observed.push(el); }
  unobserve() {}
  disconnect() {}
  trigger(visibleIds: string[]) {
    const entries = this.observed.map((el) => ({
      target: el,
      isIntersecting: visibleIds.includes((el as HTMLElement).id),
    })) as unknown as IntersectionObserverEntry[];
    this.cb(entries);
  }
}

describe("useActiveHeading", () => {
  beforeEach(() => {
    (globalThis as unknown as { IntersectionObserver: typeof IntersectionObserver })
      .IntersectionObserver = MockIO as unknown as typeof IntersectionObserver;
  });
  afterEach(() => {
    MockIO.last = null;
  });

  it("returns null when container has no headings", () => {
    const container = document.createElement("div");
    const { result } = renderHook(() =>
      useActiveHeading({ current: container })
    );
    expect(result.current).toBeNull();
  });

  it("returns first heading id on initial mount when intersecting", () => {
    const container = document.createElement("div");
    container.innerHTML = `
      <h2 id="intro">Intro</h2>
      <h2 id="middle">Middle</h2>
      <h2 id="end">End</h2>
    `;
    const { result } = renderHook(() => useActiveHeading({ current: container }));
    act(() => MockIO.last!.trigger(["intro"]));
    expect(result.current).toBe("intro");
  });

  it("updates active heading when intersection changes", () => {
    const container = document.createElement("div");
    container.innerHTML = `
      <h2 id="a">A</h2>
      <h3 id="b">B</h3>
      <h2 id="c">C</h2>
    `;
    const { result } = renderHook(() => useActiveHeading({ current: container }));
    act(() => MockIO.last!.trigger(["a"]));
    expect(result.current).toBe("a");
    act(() => MockIO.last!.trigger(["c"]));
    expect(result.current).toBe("c");
  });

  it("falls back to last-seen heading when nothing intersects", () => {
    const container = document.createElement("div");
    container.innerHTML = `<h2 id="a">A</h2><h2 id="b">B</h2>`;
    const { result } = renderHook(() => useActiveHeading({ current: container }));
    act(() => MockIO.last!.trigger(["a"]));
    expect(result.current).toBe("a");
    act(() => MockIO.last!.trigger([]));
    expect(result.current).toBe("a");
  });
});
