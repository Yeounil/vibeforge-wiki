"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

/**
 * Tracks which `<h2>` or `<h3>` inside `containerRef` is currently visible at
 * the top of the viewport. Returns the id of that heading, or null if no
 * heading has been seen yet. Once a heading has been "seen" we keep returning
 * the most recent one even when the user scrolls past — small UX nicety so
 * the sticky bar doesn't flash empty between headings.
 */
export function useActiveHeading(
  containerRef: RefObject<HTMLElement | null>
): string | null {
  const [activeId, setActiveId] = useState<string | null>(null);
  const lastSeenRef = useRef<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const headings = Array.from(
      container.querySelectorAll<HTMLElement>("h2[id], h3[id]")
    );
    if (headings.length === 0) {
      setActiveId(null);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const idToIntersect = new Map<string, boolean>();
        for (const e of entries) {
          idToIntersect.set((e.target as HTMLElement).id, e.isIntersecting);
        }
        // Walk in document order so the *first* visible heading wins.
        const firstVisible = headings.find(
          (h) => idToIntersect.get(h.id) === true
        );
        if (firstVisible) {
          lastSeenRef.current = firstVisible.id;
          setActiveId(firstVisible.id);
          return;
        }
        if (lastSeenRef.current) setActiveId(lastSeenRef.current);
      },
      {
        rootMargin: "-25% 0px -70% 0px",
        threshold: 0,
      }
    );

    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [containerRef]);

  return activeId;
}
